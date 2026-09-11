import { Module } from '@nestjs/common';
import { AdminPromoBannerController } from './admin-promo-banner.controller.js';
import { PromoBannerController } from './promo-banner.controller.js';
import { PromoBannerService } from './promo-banner.service.js';

@Module({
  controllers: [PromoBannerController, AdminPromoBannerController],
  providers: [PromoBannerService],
})
export class PromoBannerModule {}
