CREATE TYPE "public"."promo_discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TABLE "promo_products" (
	"promo_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "promo_products_promo_id_product_id_pk" PRIMARY KEY("promo_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30),
	"name" varchar(100) NOT NULL,
	"discount_type" "promo_discount_type" NOT NULL,
	"discount_value" numeric(12, 2) NOT NULL,
	"min_purchase" numeric(12, 2) DEFAULT '0' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promos_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_id" uuid;--> statement-breakpoint
ALTER TABLE "promo_products" ADD CONSTRAINT "promo_products_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_products" ADD CONSTRAINT "promo_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promo_products_promo_id_idx" ON "promo_products" USING btree ("promo_id");--> statement-breakpoint
CREATE INDEX "promo_products_product_id_idx" ON "promo_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "promos_code_idx" ON "promos" USING btree ("code");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE set null ON UPDATE no action;