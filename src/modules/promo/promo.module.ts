import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CartModule } from '../cart/cart.module.js';
import { AdminPromoController } from './admin-promo.controller.js';
import { PromoController } from './promo.controller.js';
import { PromoService } from './promo.service.js';

@Module({
  imports: [AuthModule, CartModule],
  controllers: [PromoController, AdminPromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
