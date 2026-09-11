import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { brands } from '../../database/schema/brands.schema.js';
import { categories } from '../../database/schema/categories.schema.js';
import { productImages } from '../../database/schema/product-images.schema.js';
import { productSpecifications } from '../../database/schema/product-specifications.schema.js';
import { productVariants } from '../../database/schema/product-variants.schema.js';
import { products } from '../../database/schema/products.schema.js';
import type { ProductSort } from './dto/query-products.dto.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

export interface FindAllProductsOptions {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  search?: string;
  sort?: ProductSort;
}

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function getEffectivePrice(
  price: string,
  discountPrice: string | null,
): number {
  return toNumber(discountPrice) ?? toNumber(price) ?? 0;
}

function mapListItem(
  row: {
    id: string;
    name: string;
    slug: string;
    price: string;
    discountPrice: string | null;
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    brandId: string;
    brandName: string;
    brandSlug: string;
  },
  image: string | null,
) {
  const listPrice = toNumber(row.price) ?? 0;
  const salePrice = toNumber(row.discountPrice);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image,
    price: salePrice ?? listPrice,
    originalPrice: salePrice !== null ? listPrice : null,
    rating: 0,
    soldCount: 0,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      slug: row.categorySlug,
    },
    brand: {
      id: row.brandId,
      name: row.brandName,
      slug: row.brandSlug,
    },
  };
}

@Injectable()
export class ProductService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private buildListConditions(options: FindAllProductsOptions): SQL[] {
    const conditions: SQL[] = [eq(products.isActive, true)];

    if (options.category) {
      conditions.push(eq(categories.slug, options.category));
    }

    if (options.brand) {
      conditions.push(eq(brands.slug, options.brand));
    }

    const search = options.search?.trim();

    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or(ilike(products.name, term), ilike(products.description, term))!,
      );
    }

    return conditions;
  }

  private getListOrderBy(sort: ProductSort = 'terbaru') {
    switch (sort) {
      case 'termurah':
        return asc(
          sql`COALESCE(${products.discountPrice}, ${products.price})`,
        );
      case 'terlaris':
        // Placeholder until order/sold-count data is available.
        return desc(products.createdAt);
      case 'terbaru':
      default:
        return desc(products.createdAt);
    }
  }

  private async getPrimaryImagesMap(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<string, string>();
    }

    const images = await this.db
      .select({
        productId: productImages.productId,
        imageUrl: productImages.imageUrl,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder));

    const imageMap = new Map<string, string>();

    for (const image of images) {
      if (!imageMap.has(image.productId)) {
        imageMap.set(image.productId, image.imageUrl);
      }
    }

    return imageMap;
  }

  async findAllPublic(options: FindAllProductsOptions = {}) {
    const page = Math.max(options.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = (page - 1) * limit;
    const conditions = this.buildListConditions(options);
    const whereClause = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(whereClause);

    const rows = await this.db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        discountPrice: products.discountPrice,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(whereClause)
      .orderBy(this.getListOrderBy(options.sort))
      .limit(limit)
      .offset(offset);

    const imageMap = await this.getPrimaryImagesMap(rows.map((row) => row.id));

    return {
      items: rows.map((row) =>
        mapListItem(row, imageMap.get(row.id) ?? null),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePublic(slug: string) {
    const [product] = await this.db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        discountPrice: products.discountPrice,
        stock: products.stock,
        sku: products.sku,
        warrantyMonths: products.warrantyMonths,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
        brandLogoUrl: brands.logoUrl,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    const [images, specifications, variants] = await Promise.all([
      this.db
        .select({
          id: productImages.id,
          imageUrl: productImages.imageUrl,
          isPrimary: productImages.isPrimary,
          sortOrder: productImages.sortOrder,
        })
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder)),
      this.db
        .select({
          id: productSpecifications.id,
          specKey: productSpecifications.specKey,
          specValue: productSpecifications.specValue,
          sortOrder: productSpecifications.sortOrder,
        })
        .from(productSpecifications)
        .where(eq(productSpecifications.productId, product.id))
        .orderBy(asc(productSpecifications.sortOrder)),
      this.db
        .select({
          id: productVariants.id,
          variantName: productVariants.variantName,
          priceAdjustment: productVariants.priceAdjustment,
          stock: productVariants.stock,
          sku: productVariants.sku,
        })
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.variantName)),
    ]);

    const listPrice = toNumber(product.price) ?? 0;
    const salePrice = toNumber(product.discountPrice);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: salePrice ?? listPrice,
      originalPrice: salePrice !== null ? listPrice : null,
      stock: product.stock,
      sku: product.sku,
      warrantyMonths: product.warrantyMonths,
      rating: 0,
      soldCount: 0,
      category: {
        id: product.categoryId,
        name: product.categoryName,
        slug: product.categorySlug,
      },
      brand: {
        id: product.brandId,
        name: product.brandName,
        slug: product.brandSlug,
        logoUrl: product.brandLogoUrl,
      },
      images,
      specifications,
      variants: variants.map((variant) => ({
        ...variant,
        priceAdjustment: toNumber(variant.priceAdjustment) ?? 0,
        finalPrice:
          getEffectivePrice(product.price, product.discountPrice) +
          (toNumber(variant.priceAdjustment) ?? 0),
      })),
    };
  }
}
