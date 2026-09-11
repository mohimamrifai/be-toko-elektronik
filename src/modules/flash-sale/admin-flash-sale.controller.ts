import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto.js';
import { SyncFlashSaleProductsDto } from './dto/sync-flash-sale-products.dto.js';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto.js';
import { UpdateFlashSaleProductDto } from './dto/update-flash-sale-product.dto.js';
import { FlashSaleService } from './flash-sale.service.js';

@Controller('admin/flash-sales')
export class AdminFlashSaleController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  @Post()
  create(@Body() createFlashSaleDto: CreateFlashSaleDto) {
    return this.flashSaleService.create(createFlashSaleDto);
  }

  @Get()
  findAll() {
    return this.flashSaleService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flashSaleService.findOneAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFlashSaleDto: UpdateFlashSaleDto,
  ) {
    return this.flashSaleService.update(id, updateFlashSaleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flashSaleService.remove(id);
  }

  @Put(':id/products')
  syncProducts(
    @Param('id') id: string,
    @Body() syncFlashSaleProductsDto: SyncFlashSaleProductsDto,
  ) {
    return this.flashSaleService.syncProducts(
      id,
      syncFlashSaleProductsDto.products,
    );
  }

  @Patch(':id/products/:itemId')
  updateProduct(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateFlashSaleProductDto: UpdateFlashSaleProductDto,
  ) {
    return this.flashSaleService.updateProduct(
      id,
      itemId,
      updateFlashSaleProductDto,
    );
  }

  @Delete(':id/products/:itemId')
  removeProduct(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.flashSaleService.removeProduct(id, itemId);
  }
}
