-- Stripe -> Hotmart, with provider-neutral column names.
--
-- THIS MIGRATION REQUIRES `purchases` AND `subscriptions` TO BE EMPTY.
-- Three columns are added NOT NULL with no default, and the subscription status
-- enum is replaced outright with a vocabulary that shares no value with the old
-- one — so the `USING status::subscription_status` cast below would reject any
-- surviving row. Both tables held zero rows in every environment when this was
-- written, which is the whole reason the provider change was cheap.
--
-- Column values are deliberately NOT carried across. `stripeProductId` and
-- friends are dropped rather than renamed: a Stripe identifier sitting in a
-- column named for Hotmart is a trap that only springs later, when something
-- hands Hotmart an ID it has never heard of.
CREATE TABLE "processed_webhooks" (
	"eventId" text PRIMARY KEY NOT NULL,
	"eventType" text NOT NULL,
	"processedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "countries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "country_groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "countries" CASCADE;--> statement-breakpoint
DROP TABLE "country_groups" CASCADE;--> statement-breakpoint
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_stripeSessionId_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_stripeSubscriptionId_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_stripeCustomerId_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."subscription_status";--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'INACTIVE', 'DELAYED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_ADMIN', 'STARTED', 'OVERDUE');--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE "public"."subscription_status" USING "status"::"public"."subscription_status";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "externalProductId" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "checkoutCode" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "externalOfferCode" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "promoOfferCode" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "promoPriceInDollars" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "promoEndsAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "orderId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "buyerCountry" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "externalSubscriptionId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "externalProductId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "stripeProductId";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "stripePriceId";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "stripeSessionId";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "stripePaymentIntentId";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "stripeCustomerId";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "stripeSubscriptionId";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "stripePriceId";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stripeCustomerId";--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_orderId_unique" UNIQUE("orderId");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_externalSubscriptionId_unique" UNIQUE("externalSubscriptionId");