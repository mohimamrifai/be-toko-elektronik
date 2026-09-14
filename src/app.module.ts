import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AddressModule } from './modules/address/address.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BrandModule } from './modules/brand/brand.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { WishlistModule } from './modules/wishlist/wishlist.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { ClaimModule } from './modules/claim/claim.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { FlashSaleModule } from './modules/flash-sale/flash-sale.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { PromoBannerModule } from './modules/promo-banner/promo-banner.module.js';
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
    AuthModule,
    AddressModule,
    CartModule,
    OrderModule,
    PaymentModule,
    WishlistModule,
    ReviewModule,
    ClaimModule,
    StorageModule,
    TopBannerModule,
    PromoSliderModule,
    PromoBannerModule,
    CategoryModule,
    BrandModule,
    ProductModule,
    FlashSaleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
