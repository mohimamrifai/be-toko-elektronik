import '../load-env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
import { promoBanners } from './schema/promo-banners.schema.js';
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

async function seedPromoBanners() {
  const existing = await db
    .select({ id: promoBanners.id })
    .from(promoBanners)
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(promoBanners).values([
    {
      title: 'Diskon Spesial Akhir Bulan',
      subtitle:
        'Nikmati potongan harga hingga 50% untuk semua produk elektronik pilihan terbaik.',
      buttonText: 'Belanja Sekarang',
      href: '/categories',
      imageUrl:
        'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&q=80',
      badge: 'Promo Terbatas',
      isActive: true,
      sortOrder: 1,
    },
    {
      title: 'Gratis Ongkir Area Jabodetabek',
      subtitle:
        'Belanja minimal Rp500.000 dan nikmati pengiriman gratis untuk wilayah Jabodetabek.',
      buttonText: 'Cek Produk',
      href: '/products?sort=terbaru',
      imageUrl:
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
      badge: 'Gratis Ongkir',
      isActive: true,
      sortOrder: 2,
    },
  ]);
}

async function seed() {
  await seedTopBanners();
  await seedPromoSliders();
  await seedPromoBanners();
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
