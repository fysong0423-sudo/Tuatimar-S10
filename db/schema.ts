import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    asin: text("asin").notNull(),
    market: text("market").notNull().default("Amazon US"),
    zip: text("zip").notNull().default("90001"),
    amazonUrl: text("amazon_url").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_products_asin").on(table.asin)],
);

export const monitoredKeywords = sqliteTable(
  "monitored_keywords",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productAsin: text("product_asin").notNull(),
    keyword: text("keyword").notNull(),
    source: text("source").notNull().default("团队新增词"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_monitored_keywords_asin_keyword").on(table.productAsin, table.keyword),
    index("idx_monitored_keywords_active_asin").on(table.isActive, table.productAsin),
  ],
);

export const manualKeywordRanks = sqliteTable(
  "manual_keyword_ranks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotDate: text("snapshot_date").notNull(),
    productAsin: text("product_asin").notNull().default("B0GGTPHQZK"),
    keyword: text("keyword").notNull(),
    rank: integer("rank"),
    page: integer("page"),
    status: text("status").notNull(),
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_manual_keyword_date_asin_keyword").on(table.snapshotDate, table.productAsin, table.keyword),
    index("idx_manual_keyword_date").on(table.snapshotDate),
  ],
);

export const refreshJobs = sqliteTable(
  "refresh_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productAsin: text("product_asin").notNull(),
    status: text("status").notNull().default("queued"),
    message: text("message"),
    requestedByUserId: text("requested_by_user_id").notNull(),
    requestedByEmail: text("requested_by_email").notNull(),
    requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("idx_refresh_jobs_asin_requested").on(table.productAsin, table.requestedAt),
    index("idx_refresh_jobs_status").on(table.status),
  ],
);

export const dailySales = sqliteTable(
  "daily_sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    salesDate: text("sales_date").notNull(),
    productAsin: text("product_asin").notNull(),
    units: integer("units").notNull().default(0),
    revenueCents: integer("revenue_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    source: text("source").notNull().default("manual"),
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_daily_sales_date_asin").on(table.salesDate, table.productAsin),
    index("idx_daily_sales_date").on(table.salesDate),
  ],
);

export const manualBsrEntries = sqliteTable(
  "manual_bsr_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotDate: text("snapshot_date").notNull(),
    asin: text("asin").notNull(),
    bsr: integer("bsr").notNull(),
    category: text("category").notNull(),
    zip: text("zip").notNull().default("90001"),
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_manual_bsr_date_asin").on(table.snapshotDate, table.asin),
    index("idx_manual_bsr_date").on(table.snapshotDate),
  ],
);
