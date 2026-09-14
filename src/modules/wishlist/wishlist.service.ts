import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { brands } from '../../database/schema/brands.schema.js';
import { categories } from '../../database/schema/categories.schema.js';
import { productImages } from '../../database/schema/product-images.schema.js';
import { products } from '../../database/schema/products.schema.js';
import { wishlists } from '../../database/schema/wishlists.schema.js';

function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
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
  const listPrice = toNumber(row.price);
  const salePrice = row.discountPrice ? toNumber(row.discountPrice) : null;

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
export class WishlistService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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

  private async ensureProduct(productId: string) {
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    return product;
  }

  private async fetchProductsByIds(productIds: string[]) {
    if (productIds.length === 0) {
      return [];
    }

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
      .where(and(inArray(products.id, productIds), eq(products.isActive, true)));

    const imageMap = await this.getPrimaryImagesMap(rows.map((row) => row.id));

    return rows.map((row) => mapListItem(row, imageMap.get(row.id) ?? null));
  }

  async findAll(userId: string) {
    const entries = await this.db
      .select({
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
      })
      .from(wishlists)
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.createdAt));

    const productsById = new Map(
      (await this.fetchProductsByIds(entries.map((entry) => entry.productId))).map(
        (product) => [product.id, product],
      ),
    );

    return entries
      .map((entry) => productsById.get(entry.productId))
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
  }

  async add(userId: string, productId: string) {
    await this.ensureProduct(productId);

    const [existing] = await this.db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(
        and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)),
      )
      .limit(1);

    if (!existing) {
      await this.db.insert(wishlists).values({
        userId,
        productId,
      });
    }

    const [product] = await this.fetchProductsByIds([productId]);

    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    return product;
  }

  async remove(userId: string, productId: string) {
    const [entry] = await this.db
      .delete(wishlists)
      .where(
        and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)),
      )
      .returning({ id: wishlists.id });

    if (!entry) {
      throw new NotFoundException('Produk tidak ditemukan di wishlist');
    }

    return { productId, removed: true };
  }
}
