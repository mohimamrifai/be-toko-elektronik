import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
} from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import {
  flashSaleProducts,
  flashSales,
} from '../../database/schema/flash-sales.schema.js';
import { productImages } from '../../database/schema/product-images.schema.js';
import { products } from '../../database/schema/products.schema.js';
import type { CreateFlashSaleDto } from './dto/create-flash-sale.dto.js';
import type { CreateFlashSaleProductDto } from './dto/create-flash-sale-product.dto.js';
import type { UpdateFlashSaleDto } from './dto/update-flash-sale.dto.js';
import type { UpdateFlashSaleProductDto } from './dto/update-flash-sale-product.dto.js';

const adminFlashSaleFields = {
  id: flashSales.id,
  name: flashSales.name,
  startsAt: flashSales.startsAt,
  endsAt: flashSales.endsAt,
  isActive: flashSales.isActive,
};

const publicFlashSaleFields = {
  id: flashSales.id,
  name: flashSales.name,
  startsAt: flashSales.startsAt,
  endsAt: flashSales.endsAt,
};

function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function getEffectiveProductPrice(
  price: string,
  discountPrice: string | null,
): number {
  return toNumber(discountPrice) ?? toNumber(price);
}

function calculateDiscountPercent(
  originalPrice: number,
  flashPrice: number,
): number {
  if (originalPrice <= 0 || flashPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - flashPrice) / originalPrice) * 100);
}

function calculateSoldPercentage(soldCount: number, stockLimit: number): number {
  if (stockLimit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((soldCount / stockLimit) * 100));
}

@Injectable()
export class FlashSaleService {
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

  private async getFlashSaleProducts(flashSaleId: string) {
    const rows = await this.db
      .select({
        id: flashSaleProducts.id,
        productId: flashSaleProducts.productId,
        flashPrice: flashSaleProducts.flashPrice,
        stockLimit: flashSaleProducts.stockLimit,
        soldCount: flashSaleProducts.soldCount,
        productName: products.name,
        productSlug: products.slug,
        productPrice: products.price,
        productDiscountPrice: products.discountPrice,
        productIsActive: products.isActive,
      })
      .from(flashSaleProducts)
      .innerJoin(products, eq(flashSaleProducts.productId, products.id))
      .where(eq(flashSaleProducts.flashSaleId, flashSaleId))
      .orderBy(asc(flashSaleProducts.id));

    const imageMap = await this.getPrimaryImagesMap(
      rows.map((row) => row.productId),
    );

    return rows.map((row) => {
      const flashPrice = toNumber(row.flashPrice);
      const originalPrice = getEffectiveProductPrice(
        row.productPrice,
        row.productDiscountPrice,
      );

      return {
        id: row.id,
        productId: row.productId,
        name: row.productName,
        slug: row.productSlug,
        image: imageMap.get(row.productId) ?? null,
        flashPrice,
        originalPrice,
        discount: calculateDiscountPercent(originalPrice, flashPrice),
        stockLimit: row.stockLimit,
        soldCount: row.soldCount,
        soldPercentage: calculateSoldPercentage(row.soldCount, row.stockLimit),
        remainingStock: Math.max(0, row.stockLimit - row.soldCount),
        isProductActive: row.productIsActive,
      };
    });
  }

  private mapPublicProduct(
    item: Awaited<ReturnType<FlashSaleService['getFlashSaleProducts']>>[number],
  ) {
    return {
      id: item.productId,
      slug: item.slug,
      name: item.name,
      image: item.image,
      price: item.flashPrice,
      originalPrice: item.originalPrice,
      discount: item.discount,
      soldCount: item.soldCount,
      stockLimit: item.stockLimit,
      soldPercentage: item.soldPercentage,
      remainingStock: item.remainingStock,
    };
  }

  private mapAdminProduct(
    item: Awaited<ReturnType<FlashSaleService['getFlashSaleProducts']>>[number],
  ) {
    return {
      id: item.id,
      productId: item.productId,
      flashPrice: item.flashPrice,
      stockLimit: item.stockLimit,
      soldCount: item.soldCount,
      product: {
        id: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        price: item.originalPrice,
      },
    };
  }

  private async ensureFlashSaleExists(id: string) {
    const [flashSale] = await this.db
      .select(adminFlashSaleFields)
      .from(flashSales)
      .where(eq(flashSales.id, id))
      .limit(1);

    if (!flashSale) {
      throw new NotFoundException(`Flash sale #${id} not found`);
    }

    return flashSale;
  }

  async findActivePublic() {
    const now = new Date();

    const [flashSale] = await this.db
      .select(publicFlashSaleFields)
      .from(flashSales)
      .where(
        and(
          eq(flashSales.isActive, true),
          lte(flashSales.startsAt, now),
          gte(flashSales.endsAt, now),
        ),
      )
      .orderBy(asc(flashSales.endsAt))
      .limit(1);

    if (!flashSale) {
      throw new NotFoundException('No active flash sale found');
    }

    const products = await this.getFlashSaleProducts(flashSale.id);

    return {
      ...flashSale,
      products: products
        .filter((product) => product.isProductActive)
        .map((product) => this.mapPublicProduct(product)),
    };
  }

