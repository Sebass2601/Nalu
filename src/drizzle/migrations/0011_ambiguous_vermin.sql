ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userId_unique";--> statement-breakpoint
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions" USING btree ("userId");