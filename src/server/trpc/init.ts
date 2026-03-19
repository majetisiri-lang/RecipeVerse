import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const createTRPCContext = cache(async (opts: { headers: Headers }) => {
  const { userId: clerkId } = await auth();
  return { db, clerkId, headers: opts.headers };
});

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.clerkId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Auto-upsert user on first call
  const existing = await ctx.db
    .select()
    .from(users)
    .where(eq(users.clerkId, ctx.clerkId))
    .limit(1);

  let dbUser = existing[0];

  if (!dbUser) {
    // Minimal user row — full sync happens via users.upsertFromClerk
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (!clerkUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const username =
      clerkUser.username ??
      `user_${clerkUser.id.slice(-8)}`;
    const displayName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      username;

    const [created] = await ctx.db
      .insert(users)
      .values({
        clerkId: ctx.clerkId,
        username,
        displayName,
        avatarUrl: clerkUser.imageUrl,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: { updatedAt: new Date() },
      })
      .returning();
    dbUser = created;
  }

  return next({ ctx: { ...ctx, dbUser } });
});
