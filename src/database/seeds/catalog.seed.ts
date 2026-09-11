import { eq, sql } from 'drizzle-orm';
import type { Database } from '../database.types.js';
import { brands } from '../schema/brands.schema.js';
import { categories } from '../schema/categories.schema.js';
import { productImages } from '../schema/product-images.schema.js';
import { productSpecifications } from '../schema/product-specifications.schema.js';
import { productVariants } from '../schema/product-variants.schema.js';
import { products } from '../schema/products.schema.js';

type CategorySeed = {
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
};

type BrandSeed = {
  name: string;
  slug: string;
  logoUrl: string;
};

type ProductSpecificationSeed = {
  specKey: string;
  specValue: string;
};

type ProductVariantSeed = {
  variantName: string;
  priceAdjustment: string;
  stock: number;
  sku: string;
};

type ProductSeed = {
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  brandSlug: string;
  description: string;
  price: string;
  discountPrice?: string;
  stock: number;
  warrantyMonths: number;
  image: string;
  specifications: ProductSpecificationSeed[];
  variants?: ProductVariantSeed[];
};

const categorySeeds: CategorySeed[] = [
  { name: 'Handphone', slug: 'handphone', icon: 'Smartphone', sortOrder: 1 },
  { name: 'Laptop', slug: 'laptop', icon: 'Laptop', sortOrder: 2 },
  { name: 'Audio', slug: 'audio', icon: 'Headphones', sortOrder: 3 },
  { name: 'TV', slug: 'tv', icon: 'Tv', sortOrder: 4 },
  { name: 'Kamera', slug: 'kamera', icon: 'Camera', sortOrder: 5 },
  { name: 'Smartwatch', slug: 'smartwatch', icon: 'Watch', sortOrder: 6 },
  { name: 'Gaming', slug: 'gaming', icon: 'Gamepad2', sortOrder: 7 },
  {
    name: 'Rumah Tangga',
    slug: 'rumah-tangga',
    icon: 'Refrigerator',
    sortOrder: 8,
  },
  { name: 'Pendingin', slug: 'pendingin', icon: 'Fan', sortOrder: 9 },
  { name: 'Speaker', slug: 'speaker', icon: 'Speaker', sortOrder: 10 },
];

const brandSeeds: BrandSeed[] = [
  {
    name: 'Samsung',
    slug: 'samsung',
    logoUrl: 'https://placehold.co/100x100/png?text=Samsung',
  },
  {
    name: 'Apple',
    slug: 'apple',
    logoUrl: 'https://placehold.co/100x100/png?text=Apple',
  },
  {
    name: 'Xiaomi',
    slug: 'xiaomi',
    logoUrl: 'https://placehold.co/100x100/png?text=Xiaomi',
  },
  {
    name: 'Asus',
    slug: 'asus',
    logoUrl: 'https://placehold.co/100x100/png?text=Asus',
  },
  {
    name: 'Sony',
    slug: 'sony',
    logoUrl: 'https://placehold.co/100x100/png?text=Sony',
  },
  {
    name: 'Lenovo',
    slug: 'lenovo',
    logoUrl: 'https://placehold.co/100x100/png?text=Lenovo',
  },
  {
    name: 'JBL',
    slug: 'jbl',
    logoUrl: 'https://placehold.co/100x100/png?text=JBL',
  },
  {
    name: 'Canon',
    slug: 'canon',
    logoUrl: 'https://placehold.co/100x100/png?text=Canon',
  },
];

