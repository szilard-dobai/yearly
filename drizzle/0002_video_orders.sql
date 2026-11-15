CREATE TABLE "video_credit" (
	"email" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_order" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pack" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"polar_checkout_id" text,
	"polar_order_id" text,
	"amount_cents" integer,
	"currency" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	CONSTRAINT "video_order_polar_order_id_unique" UNIQUE("polar_order_id")
);
--> statement-breakpoint
CREATE TABLE "video_render" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"status" text NOT NULL,
	"workflow_run_id" text,
	"files" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "video_render_version" UNIQUE("order_id","version")
);
--> statement-breakpoint
ALTER TABLE "video_order" ADD CONSTRAINT "video_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_render" ADD CONSTRAINT "video_render_order_id_video_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."video_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_order_user_idx" ON "video_order" USING btree ("user_id");