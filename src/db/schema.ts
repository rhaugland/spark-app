import { pgTable, uuid, varchar, date, timestamp, text, boolean, jsonb } from "drizzle-orm/pg-core";

export const friends = pgTable("friends", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  birthday: date("birthday"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interests = pgTable("interests", {
  id: uuid("id").defaultRandom().primaryKey(),
  friendId: uuid("friend_id")
    .notNull()
    .references(() => friends.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }),
});

export const listeners = pgTable("listeners", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: varchar("source", { length: 50 }).notNull(),
  sourceId: varchar("source_id", { length: 100 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  config: jsonb("config"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
