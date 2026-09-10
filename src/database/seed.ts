import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { topBanners } from './schema/top-banners.schema.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: 'snake_case' });

async function seed() {
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
