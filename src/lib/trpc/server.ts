import "server-only";
import { createCallerFactory, createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/router";
import { headers } from "next/headers";

const createCaller = createCallerFactory(appRouter);

export const serverTrpc = createCaller(async () => {
  const h = await headers();
  return createTRPCContext({ headers: h });
});
