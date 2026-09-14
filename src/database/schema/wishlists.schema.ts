import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema.js';
import { users } from './users.schema.js';

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('wishlists_user_id_idx').on(table.userId),
    index('wishlists_product_id_idx').on(table.productId),
    uniqueIndex('wishlists_user_product_unique').on(
      table.userId,
      table.productId,
    ),
  ],
);
