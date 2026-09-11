import { index, integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { products } from './products.schema.js';

export const productSpecifications = pgTable(
  'product_specifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    specKey: varchar('spec_key', { length: 100 }).notNull(),
    specValue: varchar('spec_value', { length: 255 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('product_specifications_product_id_idx').on(table.productId),
  ],
);
