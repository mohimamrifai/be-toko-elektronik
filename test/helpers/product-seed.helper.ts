import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { brands } from '../../src/database/schema/brands.schema.js';
import { categories } from '../../src/database/schema/categories.schema.js';
import { productImages } from '../../src/database/schema/product-images.schema.js';
import { productSpecifications } from '../../src/database/schema/product-specifications.schema.js';
import { productVariants } from '../../src/database/schema/product-variants.schema.js';
import { products } from '../../src/database/schema/products.schema.js';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
});

const db = drizzle(pool, { casing: 'snake_case' });

export interface SeededProductData {
  categoryId: string;
  brandId: string;
  productId: string;
  slug: string;
}

export async function seedProductFixture(
  suffix = `${Date.now()}`,
): Promise<SeededProductData> {
  const [category] = await db
    .insert(categories)
    .values({
      name: `Handphone ${suffix}`,
      slug: `handphone-${suffix}`,
      icon: 'Smartphone',
      isActive: true,
      sortOrder: 1,
    })
    .returning({ id: categories.id });

  const [brand] = await db
    .insert(brands)
    .values({
      name: `Samsung ${suffix}`,
      slug: `samsung-${suffix}`,
      logoUrl: 'https://placehold.co/100x100/png?text=Samsung',
      isActive: true,
    })
    .returning({ id: brands.id });

  const slug = `smartphone-flagship-${suffix}`;

  const [product] = await db
    .insert(products)
    .values({
      categoryId: category.id,
      brandId: brand.id,
      name: `Smartphone Flagship ${suffix}`,
      slug,
      description: 'Smartphone flagship dengan kamera terbaik.',
      price: '4299000',
      discountPrice: '3499000',
      stock: 25,
      sku: `SKU-${suffix}`,
      warrantyMonths: 12,
      isActive: true,
    })
    .returning({ id: products.id });

  await db.insert(productImages).values([
    {
      productId: product.id,
      imageUrl: 'https://placehold.co/600x600/png?text=Primary',
      isPrimary: true,
      sortOrder: 1,
    },
    {
      productId: product.id,
      imageUrl: 'https://placehold.co/600x600/png?text=Secondary',
      isPrimary: false,
      sortOrder: 2,
    },
  ]);

  await db.insert(productSpecifications).values([
    {
      productId: product.id,
      specKey: 'RAM',
      specValue: '8GB',
      sortOrder: 1,
    },
    {
      productId: product.id,
      specKey: 'Storage',
      specValue: '256GB',
      sortOrder: 2,
    },
  ]);

  await db.insert(productVariants).values({
    productId: product.id,
    variantName: 'Hitam - 256GB',
    priceAdjustment: '0',
    stock: 10,
    sku: `SKU-VAR-${suffix}`,
  });

  return {
    categoryId: category.id,
    brandId: brand.id,
    productId: product.id,
    slug,
  };
}

export async function closeProductSeedPool() {
  await pool.end();
}
