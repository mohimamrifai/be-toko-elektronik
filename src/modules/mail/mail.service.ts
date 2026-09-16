import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  private isSmtpConfigured() {
    return Boolean(
      this.configService.get<string>('SMTP_HOST') &&
        this.configService.get<string>('SMTP_USER') &&
        this.configService.get<string>('SMTP_PASS'),
    );
  }

  private getFrontendUrl() {
    return (
      this.configService.get<string>('FRONTEND_URL') ??
      this.configService.get<string>('APP_URL') ??
      'http://localhost:3000'
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Reset Password TokoElektronik';
    const text = `Anda menerima email ini karena ada permintaan reset password.\n\nBuka tautan berikut untuk mengatur ulang password Anda:\n${resetUrl}\n\nTautan berlaku 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.`;

    if (!this.isSmtpConfigured()) {
      this.logger.log(
        `Password reset token for ${email}: ${token} (reset URL: ${resetUrl})`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    await transporter.sendMail({
      from:
        this.configService.get<string>('MAIL_FROM') ??
        'noreply@tokoelektronik.com',
      to: email,
      subject,
      text,
    });
  }
}
