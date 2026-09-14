import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CartService } from './cart.service.js';
import { CreateCartItemDto } from './dto/create-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: PublicUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  addItem(
    @CurrentUser() user: PublicUser,
    @Body() createCartItemDto: CreateCartItemDto,
  ) {
    return this.cartService.addItem(user.id, createCartItemDto);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, id, updateCartItemDto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.cartService.removeItem(user.id, id);
  }

  @Delete()
  clearCart(@CurrentUser() user: PublicUser) {
    return this.cartService.clearCart(user.id);
  }
}
