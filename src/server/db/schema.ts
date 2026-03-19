import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  boolean,
  index,
  primaryKey,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const recipeStatusEnum = pgEnum("recipe_status", [
  "draft",
  "published",
  "archived",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    cuisine: text("cuisine"),
    status: recipeStatusEnum("status").notNull().default("draft"),
    coverImageUrl: text("cover_image_url"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    transcript: text("transcript"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("recipes_user_id_idx").on(t.userId),
    index("recipes_created_at_idx").on(t.createdAt),
    index("recipes_status_idx").on(t.status),
  ]
);

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  notes: text("notes"),
  lowConfidence: boolean("low_confidence").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
});

export const steps = pgTable("steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  instruction: text("instruction").notNull(),
  durationMinutes: integer("duration_minutes"),
  timerRequired: boolean("timer_required").notNull().default(false),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const recipeTags = pgTable(
  "recipe_tags",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.tagId] })]
);

export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })]
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_recipe_id_idx").on(t.recipeId)]
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_id_idx").on(t.followingId),
  ]
);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull(),
  url: text("url").notNull(),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipes),
  likes: many(likes),
  comments: many(comments),
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, { fields: [recipes.userId], references: [users.id] }),
  ingredients: many(ingredients),
  steps: many(steps),
  tags: many(recipeTags),
  likes: many(likes),
  comments: many(comments),
  media: many(media),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  recipe: one(recipes, { fields: [steps.recipeId], references: [recipes.id] }),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, { fields: [recipeTags.tagId], references: [tags.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  recipes: many(recipeTags),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  recipe: one(recipes, { fields: [likes.recipeId], references: [recipes.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  recipe: one(recipes, {
    fields: [comments.recipeId],
    references: [recipes.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  recipe: one(recipes, { fields: [media.recipeId], references: [recipes.id] }),
}));