const productSeeds: ProductSeed[] = [
  {
    name: 'Smartphone Flagship 5G 128GB/8GB RAM',
    slug: 'smartphone-flagship-5g',
    sku: 'SKU-HP-001',
    categorySlug: 'handphone',
    brandSlug: 'samsung',
    description:
      'Smartphone flagship dengan koneksi 5G, layar AMOLED 120Hz, dan kamera 50MP.',
    price: '4299000',
    discountPrice: '3499000',
    stock: 42,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
    specifications: [
      { specKey: 'RAM', specValue: '8GB' },
      { specKey: 'Storage', specValue: '128GB' },
      { specKey: 'Layar', specValue: '6.7" AMOLED' },
    ],
    variants: [
      {
        variantName: 'Hitam - 128GB',
        priceAdjustment: '0',
        stock: 20,
        sku: 'SKU-HP-001-BLK',
      },
      {
        variantName: 'Putih - 256GB',
        priceAdjustment: '500000',
        stock: 12,
        sku: 'SKU-HP-001-WHT',
      },
    ],
  },
  {
    name: 'iPhone 15 Pro 256GB',
    slug: 'iphone-15-pro',
    sku: 'SKU-HP-002',
    categorySlug: 'handphone',
    brandSlug: 'apple',
    description: 'iPhone 15 Pro dengan chip A17 Pro dan kamera telephoto 3x.',
    price: '18999000',
    discountPrice: '17499000',
    stock: 18,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80',
    specifications: [
      { specKey: 'RAM', specValue: '8GB' },
      { specKey: 'Storage', specValue: '256GB' },
      { specKey: 'Chip', specValue: 'A17 Pro' },
    ],
  },
  {
    name: 'Xiaomi Redmi Note 13 Pro',
    slug: 'redmi-note-13-pro',
    sku: 'SKU-HP-003',
    categorySlug: 'handphone',
    brandSlug: 'xiaomi',
    description: 'HP mid-range dengan baterai besar dan fast charging 67W.',
    price: '3999000',
    discountPrice: '3299000',
    stock: 55,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1598327275664-d871498ce3be?w=600&q=80',
    specifications: [
      { specKey: 'RAM', specValue: '8GB' },
      { specKey: 'Storage', specValue: '256GB' },
      { specKey: 'Baterai', specValue: '5000mAh' },
    ],
  },
  {
    name: 'Laptop Ultrabook Core i5 Gen 12 SSD 512GB',
    slug: 'laptop-ultrabook-i5',
    sku: 'SKU-LP-001',
    categorySlug: 'laptop',
    brandSlug: 'asus',
    description: 'Laptop tipis untuk produktivitas harian dan kuliah.',
    price: '8999000',
    discountPrice: '7850000',
    stock: 20,
    warrantyMonths: 24,
    image:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
    specifications: [
      { specKey: 'Processor', specValue: 'Intel Core i5 Gen 12' },
      { specKey: 'RAM', specValue: '16GB' },
      { specKey: 'Storage', specValue: '512GB SSD' },
    ],
  },
  {
    name: 'MacBook Air M3 13 inch',
    slug: 'macbook-air-m3',
    sku: 'SKU-LP-002',
    categorySlug: 'laptop',
    brandSlug: 'apple',
    description: 'MacBook Air dengan chip Apple M3 dan baterai tahan lama.',
    price: '16999000',
    discountPrice: '15999000',
    stock: 12,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52be?w=600&q=80',
    specifications: [
      { specKey: 'Chip', specValue: 'Apple M3' },
      { specKey: 'RAM', specValue: '8GB' },
      { specKey: 'Storage', specValue: '256GB SSD' },
    ],
  },
  {
    name: 'Headphone Wireless Over-Ear ANC',
    slug: 'headphone-anc-wireless',
    sku: 'SKU-AU-001',
    categorySlug: 'audio',
    brandSlug: 'sony',
    description: 'Headphone noise cancelling untuk musik dan perjalanan.',
    price: '1299000',
    discountPrice: '899000',
    stock: 35,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    specifications: [
      { specKey: 'Driver', specValue: '40mm' },
      { specKey: 'ANC', specValue: 'Active Noise Cancelling' },
      { specKey: 'Baterai', specValue: '30 jam' },
    ],
  },
  {
    name: 'Smart TV 4K UHD 43 Inch Frameless',
    slug: 'smart-tv-43-4k',
    sku: 'SKU-TV-001',
    categorySlug: 'tv',
    brandSlug: 'samsung',
    description: 'Smart TV 4K dengan HDR10+ dan sistem operasi pintar.',
    price: '3800000',
    discountPrice: '3150000',
    stock: 16,
    warrantyMonths: 24,
    image:
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80',
    specifications: [
      { specKey: 'Ukuran', specValue: '43 inch' },
      { specKey: 'Resolusi', specValue: '4K UHD' },
      { specKey: 'HDR', specValue: 'HDR10+' },
    ],
  },
  {
    name: 'Sony Bravia OLED 55 inch',
    slug: 'sony-bravia-oled-55',
    sku: 'SKU-TV-002',
    categorySlug: 'tv',
    brandSlug: 'sony',
    description: 'TV OLED dengan kontras tinggi untuk pengalaman menonton premium.',
    price: '18999000',
    discountPrice: '17499000',
    stock: 8,
    warrantyMonths: 24,
    image:
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&q=80',
    specifications: [
      { specKey: 'Panel', specValue: 'OLED' },
      { specKey: 'Ukuran', specValue: '55 inch' },
      { specKey: 'Refresh Rate', specValue: '120Hz' },
    ],
  },
  {
    name: 'Kamera Mirrorless Kit Lens 16-50mm',
    slug: 'mirrorless-camera-kit',
    sku: 'SKU-CAM-001',
    categorySlug: 'kamera',
    brandSlug: 'canon',
    description: 'Kamera mirrorless ringan untuk fotografi dan vlogging.',
    price: '7200000',
    discountPrice: '6499000',
    stock: 10,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80',
    specifications: [
      { specKey: 'Sensor', specValue: 'APS-C' },
      { specKey: 'Lens', specValue: '16-50mm' },
      { specKey: 'Video', specValue: '4K 30fps' },
    ],
  },
  {
    name: 'Smartwatch AMOLED GPS & Blood Oxygen',
    slug: 'smartwatch-amoled-gps',
    sku: 'SKU-SW-001',
    categorySlug: 'smartwatch',
    brandSlug: 'samsung',
    description: 'Smartwatch dengan pelacakan kesehatan dan GPS built-in.',
    price: '1100000',
    discountPrice: '749000',
    stock: 48,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    specifications: [
      { specKey: 'Layar', specValue: '1.4" AMOLED' },
      { specKey: 'GPS', specValue: 'Ya' },
      { specKey: 'Baterai', specValue: '7 hari' },
    ],
  },
  {
    name: 'Mechanical Keyboard RGB Hot-swappable',
    slug: 'mechanical-keyboard-rgb',
    sku: 'SKU-GM-001',
    categorySlug: 'gaming',
    brandSlug: 'asus',
    description: 'Keyboard mekanikal gaming dengan switch hot-swappable.',
    price: '750000',
    discountPrice: '549000',
    stock: 60,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&q=80',
    specifications: [
      { specKey: 'Switch', specValue: 'Red Linear' },
      { specKey: 'Layout', specValue: 'TKL' },
      { specKey: 'RGB', specValue: 'Per-key' },
    ],
  },
  {
    name: 'Lenovo Legion Gaming Laptop RTX 4060',
    slug: 'lenovo-legion-gaming',
    sku: 'SKU-GM-002',
    categorySlug: 'gaming',
    brandSlug: 'lenovo',
    description: 'Laptop gaming dengan GPU RTX 4060 dan layar 165Hz.',
    price: '18999000',
    discountPrice: '17499000',
    stock: 9,
    warrantyMonths: 24,
    image:
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80',
    specifications: [
      { specKey: 'GPU', specValue: 'RTX 4060' },
      { specKey: 'RAM', specValue: '16GB' },
      { specKey: 'Storage', specValue: '1TB SSD' },
    ],
  },
  {
    name: 'Air Fryer Digital Low Watt 4 Liter',
    slug: 'air-fryer-digital-4l',
    sku: 'SKU-RT-001',
    categorySlug: 'rumah-tangga',
    brandSlug: 'xiaomi',
    description: 'Air fryer digital kapasitas 4 liter untuk memasak lebih sehat.',
    price: '950000',
    discountPrice: '620000',
    stock: 40,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80',
    specifications: [
      { specKey: 'Kapasitas', specValue: '4 Liter' },
      { specKey: 'Daya', specValue: '1200W' },
      { specKey: 'Panel', specValue: 'Digital Touch' },
    ],
  },
  {
    name: 'AC Inverter 1 PK Hemat Energi',
    slug: 'ac-inverter-1pk',
    sku: 'SKU-PD-001',
    categorySlug: 'pendingin',
    brandSlug: 'samsung',
    description: 'AC inverter 1 PK dengan mode hemat energi dan pendinginan cepat.',
    price: '4999000',
    discountPrice: '4299000',
    stock: 14,
    warrantyMonths: 36,
    image:
      'https://images.unsplash.com/photo-1631545806609-8f19f4e1f1c1?w=600&q=80',
    specifications: [
      { specKey: 'Kapasitas', specValue: '1 PK' },
      { specKey: 'Tipe', specValue: 'Inverter' },
      { specKey: 'Filter', specValue: 'Anti Bakteri' },
    ],
  },
  {
    name: 'JBL Portable Speaker Bass Boost',
    slug: 'jbl-portable-speaker',
    sku: 'SKU-SP-001',
    categorySlug: 'speaker',
    brandSlug: 'jbl',
    description: 'Speaker bluetooth portable dengan bass boost dan IPX7.',
    price: '899000',
    discountPrice: '649000',
    stock: 52,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
    specifications: [
      { specKey: 'Output', specValue: '20W' },
      { specKey: 'Bluetooth', specValue: '5.3' },
      { specKey: 'Waterproof', specValue: 'IPX7' },
    ],
  },
  {
    name: 'Xiaomi Pad 6 Tablet 11 inch',
    slug: 'xiaomi-pad-6',
    sku: 'SKU-HP-004',
    categorySlug: 'handphone',
    brandSlug: 'xiaomi',
    description: 'Tablet 11 inch untuk hiburan, belajar, dan produktivitas ringan.',
    price: '4999000',
    discountPrice: '4299000',
    stock: 22,
    warrantyMonths: 12,
    image:
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
    specifications: [
      { specKey: 'Layar', specValue: '11" 2.8K' },
      { specKey: 'RAM', specValue: '8GB' },
      { specKey: 'Storage', specValue: '256GB' },
    ],
  },
];

