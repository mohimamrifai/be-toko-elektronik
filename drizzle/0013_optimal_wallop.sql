CREATE TYPE "public"."claim_status" AS ENUM('submitted', 'reviewing', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('warranty', 'return');--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "claim_type" NOT NULL,
	"reason" text NOT NULL,
	"proof_image_url" varchar(255),
	"status" "claim_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_user_id_idx" ON "claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "claims_order_item_id_idx" ON "claims" USING btree ("order_item_id");