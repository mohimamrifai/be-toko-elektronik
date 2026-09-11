CREATE TABLE "promo_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(150) NOT NULL,
	"subtitle" text NOT NULL,
	"button_text" varchar(100) NOT NULL,
	"href" varchar(255) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"badge" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
