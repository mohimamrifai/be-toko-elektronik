import { Controller, Get, Param } from '@nestjs/common';
import { BrandService } from './brand.service.js';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  findAll() {
    return this.brandService.findAllPublic();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.brandService.findOnePublicBySlug(slug);
  }
}
