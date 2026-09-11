import {
  decimal,
  index,
  integer,
  pgTable,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema.js';

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantName: varchar('variant_name', { length: 100 }).notNull(),
    priceAdjustment: decimal('price_adjustment', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    stock: integer('stock').default(0).notNull(),
    sku: varchar('sku', { length: 50 }).notNull().unique(),
  },
  (table) => [index('product_variants_product_id_idx').on(table.productId)],
);
