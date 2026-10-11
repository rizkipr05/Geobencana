CREATE TABLE "ai_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"title" text NOT NULL,
	"provider" text DEFAULT 'GOOGLE_GEMINI' NOT NULL,
	"model_name" text DEFAULT 'gemini-1.5-flash' NOT NULL,
	"temperature" double precision DEFAULT 0.7 NOT NULL,
	"max_tokens" integer DEFAULT 2048 NOT NULL,
	"system_prompt" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_configs_module_unique" UNIQUE("module")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_email" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"api_key" text,
	"sync_interval_mins" integer DEFAULT 15 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'IDLE' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "disaster_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'alert-triangle' NOT NULL,
	"color" text DEFAULT '#ef4444' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disaster_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "disasters" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" integer,
	"external_id" text,
	"category_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location_name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"depth_km" double precision,
	"magnitude" double precision,
	"severity_level" text DEFAULT 'MEDIUM' NOT NULL,
	"radius_km" double precision DEFAULT 10 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"verified_status" text DEFAULT 'VERIFIED' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "educational_contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'GUIDE' NOT NULL,
	"disaster_category_code" text,
	"summary" text,
	"body_markdown" text NOT NULL,
	"checklist_items" jsonb DEFAULT '[]'::jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"author_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "educational_contents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "simulation_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"disaster_type" text NOT NULL,
	"scenario_name" text NOT NULL,
	"description" text,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cascade_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"status" text NOT NULL,
	"items_fetched" integer DEFAULT 0 NOT NULL,
	"items_inserted" integer DEFAULT 0 NOT NULL,
	"items_updated" integer DEFAULT 0 NOT NULL,
	"items_duplicate" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"severity" text DEFAULT 'ERROR' NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'OPERATOR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disasters" ADD CONSTRAINT "disasters_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disasters" ADD CONSTRAINT "disasters_category_code_disaster_categories_code_fk" FOREIGN KEY ("category_code") REFERENCES "public"."disaster_categories"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "educational_contents" ADD CONSTRAINT "educational_contents_disaster_category_code_disaster_categories_code_fk" FOREIGN KEY ("disaster_category_code") REFERENCES "public"."disaster_categories"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "educational_contents" ADD CONSTRAINT "educational_contents_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;