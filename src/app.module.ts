import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { PromoSliderModule } from './modules/promo-slider/promo-slider.module.js';
import { TopBannerModule } from './modules/top-banner/top-banner.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    StorageModule,
    TopBannerModule,
    PromoSliderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
