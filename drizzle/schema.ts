import {
  bigint,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** OAuth identifier (openId) returned from the auth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Partner access requests ───────────────────────────────────────────────────
// Phase 2: full intake schema matching sql/section01_partner_access_requests.sql

export const partnerAccessRequests = mysqlTable("partner_access_requests", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),

  createdAt: timestamp("created_at", { mode: "date", fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 3 }).defaultNow().onUpdateNow().notNull(),

  // Contact
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName:  varchar("last_name",  { length: 100 }).notNull(),
  firmName:  varchar("firm_name",  { length: 300 }).notNull(),
  email:     varchar("email",      { length: 320 }).notNull(),
  phone:     varchar("phone",      { length: 40  }).notNull(),
  website:   varchar("website",    { length: 500 }),

  // Practice details
  statesServed:        text("states_served").notNull(),
  practiceArea:        varchar("practice_area",         { length: 100 }).notNull(),
  monthlyLeadCapacity: varchar("monthly_lead_capacity", { length: 20  }).notNull(),

  // Free-form notes
  message: text("message"),

  // Workflow
  status: mysqlEnum("status", [
    "new",
    "reviewed",
    "approved",
    "declined",
    "contacted",
  ]).notNull().default("new"),

  source: varchar("source", { length: 100 }).notNull().default("legalintakeflow.com"),
});

export type PartnerAccessRequest = typeof partnerAccessRequests.$inferSelect;
export type InsertPartnerAccessRequest = typeof partnerAccessRequests.$inferInsert;
