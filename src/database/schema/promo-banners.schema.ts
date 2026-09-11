import {
  boolean,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const promoBanners = pgTable('promo_banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 150 }).notNull(),
  subtitle: text('subtitle').notNull(),
  buttonText: varchar('button_text', { length: 100 }).notNull(),
  href: varchar('href', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  badge: varchar('badge', { length: 100 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});
