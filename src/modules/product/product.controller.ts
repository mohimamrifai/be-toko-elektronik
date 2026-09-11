import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryProductsDto } from './dto/query-products.dto.js';
import { ProductService } from './product.service.js';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productService.findAllPublic({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      category: query.category,
      brand: query.brand,
      search: query.search,
      sort: query.sort,
    });
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productService.findOnePublic(slug);
  }
}
