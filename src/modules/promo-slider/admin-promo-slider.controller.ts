import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreatePromoSliderDto } from './dto/create-promo-slider.dto.js';
import { UpdatePromoSliderDto } from './dto/update-promo-slider.dto.js';
import { PromoSliderService } from './promo-slider.service.js';

@Controller('admin/promo-slider')
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
