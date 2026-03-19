"use client";

import { Heart } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function LikeButton({
  recipeId,
  initialCount,
}: {
  recipeId: string;
  initialCount: number;
}) {
  const { isSignedIn } = useUser();
  const utils = trpc.useUtils();

  const { data: likedData } = trpc.social.isLiked.useQuery(
    { recipeId },
    { enabled: !!isSignedIn }
  );
  const liked = likedData?.liked ?? false;

  const { data: countData } = trpc.social.getLikeCount.useQuery(
    { recipeId },
    { initialData: { count: initialCount } }
  );

  const like = trpc.social.like.useMutation({
    onMutate: async () => {
      await utils.social.getLikeCount.cancel({ recipeId });
      const prev = utils.social.getLikeCount.getData({ recipeId });
      utils.social.getLikeCount.setData({ recipeId }, (old) => ({
        count: (old?.count ?? 0) + 1,
      }));
      utils.social.isLiked.setData({ recipeId }, { liked: true });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.social.getLikeCount.setData({ recipeId }, ctx.prev);
      utils.social.isLiked.setData({ recipeId }, { liked: false });
    },
  });

  const unlike = trpc.social.unlike.useMutation({
    onMutate: async () => {
      await utils.social.getLikeCount.cancel({ recipeId });
      const prev = utils.social.getLikeCount.getData({ recipeId });
      utils.social.getLikeCount.setData({ recipeId }, (old) => ({
        count: Math.max(0, (old?.count ?? 1) - 1),
      }));
      utils.social.isLiked.setData({ recipeId }, { liked: false });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.social.getLikeCount.setData({ recipeId }, ctx.prev);
      utils.social.isLiked.setData({ recipeId }, { liked: true });
    },
  });

  const toggle = () => {
    if (!isSignedIn) return;
    if (liked) {
      unlike.mutate({ recipeId });
    } else {
      like.mutate({ recipeId });
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={!isSignedIn}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        liked
          ? "border-red-300 bg-red-50 text-red-600"
          : "border-border hover:bg-muted",
        !isSignedIn && "cursor-default opacity-60"
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      <span>{countData?.count ?? initialCount}</span>
    </button>
  );
}
