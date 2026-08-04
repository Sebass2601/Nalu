ALTER TABLE "categories" ADD COLUMN "doorway" text;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_doorway_unique" ON "categories" USING btree ("doorway") WHERE "categories"."doorway" is not null;--> statement-breakpoint
-- Carry over the three doorways that were pinned in the homepage's source, so
-- the castle looks exactly the same the moment this runs. Every other category
-- starts with no doorway and has to be given one from the admin panel; until
-- then it is reachable through /products but not through the castle.
--
-- An id that no longer exists updates nothing, which is the intended outcome:
-- a category that was deleted since has no doorway to inherit.
UPDATE "categories" SET "doorway" = '2' WHERE "id" = '910db7e6-b0f7-4148-9f03-e02dca7286d7';--> statement-breakpoint
UPDATE "categories" SET "doorway" = '3' WHERE "id" = 'b6bb2614-39e4-43cc-9796-4e3602805e6f';--> statement-breakpoint
UPDATE "categories" SET "doorway" = '9' WHERE "id" = '0f077991-d335-46f2-86c1-4bca3e4cea37';