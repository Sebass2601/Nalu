ALTER TABLE "user_course_access" ADD COLUMN "grantedBy" uuid;--> statement-breakpoint
ALTER TABLE "user_course_access" ADD CONSTRAINT "user_course_access_grantedBy_users_id_fk" FOREIGN KEY ("grantedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_course_access_courseId_idx" ON "user_course_access" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX "user_course_access_grantedBy_idx" ON "user_course_access" USING btree ("grantedBy");