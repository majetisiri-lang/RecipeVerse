import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/init";
import {
  recipes,
  ingredients,
  steps,
  tags,
  recipeTags,
  users,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

const ingredientInput = z.object({
  name: z.string().min(1),
  quantity: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lowConfidence: z.boolean().optional(),
  orderIndex: z.number().optional(),
});

const stepInput = z.object({
  stepNumber: z.number(),
  instruction: z.string().min(1),
  durationMinutes: z.number().nullable().optional(),
  timerRequired: z.boolean().optional(),
});

const recipeCreateInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  servings: z.number().optional(),
  prepTimeMinutes: z.number().optional(),
  cookTimeMinutes: z.number().optional(),
  cuisine: z.string().optional(),
  coverImageUrl: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  transcript: z.string().optional(),
  ingredients: z.array(ingredientInput).optional(),
  steps: z.array(stepInput).optional(),
  tags: z.array(z.string()).optional(),
  publish: z.boolean().optional(),
});

export const recipesRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const rows = await ctx.db.query.recipes.findMany({
        where: (r, { eq, and, lt }) =>
          and(
            eq(r.status, "published"),
            cursor ? lt(r.createdAt, new Date(cursor)) : undefined
          ),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        limit: limit + 1,
        with: { user: true, likes: true, media: true },
      });

      let nextCursor: string | undefined;
      if (rows.length > limit) {
        nextCursor = rows[limit]!.createdAt.toISOString();
        rows.pop();
      }
      return { items: rows, nextCursor };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.query.recipes.findFirst({
        where: (r, { eq }) => eq(r.id, input.id),
        with: {
          user: true,
          ingredients: { orderBy: (i, { asc }) => [asc(i.orderIndex)] },
          steps: { orderBy: (s, { asc }) => [asc(s.stepNumber)] },
          tags: { with: { tag: true } },
          likes: true,
          media: true,
          comments: { with: { user: true }, orderBy: (c, { asc }) => [asc(c.createdAt)] },
        },
      });
      if (!recipe) throw new TRPCError({ code: "NOT_FOUND" });
      return recipe;
    }),

  create: protectedProcedure
    .input(recipeCreateInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [recipe] = await tx
          .insert(recipes)
          .values({
            userId: ctx.dbUser.id,
            title: input.title,
            description: input.description,
            servings: input.servings,
            prepTimeMinutes: input.prepTimeMinutes,
            cookTimeMinutes: input.cookTimeMinutes,
            cuisine: input.cuisine,
            coverImageUrl: input.coverImageUrl,
            aiGenerated: input.aiGenerated ?? false,
            transcript: input.transcript,
            status: input.publish ? "published" : "draft",
          })
          .returning();

        if (input.ingredients?.length) {
          await tx.insert(ingredients).values(
            input.ingredients.map((ing, i) => ({
              recipeId: recipe.id,
              name: ing.name,
              quantity: ing.quantity ?? null,
              unit: ing.unit ?? null,
              notes: ing.notes ?? null,
              lowConfidence: ing.lowConfidence ?? false,
              orderIndex: ing.orderIndex ?? i,
            }))
          );
        }

        if (input.steps?.length) {
          await tx.insert(steps).values(
            input.steps.map((s) => ({
              recipeId: recipe.id,
              stepNumber: s.stepNumber,
              instruction: s.instruction,
              durationMinutes: s.durationMinutes ?? null,
              timerRequired: s.timerRequired ?? false,
            }))
          );
        }

        if (input.tags?.length) {
          for (const tagName of input.tags) {
            const slug = tagName.toLowerCase().replace(/\s+/g, "-");
            const [tag] = await tx
              .insert(tags)
              .values({ name: tagName, slug })
              .onConflictDoUpdate({ target: tags.slug, set: { name: tagName } })
              .returning();
            await tx
              .insert(recipeTags)
              .values({ recipeId: recipe.id, tagId: tag.id })
              .onConflictDoNothing();
          }
        }

        return recipe;
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        servings: z.number().optional(),
        prepTimeMinutes: z.number().optional(),
        cookTimeMinutes: z.number().optional(),
        cuisine: z.string().optional(),
        coverImageUrl: z.string().optional(),
        publish: z.boolean().optional(),
        ingredients: z.array(ingredientInput).optional(),
        steps: z.array(stepInput).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, input.id), eq(recipes.userId, ctx.dbUser.id)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(recipes)
          .set({
            title: input.title,
            description: input.description,
            servings: input.servings,
            prepTimeMinutes: input.prepTimeMinutes,
            cookTimeMinutes: input.cookTimeMinutes,
            cuisine: input.cuisine,
            coverImageUrl: input.coverImageUrl,
            ...(input.publish !== undefined && {
              status: input.publish ? "published" : "draft",
            }),
            updatedAt: new Date(),
          })
          .where(eq(recipes.id, input.id))
          .returning();

        if (input.ingredients !== undefined) {
          await tx.delete(ingredients).where(eq(ingredients.recipeId, input.id));
          if (input.ingredients.length) {
            await tx.insert(ingredients).values(
              input.ingredients.map((ing, i) => ({
                recipeId: input.id,
                name: ing.name,
                quantity: ing.quantity ?? null,
                unit: ing.unit ?? null,
                notes: ing.notes ?? null,
                lowConfidence: ing.lowConfidence ?? false,
                orderIndex: ing.orderIndex ?? i,
              }))
            );
          }
        }

        if (input.steps !== undefined) {
          await tx.delete(steps).where(eq(steps.recipeId, input.id));
          if (input.steps.length) {
            await tx.insert(steps).values(
              input.steps.map((s) => ({
                recipeId: input.id,
                stepNumber: s.stepNumber,
                instruction: s.instruction,
                durationMinutes: s.durationMinutes ?? null,
                timerRequired: s.timerRequired ?? false,
              }))
            );
          }
        }

        if (input.tags !== undefined) {
          await tx.delete(recipeTags).where(eq(recipeTags.recipeId, input.id));
          for (const tagName of input.tags) {
            const slug = tagName.toLowerCase().replace(/\s+/g, "-");
            const [tag] = await tx
              .insert(tags)
              .values({ name: tagName, slug })
              .onConflictDoUpdate({ target: tags.slug, set: { name: tagName } })
              .returning();
            await tx.insert(recipeTags).values({ recipeId: input.id, tagId: tag.id }).onConflictDoNothing();
          }
        }

        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, input.id), eq(recipes.userId, ctx.dbUser.id)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(recipes).where(eq(recipes.id, input.id));
      return { success: true };
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, input.id), eq(recipes.userId, ctx.dbUser.id)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await ctx.db
        .update(recipes)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(recipes.id, input.id))
        .returning();
      return updated;
    }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.status, "published"),
            or(
              ilike(recipes.title, `%${input.q}%`),
              ilike(recipes.description, `%${input.q}%`),
              ilike(recipes.cuisine, `%${input.q}%`)
            )
          )
        )
        .orderBy(desc(recipes.createdAt))
        .limit(input.limit);
    }),

  myRecipes: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const rows = await ctx.db.query.recipes.findMany({
        where: (r, { eq, and, lt }) =>
          and(
            eq(r.userId, ctx.dbUser.id),
            cursor ? lt(r.createdAt, new Date(cursor)) : undefined
          ),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        limit: limit + 1,
        with: { likes: true, media: true },
      });

      let nextCursor: string | undefined;
      if (rows.length > limit) {
        nextCursor = rows[limit]!.createdAt.toISOString();
        rows.pop();
      }
      return { items: rows, nextCursor };
    }),
});
