import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";

// --- USERS & ACCESS MANAGEMENT ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("OPERATOR"), // SUPER_ADMIN, ADMIN, OPERATOR, USER
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- DATA SOURCE INTEGRATIONS (BMKG, USGS, NASA, GDACS) ---
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // BMKG, USGS, NASA_EONET, GDACS
  name: text("name").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  apiKey: text("api_key"),
  syncIntervalMins: integer("sync_interval_mins").notNull().default(15),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("IDLE"), // IDLE, SYNCING, HEALTHY, DEGRADED, ERROR
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- DISASTER CATEGORIES ---
export const disasterCategories = pgTable("disaster_categories", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // EARTHQUAKE, TSUNAMI, FLOOD, VOLCANO, WILDFIRE, STORM
  name: text("name").notNull(),
  icon: text("icon").notNull().default("alert-triangle"),
  color: text("color").notNull().default("#ef4444"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- DISASTER EVENTS ---
export const disasters = pgTable("disasters", {
  id: text("id").primaryKey(), // Generated NanoID or UUID
  sourceId: integer("source_id").references(() => dataSources.id),
  externalId: text("external_id"), // Unique ID from remote source (e.g. usgs us7000xxxx)
  categoryCode: text("category_code").notNull().references(() => disasterCategories.code),
  title: text("title").notNull(),
  description: text("description"),
  locationName: text("location_name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  depthKm: doublePrecision("depth_km"),
  magnitude: doublePrecision("magnitude"),
  severityLevel: text("severity_level").notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH, CRITICAL
  radiusKm: doublePrecision("radius_km").notNull().default(10),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, WARNING, RESOLVED, FALSE_ALARM
  verifiedStatus: text("verified_status").notNull().default("VERIFIED"), // VERIFIED, PENDING, REJECTED
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- SYNCHRONIZATION LOGS ---
export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => dataSources.id),
  status: text("status").notNull(), // SUCCESS, FAILED, PARTIAL
  itemsFetched: integer("items_fetched").notNull().default(0),
  itemsInserted: integer("items_inserted").notNull().default(0),
  itemsUpdated: integer("items_updated").notNull().default(0),
  itemsDuplicate: integer("items_duplicate").notNull().default(0),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// --- AI MODEL CONFIGURATIONS ---
export const aiConfigs = pgTable("ai_configs", {
  id: serial("id").primaryKey(),
  module: text("module").notNull().unique(), // IMPACT_ANALYZER, DISASTER_ASSISTANT, EVACUATION_ASSISTANT, CASCADE_SIMULATOR
  title: text("title").notNull(),
  provider: text("provider").notNull().default("GOOGLE_GEMINI"), // GOOGLE_GEMINI, OPENAI, ANTHROPIC, LOCAL
  modelName: text("model_name").notNull().default("gemini-1.5-flash"),
  temperature: doublePrecision("temperature").notNull().default(0.7),
  maxTokens: integer("max_tokens").notNull().default(2048),
  systemPrompt: text("system_prompt").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- SIMULATION PRESETS ---
export const simulationPresets = pgTable("simulation_presets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  disasterType: text("disaster_type").notNull(), // EARTHQUAKE, TSUNAMI, VOLCANO, FLOOD
  scenarioName: text("scenario_name").notNull(),
  description: text("description"),
  parameters: jsonb("parameters").$type<Record<string, unknown>>().notNull().default({}),
  cascadeRules: jsonb("cascade_rules").$type<Record<string, unknown>>().notNull().default({}),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- EDUCATIONAL & SAFETY CONTENT ---
export const educationalContents = pgTable("educational_contents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull().default("GUIDE"), // GUIDE, ARTICLE, CHECKLIST, SOP
  disasterCategoryCode: text("disaster_category_code").references(() => disasterCategories.code),
  summary: text("summary"),
  bodyMarkdown: text("body_markdown").notNull(),
  checklistItems: jsonb("checklist_items").$type<Array<{ title: string; required: boolean }>>().default([]),
  isPublished: boolean("is_published").notNull().default(false),
  authorId: integer("author_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- AUDIT TRAIL / LOGS ---
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userEmail: text("user_email"),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, MANUAL_SYNC, CONFIG_UPDATE
  entityType: text("entity_type").notNull(), // DISASTER, DATA_SOURCE, AI_CONFIG, USER, CONTENT
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- SYSTEM ERRORS & MONITORING ---
export const systemErrors = pgTable("system_errors", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // SYNC_JOB, AI_SERVICE, API_ROUTE, DB_POOL
  severity: text("severity").notNull().default("ERROR"), // INFO, WARNING, ERROR, CRITICAL
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
