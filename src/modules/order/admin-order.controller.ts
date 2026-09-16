import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto.js';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrderService } from './order.service.js';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findAll(@Query() query: QueryAdminOrdersDto) {
    return this.orderService.findAllAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOneAdmin(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatusAdmin(id, updateOrderStatusDto);
  }

  @Patch(':id/shipping')
  updateShipping(
    @Param('id') id: string,
    @Body() updateOrderShippingDto: UpdateOrderShippingDto,
  ) {
    return this.orderService.updateShippingAdmin(id, updateOrderShippingDto);
  }
}
