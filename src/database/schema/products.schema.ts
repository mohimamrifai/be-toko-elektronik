import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { brands } from './brands.schema.js';
import { categories } from './categories.schema.js';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    description: text('description'),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    discountPrice: decimal('discount_price', { precision: 12, scale: 2 }),
    stock: integer('stock').default(0).notNull(),
    sku: varchar('sku', { length: 50 }).notNull().unique(),
    warrantyMonths: integer('warranty_months'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('products_category_id_idx').on(table.categoryId),
    index('products_brand_id_idx').on(table.brandId),
  ],
);
