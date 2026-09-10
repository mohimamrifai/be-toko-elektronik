import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const topBanners = pgTable('top_banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  message: varchar('message', { length: 255 }).notNull(),
  href: varchar('href', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