  findAllAdmin() {
    return this.db
      .select(adminFlashSaleFields)
      .from(flashSales)
      .orderBy(desc(flashSales.startsAt));
  }

  async findOneAdmin(id: string) {
    const flashSale = await this.ensureFlashSaleExists(id);
    const products = await this.getFlashSaleProducts(id);

    return {
      ...flashSale,
      products: products.map((product) => this.mapAdminProduct(product)),
    };
  }

  async create(createFlashSaleDto: CreateFlashSaleDto) {
    const [flashSale] = await this.db
      .insert(flashSales)
      .values({
        name: createFlashSaleDto.name,
        startsAt: new Date(createFlashSaleDto.startsAt),
        endsAt: new Date(createFlashSaleDto.endsAt),
        isActive: createFlashSaleDto.isActive ?? true,
      })
      .returning(adminFlashSaleFields);

    if (createFlashSaleDto.products?.length) {
      await this.insertProducts(flashSale.id, createFlashSaleDto.products);
    }

    return this.findOneAdmin(flashSale.id);
  }

  async update(id: string, updateFlashSaleDto: UpdateFlashSaleDto) {
    const [flashSale] = await this.db
      .update(flashSales)
      .set({
        ...(updateFlashSaleDto.name !== undefined && {
          name: updateFlashSaleDto.name,
        }),
        ...(updateFlashSaleDto.startsAt !== undefined && {
          startsAt: new Date(updateFlashSaleDto.startsAt),
        }),
        ...(updateFlashSaleDto.endsAt !== undefined && {
          endsAt: new Date(updateFlashSaleDto.endsAt),
        }),
        ...(updateFlashSaleDto.isActive !== undefined && {
          isActive: updateFlashSaleDto.isActive,
        }),
      })
      .where(eq(flashSales.id, id))
      .returning(adminFlashSaleFields);

    if (!flashSale) {
      throw new NotFoundException(`Flash sale #${id} not found`);
    }

    return this.findOneAdmin(id);
  }

  async remove(id: string) {
    const flashSale = await this.findOneAdmin(id);

    await this.db.delete(flashSales).where(eq(flashSales.id, id));

    return flashSale;
  }

  async syncProducts(
    flashSaleId: string,
    productsToSync: CreateFlashSaleProductDto[],
  ) {
    await this.ensureFlashSaleExists(flashSaleId);

    await this.db
      .delete(flashSaleProducts)
      .where(eq(flashSaleProducts.flashSaleId, flashSaleId));

    if (productsToSync.length > 0) {
      await this.insertProducts(flashSaleId, productsToSync);
    }

    return this.findOneAdmin(flashSaleId);
  }

  async updateProduct(
    flashSaleId: string,
    itemId: string,
    updateFlashSaleProductDto: UpdateFlashSaleProductDto,
  ) {
    await this.ensureFlashSaleExists(flashSaleId);

    const [item] = await this.db
      .update(flashSaleProducts)
      .set({
        ...(updateFlashSaleProductDto.flashPrice !== undefined && {
          flashPrice: updateFlashSaleProductDto.flashPrice,
        }),
        ...(updateFlashSaleProductDto.stockLimit !== undefined && {
          stockLimit: updateFlashSaleProductDto.stockLimit,
        }),
        ...(updateFlashSaleProductDto.soldCount !== undefined && {
          soldCount: updateFlashSaleProductDto.soldCount,
        }),
      })
      .where(
        and(
          eq(flashSaleProducts.id, itemId),
          eq(flashSaleProducts.flashSaleId, flashSaleId),
        ),
      )
      .returning({ id: flashSaleProducts.id });

    if (!item) {
      throw new NotFoundException(
        `Flash sale product #${itemId} not found in flash sale #${flashSaleId}`,
      );
    }

    return this.findOneAdmin(flashSaleId);
  }

  async removeProduct(flashSaleId: string, itemId: string) {
    await this.ensureFlashSaleExists(flashSaleId);

    const [item] = await this.db
      .delete(flashSaleProducts)
      .where(
        and(
          eq(flashSaleProducts.id, itemId),
          eq(flashSaleProducts.flashSaleId, flashSaleId),
        ),
      )
      .returning({ id: flashSaleProducts.id });

    if (!item) {
      throw new NotFoundException(
        `Flash sale product #${itemId} not found in flash sale #${flashSaleId}`,
      );
    }

    return this.findOneAdmin(flashSaleId);
  }

  private async insertProducts(
    flashSaleId: string,
    items: CreateFlashSaleProductDto[],
  ) {
    await this.db.insert(flashSaleProducts).values(
      items.map((item) => ({
        flashSaleId,
        productId: item.productId,
        flashPrice: item.flashPrice,
        stockLimit: item.stockLimit,
        soldCount: item.soldCount ?? 0,
      })),
    );
  }
}
