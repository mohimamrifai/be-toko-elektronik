import { Module } from '@nestjs/common';
import { AdminPromoSliderController } from './admin-promo-slider.controller.js';
import { PromoSliderController } from './promo-slider.controller.js';
import { PromoSliderService } from './promo-slider.service.js';

@Module({
  controllers: [PromoSliderController, AdminPromoSliderController],
  providers: [PromoSliderService],
})
export class PromoSliderModule {}
