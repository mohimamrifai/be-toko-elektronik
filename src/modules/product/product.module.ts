import { Module } from '@nestjs/common';
import { ReviewModule } from '../review/review.module.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

@Module({
  imports: [ReviewModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
