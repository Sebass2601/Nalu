CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"countryGroupId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "country_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"recommendedDiscountPercentage" real,
	"stripeCouponId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "country_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_countryGroupId_country_groups_id_fk" FOREIGN KEY ("countryGroupId") REFERENCES "public"."country_groups"("id") ON DELETE restrict ON UPDATE no action;