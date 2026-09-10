import { Module } from '@nestjs/common';
import { AdminTopBannerController } from './admin-top-banner.controller.js';
import { TopBannerController } from './top-banner.controller.js';
import { TopBannerService } from './top-banner.service.js';

@Module({
  controllers: [TopBannerController, AdminTopBannerController],
  providers: [TopBannerService],
})
export class TopBannerModule {}
