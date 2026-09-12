import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { users } from '../../database/schema/users.schema.js';
import type { AuthResponse, JwtPayload, PublicUser } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const publicUserFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
};

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtService: JwtService,
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
}
