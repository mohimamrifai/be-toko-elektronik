import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { orderItems } from './orders.schema.js';
import { users } from './users.schema.js';

export const claimTypeEnum = pgEnum('claim_type', ['warranty', 'return']);

export const claimStatusEnum = pgEnum('claim_status', [
  'submitted',
  'reviewing',
  'approved',
  'rejected',
  'completed',
]);

export const claims = pgTable(
  'claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: claimTypeEnum('type').notNull(),
    reason: text('reason').notNull(),
    proofImageUrl: varchar('proof_image_url', { length: 255 }),
    status: claimStatusEnum('status').default('submitted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('claims_user_id_idx').on(table.userId),
    index('claims_order_item_id_idx').on(table.orderItemId),
  ],
);
