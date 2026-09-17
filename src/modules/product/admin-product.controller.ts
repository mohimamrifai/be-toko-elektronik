import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { QueryAdminProductsDto } from './dto/query-admin-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductService } from './product.service.js';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(@Query() query: QueryAdminProductsDto) {
    return this.productService.findAllAdmin(query);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.createAdmin(createProductDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOneAdmin(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.updateAdmin(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.removeAdmin(id);
  }
}
