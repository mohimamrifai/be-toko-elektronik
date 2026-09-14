import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { PaymentService } from '../payment/payment.service.js';
import { OrderService } from './order.service.js';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('checkout')
  checkout(
    @CurrentUser() user: PublicUser,
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.orderService.checkout(user.id, checkoutDto);
  }

  @Get()
  findAll(@CurrentUser() user: PublicUser) {
    return this.orderService.findAll(user.id);
  }

  @Post(':id/pay')
  pay(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.paymentService.createSnapPayment(user, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.orderService.findOne(user.id, id);
  }
}
