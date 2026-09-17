import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReviewModule } from '../review/review.module.js';
import { AdminProductController } from './admin-product.controller.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

@Module({
  imports: [ReviewModule, AuthModule],
  controllers: [ProductController, AdminProductController],
  providers: [ProductService],
})
export class ProductModule {}
