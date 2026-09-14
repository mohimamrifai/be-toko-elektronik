import { Body, Controller, Post } from '@nestjs/common';
import type { MidtransNotificationPayload } from './midtrans.service.js';
import { PaymentService } from './payment.service.js';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('midtrans/notification')
  handleMidtransNotification(@Body() payload: MidtransNotificationPayload) {
    return this.paymentService.handleMidtransNotification(payload);
  }
}
