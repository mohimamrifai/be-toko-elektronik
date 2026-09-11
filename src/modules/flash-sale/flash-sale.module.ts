import { Module } from '@nestjs/common';
import { AdminFlashSaleController } from './admin-flash-sale.controller.js';
import { FlashSaleController } from './flash-sale.controller.js';
import { FlashSaleService } from './flash-sale.service.js';

@Module({
  controllers: [FlashSaleController, AdminFlashSaleController],
  providers: [FlashSaleService],
})
export class FlashSaleModule {}
