import { Controller, Get, Param } from '@nestjs/common';
import { PromoBannerService } from './promo-banner.service.js';

@Controller('promo-banners')
export class PromoBannerController {
  constructor(private readonly promoBannerService: PromoBannerService) {}

  @Get()
  findAll() {
    return this.promoBannerService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promoBannerService.findOnePublic(id);
  }
}
