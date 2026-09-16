import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminPromoBannerController } from './admin-promo-banner.controller.js';
import { PromoBannerController } from './promo-banner.controller.js';
import { PromoBannerService } from './promo-banner.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PromoBannerController, AdminPromoBannerController],
  providers: [PromoBannerService],
})
export class PromoBannerModule {}
