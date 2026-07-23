CREATE TYPE "public"."lesson_type" AS ENUM('video', 'text');--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "youtubeVideoId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "type" "lesson_type" DEFAULT 'video' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "content" text;