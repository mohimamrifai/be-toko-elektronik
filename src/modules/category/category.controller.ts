import { Controller, Get, Param } from '@nestjs/common';
import { CategoryService } from './category.service.js';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOnePublic(id);
  }
}
