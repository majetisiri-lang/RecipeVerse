import { createTRPCRouter } from "./init";
import { recipesRouter } from "./routers/recipes";
import { usersRouter } from "./routers/users";
import { socialRouter } from "./routers/social";

export const appRouter = createTRPCRouter({
  recipes: recipesRouter,
  users: usersRouter,
  social: socialRouter,
});

export type AppRouter = typeof appRouter;
