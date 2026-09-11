import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { brands } from '../../database/schema/brands.schema.js';
import { products } from '../../database/schema/products.schema.js';

const publicBrandFields = {
  id: brands.id,
  name: brands.name,
  slug: brands.slug,
  logoUrl: brands.logoUrl,
};

@Injectable()
export class BrandService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAllPublic() {
    return this.db
      .select(publicBrandFields)
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.name));
  }

  async findOnePublicBySlug(slug: string) {
    const [brand] = await this.db
      .select(publicBrandFields)
      .from(brands)
      .where(and(eq(brands.slug, slug), eq(brands.isActive, true)))
      .limit(1);

    if (!brand) {
      throw new NotFoundException(`Brand "${slug}" not found`);
    }

    const [{ productCount }] = await this.db
      .select({ productCount: count() })
      .from(products)
      .where(and(eq(products.brandId, brand.id), eq(products.isActive, true)));

    return {
      ...brand,
      productCount,
    };
  }
}
