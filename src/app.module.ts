import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TopBannerModule } from './modules/top-banner/top-banner.module.js';

@Module({
  imports: [TopBannerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
