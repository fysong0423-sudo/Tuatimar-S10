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
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_products_asin").on(table.asin)],
);

export const manualKeywordRanks = sqliteTable(
  "manual_keyword_ranks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotDate: text("snapshot_date").notNull(),
    keyword: text("keyword").notNull(),
    rank: integer("rank"),
    page: integer("page"),
    status: text("status").notNull(),
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_manual_keyword_date_keyword").on(table.snapshotDate, table.keyword),
    index("idx_manual_keyword_date").on(table.snapshotDate),
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
