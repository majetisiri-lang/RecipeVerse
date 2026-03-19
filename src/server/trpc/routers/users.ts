import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc/init";
import { users } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const usersRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ctx.dbUser),

  byUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  upsertFromClerk: protectedProcedure
    .input(
      z.object({
        username: z.string().optional(),
        displayName: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .insert(users)
        .values({
          clerkId: ctx.clerkId!,
          username: input.username ?? `user_${ctx.clerkId!.slice(-8)}`,
          displayName: input.displayName ?? "New User",
          avatarUrl: input.avatarUrl,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            ...(input.username && { username: input.username }),
            ...(input.displayName && { displayName: input.displayName }),
            ...(input.avatarUrl && { avatarUrl: input.avatarUrl }),
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        bio: z.string().max(500).optional(),
        displayName: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, ctx.dbUser.id))
        .returning();
      return updated;
    }),
});
