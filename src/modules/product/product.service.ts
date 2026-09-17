import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { orderItems } from '../../database/schema/orders.schema.js';
import { productVariants } from '../../database/schema/product-variants.schema.js';
import { products } from '../../database/schema/products.schema.js';
import { ReviewService } from '../review/review.service.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { CreateProductImageDto } from './dto/create-product-image.dto.js';
import type { CreateProductSpecificationDto } from './dto/create-product-specification.dto.js';
import type { CreateProductVariantDto } from './dto/create-product-variant.dto.js';
import type { QueryAdminProductsDto } from './dto/query-admin-products.dto.js';
import type { ProductSort } from './dto/query-products.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';

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

function formatMoney(value: number) {
  return value.toFixed(2);
}

type DbExecutor = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>;

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
  reviewStats?: { avgRating: number; reviewCount: number },
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
    rating: reviewStats?.avgRating ?? 0,
    reviewCount: reviewStats?.reviewCount ?? 0,
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
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly reviewService: ReviewService,
  ) {}

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

    const productIds = rows.map((row) => row.id);
    const [imageMap, reviewStatsMap] = await Promise.all([
      this.getPrimaryImagesMap(productIds),
      this.reviewService.getStatsByProductIds(productIds),
    ]);

    return {
      items: rows.map((row) =>
        mapListItem(
          row,
          imageMap.get(row.id) ?? null,
          reviewStatsMap.get(row.id),
        ),
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
    const reviewStatsMap = await this.reviewService.getStatsByProductIds([
      product.id,
    ]);
    const reviewStats = reviewStatsMap.get(product.id) ?? {
      avgRating: 0,
      reviewCount: 0,
    };

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
      rating: reviewStats.avgRating,
      reviewCount: reviewStats.reviewCount,
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

  private async ensureCategoryExists(categoryId: string) {
    const [category] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (!category) {
      throw new NotFoundException(`Category #${categoryId} not found`);
    }
  }

  private async ensureBrandExists(brandId: string) {
    const [brand] = await this.db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);

    if (!brand) {
      throw new NotFoundException(`Brand #${brandId} not found`);
    }
  }

  private validateStock(stock: number, label = 'Stok') {
    if (!Number.isInteger(stock) || stock < 0) {
      throw new BadRequestException(`${label} tidak boleh negatif`);
    }
  }

  private validateImages(images: CreateProductImageDto[]) {
    if (!images.length) {
      throw new BadRequestException('Produk wajib memiliki minimal satu gambar');
    }

    const primaryCount = images.filter((image) => image.isPrimary).length;

    if (primaryCount !== 1) {
      throw new BadRequestException(
        'Produk wajib memiliki tepat satu gambar utama',
      );
    }
  }

  private async ensureUniqueProductSlug(slug: string, excludeProductId?: string) {
    const [existing] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existing && existing.id !== excludeProductId) {
      throw new ConflictException('Slug produk sudah digunakan');
    }
  }

  private async ensureUniqueSku(
    sku: string,
    excludeProductId?: string,
    excludeVariantIds: string[] = [],
  ) {
    const [existingProduct] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, sku))
      .limit(1);

    if (existingProduct && existingProduct.id !== excludeProductId) {
      throw new ConflictException('SKU produk sudah digunakan');
    }

    const [existingVariant] = await this.db
      .select({ id: productVariants.id, productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.sku, sku))
      .limit(1);

    if (
      existingVariant &&
      existingVariant.productId !== excludeProductId &&
      !excludeVariantIds.includes(existingVariant.id)
    ) {
      throw new ConflictException('SKU varian sudah digunakan');
    }
  }

  private async ensureUniqueVariantSkus(
    variants: CreateProductVariantDto[],
    excludeProductId?: string,
  ) {
    const seen = new Set<string>();

    for (const variant of variants) {
      const sku = variant.sku.trim();

      if (seen.has(sku)) {
        throw new ConflictException(`SKU varian duplikat: ${sku}`);
      }

      seen.add(sku);
      await this.ensureUniqueSku(sku, excludeProductId);
    }
  }

  private async insertNestedProductData(
    executor: DbExecutor,
    productId: string,
    images: CreateProductImageDto[],
    specifications: CreateProductSpecificationDto[] = [],
    variants: CreateProductVariantDto[] = [],
  ) {
    await executor.insert(productImages).values(
      images.map((image, index) => ({
        productId,
        imageUrl: image.imageUrl,
        isPrimary: image.isPrimary ?? false,
        sortOrder: image.sortOrder ?? index + 1,
      })),
    );

    if (specifications.length) {
      await executor.insert(productSpecifications).values(
        specifications.map((spec, index) => ({
          productId,
          specKey: spec.specKey,
          specValue: spec.specValue,
          sortOrder: spec.sortOrder ?? index + 1,
        })),
      );
    }

    if (variants.length) {
      await executor.insert(productVariants).values(
        variants.map((variant) => ({
          productId,
          variantName: variant.variantName,
          priceAdjustment: formatMoney(variant.priceAdjustment ?? 0),
          stock: variant.stock,
          sku: variant.sku,
        })),
      );
    }
  }

  private parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return undefined;
  }

  private async replaceNestedProductData(
    executor: DbExecutor,
    productId: string,
    images?: CreateProductImageDto[],
    specifications?: CreateProductSpecificationDto[],
    variants?: CreateProductVariantDto[],
  ) {
    if (images) {
      this.validateImages(images);
      await executor
        .delete(productImages)
        .where(eq(productImages.productId, productId));
      await executor.insert(productImages).values(
        images.map((image, index) => ({
          productId,
          imageUrl: image.imageUrl,
          isPrimary: image.isPrimary ?? false,
          sortOrder: image.sortOrder ?? index + 1,
        })),
      );
    }

    if (specifications) {
      await executor
        .delete(productSpecifications)
        .where(eq(productSpecifications.productId, productId));

      if (specifications.length) {
        await executor.insert(productSpecifications).values(
          specifications.map((spec, index) => ({
            productId,
            specKey: spec.specKey,
            specValue: spec.specValue,
            sortOrder: spec.sortOrder ?? index + 1,
          })),
        );
      }
    }

    if (variants) {
      for (const variant of variants) {
        this.validateStock(variant.stock, `Stok varian ${variant.variantName}`);
      }

      await this.ensureUniqueVariantSkus(variants, productId);

      await executor
        .delete(productVariants)
        .where(eq(productVariants.productId, productId));

      if (variants.length) {
        await executor.insert(productVariants).values(
          variants.map((variant) => ({
            productId,
            variantName: variant.variantName,
            priceAdjustment: formatMoney(variant.priceAdjustment ?? 0),
            stock: variant.stock,
            sku: variant.sku,
          })),
        );
      }
    }
  }

  private async fetchAdminProductDetail(productId: string) {
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
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
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
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
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
        .where(eq(productImages.productId, productId))
        .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder)),
      this.db
        .select({
          id: productSpecifications.id,
          specKey: productSpecifications.specKey,
          specValue: productSpecifications.specValue,
          sortOrder: productSpecifications.sortOrder,
        })
        .from(productSpecifications)
        .where(eq(productSpecifications.productId, productId))
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
        .where(eq(productVariants.productId, productId))
        .orderBy(asc(productVariants.variantName)),
    ]);

    const listPrice = toNumber(product.price) ?? 0;
    const salePrice = toNumber(product.discountPrice);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: listPrice,
      discountPrice: salePrice,
      stock: product.stock,
      sku: product.sku,
      warrantyMonths: product.warrantyMonths,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
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
      })),
    };
  }

  async findAllAdmin(query: QueryAdminProductsDto = {}) {
    const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(Number(query.limit) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    const isActive = this.parseOptionalBoolean(query.isActive);

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    if (query.brandId) {
      conditions.push(eq(products.brandId, query.brandId));
    }

    if (isActive !== undefined) {
      conditions.push(eq(products.isActive, isActive));
    }

    const search = query.search?.trim();

    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or(
          ilike(products.name, term),
          ilike(products.sku, term),
          ilike(products.slug, term),
        )!,
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

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
        sku: products.sku,
        price: products.price,
        discountPrice: products.discountPrice,
        stock: products.stock,
        isActive: products.isActive,
        createdAt: products.createdAt,
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
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    const imageMap = await this.getPrimaryImagesMap(rows.map((row) => row.id));

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        price: toNumber(row.price) ?? 0,
        discountPrice: toNumber(row.discountPrice),
        stock: row.stock,
        isActive: row.isActive,
        createdAt: row.createdAt,
        primaryImage: imageMap.get(row.id) ?? null,
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
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneAdmin(productId: string) {
    return this.fetchAdminProductDetail(productId);
  }

  async createAdmin(createProductDto: CreateProductDto) {
    this.validateStock(createProductDto.stock);
    this.validateImages(createProductDto.images);
    await this.ensureCategoryExists(createProductDto.categoryId);
    await this.ensureBrandExists(createProductDto.brandId);
    await this.ensureUniqueProductSlug(createProductDto.slug);
    await this.ensureUniqueSku(createProductDto.sku);

    const variants = createProductDto.variants ?? [];

    for (const variant of variants) {
      this.validateStock(variant.stock, `Stok varian ${variant.variantName}`);
    }

    await this.ensureUniqueVariantSkus(variants);

    const productId = await this.db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          categoryId: createProductDto.categoryId,
          brandId: createProductDto.brandId,
          name: createProductDto.name,
          slug: createProductDto.slug,
          description: createProductDto.description,
          price: formatMoney(createProductDto.price),
          discountPrice:
            createProductDto.discountPrice !== undefined
              ? formatMoney(createProductDto.discountPrice)
              : null,
          stock: createProductDto.stock,
          sku: createProductDto.sku,
          warrantyMonths: createProductDto.warrantyMonths,
          isActive: createProductDto.isActive ?? true,
        })
        .returning({ id: products.id });

      await this.insertNestedProductData(
        tx,
        product.id,
        createProductDto.images,
        createProductDto.specifications ?? [],
        variants,
      );

      return product.id;
    });

    return this.fetchAdminProductDetail(productId);
  }

  async updateAdmin(productId: string, updateProductDto: UpdateProductDto) {
    const [existing] = await this.db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    if (updateProductDto.categoryId) {
      await this.ensureCategoryExists(updateProductDto.categoryId);
    }

    if (updateProductDto.brandId) {
      await this.ensureBrandExists(updateProductDto.brandId);
    }

    if (updateProductDto.stock !== undefined) {
      this.validateStock(updateProductDto.stock);
    }

    if (updateProductDto.slug) {
      await this.ensureUniqueProductSlug(updateProductDto.slug, productId);
    }

    if (updateProductDto.sku) {
      await this.ensureUniqueSku(updateProductDto.sku, productId);
    }

    if (updateProductDto.variants) {
      for (const variant of updateProductDto.variants) {
        this.validateStock(variant.stock, `Stok varian ${variant.variantName}`);
      }

      await this.ensureUniqueVariantSkus(updateProductDto.variants, productId);
    }

    await this.db.transaction(async (tx) => {
      const [product] = await tx
        .update(products)
        .set({
          ...(updateProductDto.categoryId !== undefined && {
            categoryId: updateProductDto.categoryId,
          }),
          ...(updateProductDto.brandId !== undefined && {
            brandId: updateProductDto.brandId,
          }),
          ...(updateProductDto.name !== undefined && {
            name: updateProductDto.name,
          }),
          ...(updateProductDto.slug !== undefined && {
            slug: updateProductDto.slug,
          }),
          ...(updateProductDto.description !== undefined && {
            description: updateProductDto.description,
          }),
          ...(updateProductDto.price !== undefined && {
            price: formatMoney(updateProductDto.price),
          }),
          ...(updateProductDto.discountPrice !== undefined && {
            discountPrice: formatMoney(updateProductDto.discountPrice),
          }),
          ...(updateProductDto.stock !== undefined && {
            stock: updateProductDto.stock,
          }),
          ...(updateProductDto.sku !== undefined && {
            sku: updateProductDto.sku,
          }),
          ...(updateProductDto.warrantyMonths !== undefined && {
            warrantyMonths: updateProductDto.warrantyMonths,
          }),
          ...(updateProductDto.isActive !== undefined && {
            isActive: updateProductDto.isActive,
          }),
        })
        .where(eq(products.id, productId))
        .returning({ id: products.id });

      if (!product) {
        throw new NotFoundException(`Product #${productId} not found`);
      }

      if (
        updateProductDto.images ||
        updateProductDto.specifications ||
        updateProductDto.variants
      ) {
        await this.replaceNestedProductData(
          tx,
          productId,
          updateProductDto.images,
          updateProductDto.specifications,
          updateProductDto.variants,
        );
      }
    });

    return this.fetchAdminProductDetail(productId);
  }

  async removeAdmin(productId: string) {
    const [existing] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    const [orderItem] = await this.db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.productId, productId))
      .limit(1);

    if (orderItem) {
      throw new BadRequestException(
        'Produk tidak dapat dihapus karena sudah memiliki pesanan',
      );
    }

    await this.db.delete(products).where(eq(products.id, productId));

    return { message: 'Produk berhasil dihapus' };
  }
}
