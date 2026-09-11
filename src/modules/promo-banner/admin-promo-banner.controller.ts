import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreatePromoBannerDto } from './dto/create-promo-banner.dto.js';
import { UpdatePromoBannerDto } from './dto/update-promo-banner.dto.js';
import { PromoBannerService } from './promo-banner.service.js';

@Controller('admin/promo-banners')
export class AdminPromoBannerController {
  constructor(private readonly promoBannerService: PromoBannerService) {}

  @Post()
  create(@Body() createPromoBannerDto: CreatePromoBannerDto) {
    return this.promoBannerService.create(createPromoBannerDto);
  }

  @Get()
  findAll() {
    return this.promoBannerService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promoBannerService.findOneAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePromoBannerDto: UpdatePromoBannerDto,
  ) {
    return this.promoBannerService.update(id, updatePromoBannerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promoBannerService.remove(id);
  }
}
