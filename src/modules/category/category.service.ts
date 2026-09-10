import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { categories } from '../../database/schema/categories.schema.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

const publicCategoryFields = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  icon: categories.icon,
  parentId: categories.parentId,
};

const adminCategoryFields = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  icon: categories.icon,
  parentId: categories.parentId,
  isActive: categories.isActive,
  sortOrder: categories.sortOrder,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
};

@Injectable()
export class CategoryService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAllPublic() {
    return this.db
      .select(publicCategoryFields)
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));
  }

  async findOnePublic(id: string) {
    const [category] = await this.db
      .select(publicCategoryFields)
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.isActive, true)))
      .limit(1);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  findAllAdmin() {
    return this.db
      .select(adminCategoryFields)
      .from(categories)
      .orderBy(asc(categories.sortOrder));
  }

  async findOneAdmin(id: string) {
    const [category] = await this.db
      .select(adminCategoryFields)
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const [category] = await this.db
      .insert(categories)
      .values({
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        icon: createCategoryDto.icon,
        parentId: createCategoryDto.parentId,
        isActive: createCategoryDto.isActive ?? true,
        sortOrder: createCategoryDto.sortOrder ?? 0,
      })
      .returning(adminCategoryFields);

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const [category] = await this.db
      .update(categories)
      .set({
        ...(updateCategoryDto.name !== undefined && {
          name: updateCategoryDto.name,
        }),
        ...(updateCategoryDto.slug !== undefined && {
          slug: updateCategoryDto.slug,
        }),
        ...(updateCategoryDto.icon !== undefined && {
          icon: updateCategoryDto.icon,
        }),
        ...(updateCategoryDto.parentId !== undefined && {
          parentId: updateCategoryDto.parentId,
        }),
        ...(updateCategoryDto.isActive !== undefined && {
          isActive: updateCategoryDto.isActive,
        }),
        ...(updateCategoryDto.sortOrder !== undefined && {
          sortOrder: updateCategoryDto.sortOrder,
        }),
      })
      .where(eq(categories.id, id))
      .returning(adminCategoryFields);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  async remove(id: string) {
    const [category] = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning(adminCategoryFields);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }
}
