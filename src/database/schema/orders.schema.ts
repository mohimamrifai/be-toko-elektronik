import {
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { addresses } from './addresses.schema.js';
import { productVariants } from './product-variants.schema.js';
import { products } from './products.schema.js';
import { users } from './users.schema.js';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
]);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    orderNumber: varchar('order_number', { length: 30 }).notNull().unique(),
    shippingAddressId: uuid('shipping_address_id')
      .notNull()
      .references(() => addresses.id),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    courier: varchar('courier', { length: 50 }),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('orders_user_id_idx').on(table.userId),
    index('orders_order_number_idx').on(table.orderNumber),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    productName: varchar('product_name', { length: 200 }).notNull(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    index('order_items_product_id_idx').on(table.productId),
  ],
);

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('order_status_history_order_id_idx').on(table.orderId)],
);
