import { Module } from '@nestjs/common';
import { TopBannerService } from './top-banner.service.js';
import { TopBannerController } from './top-banner.controller.js';

@Module({
  controllers: [TopBannerController],
  providers: [TopBannerService],
})
export class TopBannerModule {}
