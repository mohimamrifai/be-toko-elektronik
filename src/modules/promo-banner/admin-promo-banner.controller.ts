import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreatePromoBannerDto } from './dto/create-promo-banner.dto.js';
import { UpdatePromoBannerDto } from './dto/update-promo-banner.dto.js';
import { PromoBannerService } from './promo-banner.service.js';

@Controller('admin/promo-banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
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
