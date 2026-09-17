import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type {
  OrderConfirmationMailPayload,
  OrderShippedMailPayload,
  PaymentReceivedMailPayload,
} from './mail.types.js';
import {
  buildOrderConfirmationMail,
  buildOrderShippedMail,
  buildPasswordResetMail,
  buildPaymentReceivedMail,
} from './templates/transactional-mail.templates.js';

type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
  logContext: string;
};

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

  getOrderDetailUrl(orderId: string) {
    return `${this.getFrontendUrl()}/orders/${orderId}`;
  }

  private getMailFrom() {
    return (
      this.configService.get<string>('MAIL_FROM') ??
      'noreply@tokoelektronik.com'
    );
  }

  private async sendMail(options: SendMailOptions) {
    if (!this.isSmtpConfigured()) {
      this.logger.log(
        `[${options.logContext}] Email to ${options.to}\nSubject: ${options.subject}\n${options.text}`,
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
      from: this.getMailFrom(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const mail = buildPasswordResetMail(resetUrl);

    await this.sendMail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      logContext: 'password-reset',
    });
  }

  async sendOrderConfirmationEmail(payload: OrderConfirmationMailPayload) {
    const mail = buildOrderConfirmationMail(payload);

    await this.sendMail({
      to: payload.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      logContext: 'order-confirmation',
    });
  }

  async sendPaymentReceivedEmail(payload: PaymentReceivedMailPayload) {
    const mail = buildPaymentReceivedMail(payload);

    await this.sendMail({
      to: payload.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      logContext: 'payment-received',
    });
  }

  async sendOrderShippedEmail(payload: OrderShippedMailPayload) {
    const mail = buildOrderShippedMail(payload);

    await this.sendMail({
      to: payload.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      logContext: 'order-shipped',
    });
  }
}
