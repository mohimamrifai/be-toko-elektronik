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
import { CreatePromoSliderDto } from './dto/create-promo-slider.dto.js';
import { UpdatePromoSliderDto } from './dto/update-promo-slider.dto.js';
import { PromoSliderService } from './promo-slider.service.js';

@Controller('admin/promo-slider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPromoSliderController {
  constructor(private readonly promoSliderService: PromoSliderService) {}

  @Post()
  create(@Body() createPromoSliderDto: CreatePromoSliderDto) {
    return this.promoSliderService.create(createPromoSliderDto);
  }

  @Get()
  findAll() {
    return this.promoSliderService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promoSliderService.findOneAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePromoSliderDto: UpdatePromoSliderDto,
  ) {
    return this.promoSliderService.update(id, updatePromoSliderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promoSliderService.remove(id);
  }
}
