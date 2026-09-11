import '../load-env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
import { promoSliders } from './schema/promo-sliders.schema.js';
import { topBanners } from './schema/top-banners.schema.js';
import { seedCatalog } from './seeds/catalog.seed.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema, casing: 'snake_case' });

async function seedTopBanners() {
  const existing = await db.select({ id: topBanners.id }).from(topBanners).limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(topBanners).values([
    {
      message: '🚀 Free shipping on orders over $50!',
      href: '/promo/free-shipping',
      isActive: true,
      sortOrder: 1,
    },
    {
      message: '⚡ Flash Sale hingga 70% — hanya hari ini!',
      href: '/promo/flash-sale',
      isActive: true,
      sortOrder: 2,
    },
  ]);
}

async function seedPromoSliders() {
  const existing = await db
    .select({ id: promoSliders.id })
    .from(promoSliders)
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(promoSliders).values([
    {
      title: 'Promo Handphone',
      imageUrl: 'https://placehold.co/800x400/png?text=Promo+Handphone',
      href: '/handphone',
      isActive: true,
      sortOrder: 1,
    },
    {
      title: 'Promo Laptop',
      imageUrl: 'https://placehold.co/800x400/png?text=Promo+Laptop',
      href: '/categories/laptop',
      isActive: true,
      sortOrder: 2,
    },
    {
      title: 'Promo Aksesoris',
      imageUrl: 'https://placehold.co/800x400/png?text=Promo+Aksesoris',
      href: '/categories/aksesoris',
      isActive: true,
      sortOrder: 3,
    },
  ]);
}

async function seed() {
  await seedTopBanners();
  await seedPromoSliders();
  await seedCatalog(db);
  console.log('Seed completed');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
