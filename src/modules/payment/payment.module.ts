import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { MidtransService } from './midtrans.service.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';

@Module({
  imports: [MailModule],
  controllers: [PaymentController],
  providers: [PaymentService, MidtransService],
  exports: [PaymentService, MidtransService],
})
export class PaymentModule {}