async function upsertCategories(db: Database) {
  const categoryMap = new Map<string, string>();

  for (const category of categorySeeds) {
    const [row] = await db
      .insert(categories)
      .values({
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: sql`excluded.name`,
          icon: sql`excluded.icon`,
          sortOrder: sql`excluded.sort_order`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: categories.id, slug: categories.slug });

    categoryMap.set(row.slug, row.id);
  }

  return categoryMap;
}

async function upsertBrands(db: Database) {
  const brandMap = new Map<string, string>();

  for (const brand of brandSeeds) {
    const [row] = await db
      .insert(brands)
      .values({
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: brands.slug,
        set: {
          name: sql`excluded.name`,
          logoUrl: sql`excluded.logo_url`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: brands.id, slug: brands.slug });

    brandMap.set(row.slug, row.id);
  }

  return brandMap;
}

async function syncProductChildren(
  db: Database,
  productId: string,
  product: ProductSeed,
) {
  await db
    .delete(productImages)
    .where(eq(productImages.productId, productId));
  await db
    .delete(productSpecifications)
    .where(eq(productSpecifications.productId, productId));
  await db
    .delete(productVariants)
    .where(eq(productVariants.productId, productId));

  await db.insert(productImages).values([
    {
      productId,
      imageUrl: product.image,
      isPrimary: true,
      sortOrder: 1,
    },
  ]);

  if (product.specifications.length > 0) {
    await db.insert(productSpecifications).values(
      product.specifications.map((specification, index) => ({
        productId,
        specKey: specification.specKey,
        specValue: specification.specValue,
        sortOrder: index + 1,
      })),
    );
  }

  if (product.variants && product.variants.length > 0) {
    await db.insert(productVariants).values(
      product.variants.map((variant) => ({
        productId,
        variantName: variant.variantName,
        priceAdjustment: variant.priceAdjustment,
        stock: variant.stock,
        sku: variant.sku,
      })),
    );
  }
}

async function upsertProducts(
  db: Database,
  categoryMap: Map<string, string>,
  brandMap: Map<string, string>,
) {
  for (const product of productSeeds) {
    const categoryId = categoryMap.get(product.categorySlug);
    const brandId = brandMap.get(product.brandSlug);

    if (!categoryId || !brandId) {
      throw new Error(
        `Missing category or brand for product "${product.slug}"`,
      );
    }

    const [row] = await db
      .insert(products)
      .values({
        categoryId,
        brandId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        discountPrice: product.discountPrice,
        stock: product.stock,
        sku: product.sku,
        warrantyMonths: product.warrantyMonths,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          categoryId: sql`excluded.category_id`,
          brandId: sql`excluded.brand_id`,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          price: sql`excluded.price`,
          discountPrice: sql`excluded.discount_price`,
          stock: sql`excluded.stock`,
          sku: sql`excluded.sku`,
          warrantyMonths: sql`excluded.warranty_months`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: products.id });

    await syncProductChildren(db, row.id, product);
  }
}

export async function seedCatalog(db: Database) {
  const categoryMap = await upsertCategories(db);
  const brandMap = await upsertBrands(db);
  await upsertProducts(db, categoryMap, brandMap);

  console.log(
    `Catalog seed completed: ${categorySeeds.length} categories, ${brandSeeds.length} brands, ${productSeeds.length} products`,
  );
}
