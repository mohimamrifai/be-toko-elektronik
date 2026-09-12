import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { eq } from 'drizzle-orm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { users } from '../../database/schema/users.schema.js';
import type { JwtPayload, PublicUser } from './auth.types.js';

const publicUserFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    const [user] = await this.db
      .select(publicUserFields)
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
