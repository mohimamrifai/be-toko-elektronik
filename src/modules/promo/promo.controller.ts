import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CartService } from '../cart/cart.service.js';
import { ValidatePromoDto } from './dto/validate-promo.dto.js';
import { PromoService } from './promo.service.js';

@Controller('promos')
@UseGuards(JwtAuthGuard)
export class PromoController {
  constructor(
    private readonly promoService: PromoService,
    private readonly cartService: CartService,
  ) {}

  @Post('validate')
  async validate(
    @CurrentUser() user: PublicUser,
    @Body() validatePromoDto: ValidatePromoDto,
  ) {
    const cart = await this.cartService.getCart(user.id);

    return this.promoService.validateForCart(
      validatePromoDto.code,
      cart.items.map((item) => ({
        productId: item.productId,
        price: item.price,
        quantity: item.quantity,
      })),
      cart.subtotal,
    );
  }
}
