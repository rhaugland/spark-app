import { pgTable, uuid, varchar, date, timestamp, text, integer } from "drizzle-orm/pg-core";

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

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  detail: text("detail"),
  category: varchar("category", { length: 50 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  time: varchar("time", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
