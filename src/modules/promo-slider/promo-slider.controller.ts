import { Controller, Get, Param } from '@nestjs/common';
import { PromoSliderService } from './promo-slider.service.js';

@Controller('promo-slider')
export class PromoSliderController {
  constructor(private readonly promoSliderService: PromoSliderService) {}

  @Get()
  findAll() {
    return this.promoSliderService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promoSliderService.findOnePublic(id);
  }
}
