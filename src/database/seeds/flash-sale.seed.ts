import { eq, inArray } from 'drizzle-orm';
import type { Database } from '../database.types.js';
import {
  flashSaleProducts,
  flashSales,
} from '../schema/flash-sales.schema.js';
import { products } from '../schema/products.schema.js';

export const SEED_FLASH_SALE_NAME = 'Flash Sale Spesial Elektronik';

const FLASH_SALE_PRODUCT_SEEDS = [
  {
    slug: 'smartphone-flagship-5g',
    flashPrice: '2999000',
    stockLimit: 30,
    soldCount: 12,
  },
  {
    slug: 'iphone-15-pro',
    flashPrice: '15999000',
    stockLimit: 15,
    soldCount: 5,
  },
  {
    slug: 'redmi-note-13-pro',
    flashPrice: '2799000',
    stockLimit: 40,
    soldCount: 18,
  },
  {
    slug: 'laptop-ultrabook-i5',
    flashPrice: '6999000',
    stockLimit: 20,
    soldCount: 8,
  },
  {
    slug: 'macbook-air-m3',
    flashPrice: '14999000',
    stockLimit: 10,
    soldCount: 3,
  },
  {
    slug: 'headphone-anc-wireless',
    flashPrice: '749000',
    stockLimit: 25,
    soldCount: 11,
  },
] as const;

function getActiveWindow() {
  const now = new Date();

  return {
    startsAt: new Date(now.getTime() - 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  };
}

export async function seedFlashSale(db: Database) {
  const [existing] = await db
    .select({ id: flashSales.id })
    .from(flashSales)
    .where(eq(flashSales.name, SEED_FLASH_SALE_NAME))
    .limit(1);

  if (existing) {
    await ensureSeedFlashSaleActive(db);
    return;
  }

  const productSlugs = FLASH_SALE_PRODUCT_SEEDS.map((item) => item.slug);
  const catalogProducts = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(inArray(products.slug, [...productSlugs]));

  if (catalogProducts.length === 0) {
    console.warn('Flash sale seed skipped: catalog products not found');
    return;
  }

  const productIdBySlug = new Map(
    catalogProducts.map((product) => [product.slug, product.id]),
  );

  const window = getActiveWindow();

  const [flashSale] = await db
    .insert(flashSales)
    .values({
      name: SEED_FLASH_SALE_NAME,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      isActive: true,
    })
    .returning({ id: flashSales.id });

  const items = FLASH_SALE_PRODUCT_SEEDS.flatMap((item) => {
    const productId = productIdBySlug.get(item.slug);

    if (!productId) {
      return [];
    }

    return [
      {
        flashSaleId: flashSale.id,
        productId,
        flashPrice: item.flashPrice,
        stockLimit: item.stockLimit,
        soldCount: item.soldCount,
      },
    ];
  });

  if (items.length === 0) {
    await db.delete(flashSales).where(eq(flashSales.id, flashSale.id));
    return;
  }

  await db.insert(flashSaleProducts).values(items);
}

export async function ensureSeedFlashSaleActive(db: Database) {
  const [existing] = await db
    .select({ id: flashSales.id })
    .from(flashSales)
    .where(eq(flashSales.name, SEED_FLASH_SALE_NAME))
    .limit(1);

  if (!existing) {
    return;
  }

  const window = getActiveWindow();

  await db
    .update(flashSales)
    .set({
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      isActive: true,
    })
    .where(eq(flashSales.id, existing.id));
}
