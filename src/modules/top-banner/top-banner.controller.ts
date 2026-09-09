import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TopBannerService } from './top-banner.service.js';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';

@Controller('top-banner')
export class TopBannerController {
  constructor(private readonly topBannerService: TopBannerService) {}

  @Post()
  create(@Body() createTopBannerDto: CreateTopBannerDto) {
    return this.topBannerService.create(createTopBannerDto);
  }

  @Get()
  findAll() {
    return this.topBannerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topBannerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTopBannerDto: UpdateTopBannerDto) {
    return this.topBannerService.update(+id, updateTopBannerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topBannerService.remove(+id);
  }
}
