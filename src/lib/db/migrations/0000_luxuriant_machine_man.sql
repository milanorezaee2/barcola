CREATE TYPE "public"."artist_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('sale', 'commission', 'payout', 'adjustment', 'refund');--> statement-breakpoint
CREATE TYPE "public"."listing_kind" AS ENUM('pattern', 'product');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'fulfilled', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'artist', 'admin');--> statement-breakpoint
CREATE TABLE "artist_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name_fa" text NOT NULL,
	"display_name_en" text NOT NULL,
	"profession_fa" text DEFAULT '' NOT NULL,
	"profession_en" text DEFAULT '' NOT NULL,
	"bio_fa" text DEFAULT '' NOT NULL,
	"bio_en" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"cover" text DEFAULT '' NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"status" "artist_status" DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"type" "ledger_type" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'fa' NOT NULL,
	"order_item_id" uuid,
	"payout_id" uuid,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"kind" "listing_kind" NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"title_fa" text NOT NULL,
	"title_en" text NOT NULL,
	"description_fa" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"image" text NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_slug" text DEFAULT '' NOT NULL,
	"price_fa" integer NOT NULL,
	"price_en" integer NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"listing_id" uuid,
	"artist_id" uuid,
	"title" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"unit_price" integer NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"line_total" integer NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"commission_amount" integer DEFAULT 0 NOT NULL,
	"artist_earning" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"shipping_address" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'fa' NOT NULL,
	"total_amount" integer NOT NULL,
	"status" "order_status" DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'fa' NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"method" text DEFAULT 'bank_transfer' NOT NULL,
	"destination" text DEFAULT '' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artist_profiles_user_unique" ON "artist_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artist_profiles_slug_unique" ON "artist_profiles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_unique" ON "listings" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_sku_unique" ON "listings" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));