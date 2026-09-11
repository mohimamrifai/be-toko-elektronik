import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { FlashSaleModule } from './modules/flash-sale/flash-sale.module.js';
import { ProductModule } from './modules/product/product.module.js';
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
    CategoryModule,
    ProductModule,
    FlashSaleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
