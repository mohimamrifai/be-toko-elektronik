import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { PaymentModule } from '../payment/payment.module.js';
import { PromoModule } from '../promo/promo.module.js';
import { AdminOrderController } from './admin-order.controller.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';

@Module({
  imports: [AuthModule, MailModule, PaymentModule, PromoModule],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService],
})
export class OrderModule {}
