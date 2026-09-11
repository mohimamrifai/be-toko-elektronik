import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { brands } from '../../src/database/schema/brands.schema.js';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
});

const db = drizzle(pool, { casing: 'snake_case' });

export async function seedBrandFixture(
  suffix = `${Date.now()}`,
  isActive = true,
) {
  const [brand] = await db
    .insert(brands)
    .values({
      name: `Brand ${suffix}`,
      slug: `brand-${suffix}`,
      logoUrl: `https://placehold.co/100x100/png?text=Brand+${suffix}`,
      isActive,
    })
    .returning({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      logoUrl: brands.logoUrl,
    });

  return brand;
}

export async function closeBrandSeedPool() {
  await pool.end();
}
