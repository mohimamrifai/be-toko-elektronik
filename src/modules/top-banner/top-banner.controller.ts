import { Controller, Get, Param } from '@nestjs/common';
import { TopBannerService } from './top-banner.service.js';

@Controller('top-banner')
export class TopBannerController {
  constructor(private readonly topBannerService: TopBannerService) {}

  @Get()
  findAll() {
    return this.topBannerService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topBannerService.findOnePublic(id);
  }
}
