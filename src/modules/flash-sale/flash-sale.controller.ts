import { Controller, Get } from '@nestjs/common';
import { FlashSaleService } from './flash-sale.service.js';

@Controller('flash-sales')
export class FlashSaleController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  @Get('active')
  findActive() {
    return this.flashSaleService.findActivePublic();
  }
}
