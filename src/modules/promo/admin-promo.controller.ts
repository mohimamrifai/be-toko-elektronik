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
import { CreatePromoDto } from './dto/create-promo.dto.js';
import { UpdatePromoDto } from './dto/update-promo.dto.js';
import { PromoService } from './promo.service.js';

@Controller('admin/promos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get()
  findAll() {
    return this.promoService.findAllAdmin();
  }

  @Post()
  create(@Body() createPromoDto: CreatePromoDto) {
    return this.promoService.createAdmin(createPromoDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promoService.findOneAdmin(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePromoDto: UpdatePromoDto) {
    return this.promoService.updateAdmin(id, updatePromoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promoService.removeAdmin(id);
  }
}
