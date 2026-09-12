import { and, eq, inArray, like, ne, notInArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { brands } from '../../src/database/schema/brands.schema.js';
import { categories } from '../../src/database/schema/categories.schema.js';
import { productImages } from '../../src/database/schema/product-images.schema.js';
import { productSpecifications } from '../../src/database/schema/product-specifications.schema.js';
import { productVariants } from '../../src/database/schema/product-variants.schema.js';
import { products } from '../../src/database/schema/products.schema.js';
import { promoSliders } from '../../src/database/schema/promo-sliders.schema.js';
import type { SeededProductData } from './product-seed.helper.js';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
});

const db = drizzle(pool, { casing: 'snake_case' });

const CATALOG_CATEGORY_SLUGS = [
  'handphone',
  'laptop',
  'audio',
  'tv',
  'kamera',
  'smartwatch',
  'gaming',
  'rumah-tangga',
  'pendingin',
  'speaker',
];

const CATALOG_BRAND_SLUGS = [
  'samsung',
  'apple',
  'xiaomi',
  'asus',
  'sony',
  'lenovo',
  'jbl',
  'canon',
];

const SEED_PROMO_SLIDER_TITLES = [
  'Promo Handphone',
  'Promo Laptop',
  'Promo Aksesoris',
];

export async function cleanupProductFixture(data: SeededProductData) {
  await db
    .delete(productVariants)
    .where(eq(productVariants.productId, data.productId));
  await db
    .delete(productSpecifications)
    .where(eq(productSpecifications.productId, data.productId));
  await db
    .delete(productImages)
    .where(eq(productImages.productId, data.productId));
  await db.delete(products).where(eq(products.id, data.productId));
  await db.delete(categories).where(eq(categories.id, data.categoryId));
  await db.delete(brands).where(eq(brands.id, data.brandId));
}

export async function cleanupBrandById(brandId: string) {
  await db.delete(brands).where(eq(brands.id, brandId));
}

export async function purgeE2eArtifactsFromDatabase() {
  const testProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        like(products.slug, 'smartphone-flagship-%'),
        ne(products.slug, 'smartphone-flagship-5g'),
      ),
    );

  const testProductIds = testProducts.map((product) => product.id);

  if (testProductIds.length > 0) {
    await db
      .delete(productVariants)
      .where(inArray(productVariants.productId, testProductIds));
    await db
      .delete(productSpecifications)
      .where(inArray(productSpecifications.productId, testProductIds));
    await db
      .delete(productImages)
      .where(inArray(productImages.productId, testProductIds));
    await db.delete(products).where(inArray(products.id, testProductIds));
  }

  await db
    .delete(categories)
    .where(notInArray(categories.slug, CATALOG_CATEGORY_SLUGS));

  await db
    .delete(brands)
    .where(notInArray(brands.slug, CATALOG_BRAND_SLUGS));

  await db
    .delete(promoSliders)
    .where(notInArray(promoSliders.title, SEED_PROMO_SLIDER_TITLES));
}

export async function closeE2eArtifactCleanupPool() {
  await pool.end();
}

if (import.meta.main) {
  purgeE2eArtifactsFromDatabase()
    .then(() => {
      console.log('E2E artifacts purged');
    })
    .catch((error) => {
      console.error('Failed to purge E2E artifacts:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeE2eArtifactCleanupPool();
    });
}
