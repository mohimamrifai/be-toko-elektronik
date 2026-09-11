CREATE TABLE "flash_sale_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flash_sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"flash_price" numeric(12, 2) NOT NULL,
	"stock_limit" integer NOT NULL,
	"sold_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "flash_sale_products_flash_sale_id_product_id_unique" UNIQUE("flash_sale_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "flash_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flash_sale_products" ADD CONSTRAINT "flash_sale_products_flash_sale_id_flash_sales_id_fk" FOREIGN KEY ("flash_sale_id") REFERENCES "public"."flash_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flash_sale_products" ADD CONSTRAINT "flash_sale_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flash_sale_products_flash_sale_id_idx" ON "flash_sale_products" USING btree ("flash_sale_id");--> statement-breakpoint
CREATE INDEX "flash_sale_products_product_id_idx" ON "flash_sale_products" USING btree ("product_id");