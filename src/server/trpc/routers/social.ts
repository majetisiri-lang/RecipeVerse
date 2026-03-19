import { z } from "zod";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/init";
import { follows, likes, comments, recipes, users } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const socialRouter = createTRPCRouter({
  feed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      // Get IDs of users the current user follows
      const followedRows = await ctx.db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, ctx.dbUser.id));

      const followedIds = [
        ctx.dbUser.id,
        ...followedRows.map((r) => r.followingId),
      ];

      const rows = await ctx.db.query.recipes.findMany({
        where: (r, { inArray, and: a, eq: e, lt: l }) =>
          a(
            inArray(r.userId, followedIds),
            e(r.status, "published"),
            cursor ? l(r.createdAt, new Date(cursor)) : undefined
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

  like: protectedProcedure
    .input(z.object({ recipeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(likes)
        .values({ userId: ctx.dbUser.id, recipeId: input.recipeId })
        .onConflictDoNothing();
      return { success: true };
    }),

  unlike: protectedProcedure
    .input(z.object({ recipeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(likes)
        .where(
          and(
            eq(likes.userId, ctx.dbUser.id),
            eq(likes.recipeId, input.recipeId)
          )
        );
      return { success: true };
    }),

  isLiked: protectedProcedure
    .input(z.object({ recipeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.userId, ctx.dbUser.id),
            eq(likes.recipeId, input.recipeId)
          )
        )
        .limit(1);
      return { liked: !!row };
    }),

  getLikeCount: publicProcedure
    .input(z.object({ recipeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(likes)
        .where(eq(likes.recipeId, input.recipeId));
      return { count };
    }),

  comment: protectedProcedure
    .input(
      z.object({
        recipeId: z.string().uuid(),
        body: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [comment] = await ctx.db
        .insert(comments)
        .values({
          userId: ctx.dbUser.id,
          recipeId: input.recipeId,
          body: input.body,
        })
        .returning();
      return comment;
    }),

  getComments: publicProcedure
    .input(z.object({ recipeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.comments.findMany({
        where: (c, { eq }) => eq(c.recipeId, input.recipeId),
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: { user: true },
      });
    }),

  follow: protectedProcedure
    .input(z.object({ targetUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.id === input.targetUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot follow yourself",
        });
      }
      await ctx.db
        .insert(follows)
        .values({
          followerId: ctx.dbUser.id,
          followingId: input.targetUserId,
        })
        .onConflictDoNothing();
      return { success: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ targetUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, ctx.dbUser.id),
            eq(follows.followingId, input.targetUserId)
          )
        );
      return { success: true };
    }),

  isFollowing: protectedProcedure
    .input(z.object({ targetUserId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, ctx.dbUser.id),
            eq(follows.followingId, input.targetUserId)
          )
        )
        .limit(1);
      return { following: !!row };
    }),

  getFollowerCount: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followingId, input.userId));
      return { count };
    }),

  getFollowingCount: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, input.userId));
      return { count };
    }),
});
