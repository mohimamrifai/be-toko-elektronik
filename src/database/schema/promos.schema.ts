import {
  decimal,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema.js';

export const promoDiscountTypeEnum = pgEnum('promo_discount_type', [
  'percentage',
  'fixed',
]);

export const promos = pgTable(
  'promos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 30 }).unique(),
    name: varchar('name', { length: 100 }).notNull(),
    discountType: promoDiscountTypeEnum('discount_type').notNull(),
    discountValue: decimal('discount_value', {
      precision: 12,
      scale: 2,
    }).notNull(),
    minPurchase: decimal('min_purchase', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('promos_code_idx').on(table.code)],
);

export const promoProducts = pgTable(
  'promo_products',
  {
    promoId: uuid('promo_id')
      .notNull()
      .references(() => promos.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.promoId, table.productId] }),
    index('promo_products_promo_id_idx').on(table.promoId),
    index('promo_products_product_id_idx').on(table.productId),
  ],
);
