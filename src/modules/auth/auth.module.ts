import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          configService.get<string>('JWT_EXPIRES_IN') ?? '7d';

        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
