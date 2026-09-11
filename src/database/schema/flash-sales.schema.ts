import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema.js';

export const flashSales = pgTable('flash_sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const flashSaleProducts = pgTable(
  'flash_sale_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flashSaleId: uuid('flash_sale_id')
      .notNull()
      .references(() => flashSales.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    flashPrice: decimal('flash_price', { precision: 12, scale: 2 }).notNull(),
    stockLimit: integer('stock_limit').notNull(),
    soldCount: integer('sold_count').default(0).notNull(),
  },
  (table) => [
    unique('flash_sale_products_flash_sale_id_product_id_unique').on(
      table.flashSaleId,
      table.productId,
    ),
    index('flash_sale_products_flash_sale_id_idx').on(table.flashSaleId),
    index('flash_sale_products_product_id_idx').on(table.productId),
  ],
);
