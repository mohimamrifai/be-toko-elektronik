import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { passwordResetTokens } from '../../database/schema/password-reset-tokens.schema.js';
import { users } from '../../database/schema/users.schema.js';
import { MailService } from '../mail/mail.service.js';
import type { AuthResponse, JwtPayload, PublicUser } from './auth.types.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

const publicUserFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
};

const SALT_ROUNDS = 10;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private buildAuthResponse(user: PublicUser): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user,
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const email = registerDto.email.trim().toLowerCase();

    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await hash(registerDto.password, SALT_ROUNDS);

    const [user] = await this.db
      .insert(users)
      .values({
        name: registerDto.name.trim(),
        email,
        phone: registerDto.phone?.trim() || null,
        passwordHash,
        role: 'customer',
      })
      .returning(publicUserFields);

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const email = loginDto.email.trim().toLowerCase();

    const [user] = await this.db
      .select({
        ...publicUserFields,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const { passwordHash: _, ...publicUser } = user;

    return this.buildAuthResponse(publicUser);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const [user] = await this.db
      .select(publicUserFields)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const updates: { name?: string; phone?: string | null } = {};

    if (updateProfileDto.name !== undefined) {
      updates.name = updateProfileDto.name.trim();
    }

    if (updateProfileDto.phone !== undefined) {
      updates.phone = updateProfileDto.phone.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return this.getProfile(userId);
    }

    const [user] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning(publicUserFields);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private buildPasswordResetMessage() {
    return {
      message:
        'Jika email terdaftar, instruksi reset password telah dikirim ke email Anda.',
    };
  }

  private validatePassword(password: string) {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password minimal ${MIN_PASSWORD_LENGTH} karakter`,
      );
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException('Email wajib diisi');
    }

    const [user] = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return this.buildPasswordResetMessage();
    }

    const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);

    return this.buildPasswordResetMessage();
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    this.validatePassword(resetPasswordDto.password);

    const token = resetPasswordDto.token.trim();

    if (!token) {
      throw new BadRequestException('Token reset password wajib diisi');
    }

    const [resetToken] = await this.db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!resetToken) {
      throw new BadRequestException('Token reset password tidak valid atau sudah kedaluwarsa');
    }

    const passwordHash = await hash(resetPasswordDto.password, SALT_ROUNDS);

    await this.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId));

    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    return {
      message: 'Password berhasil diubah. Silakan login dengan password baru Anda.',
    };
  }
}
