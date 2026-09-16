import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminPromoSliderController } from './admin-promo-slider.controller.js';
import { PromoSliderController } from './promo-slider.controller.js';
import { PromoSliderService } from './promo-slider.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PromoSliderController, AdminPromoSliderController],
  providers: [PromoSliderService],
})
export class PromoSliderModule {}
