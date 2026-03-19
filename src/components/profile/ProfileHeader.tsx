"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileHeaderProps = {
  user: {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
  };
};

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const { user: clerkUser, isSignedIn } = useUser();

  const { data: followerData } = trpc.social.getFollowerCount.useQuery({ userId: user.id });
  const { data: followingData } = trpc.social.getFollowingCount.useQuery({ userId: user.id });
  const { data: isFollowingData } = trpc.social.isFollowing.useQuery(
    { targetUserId: user.id },
    { enabled: !!isSignedIn }
  );

  const utils = trpc.useUtils();

  const follow = trpc.social.follow.useMutation({
    onSuccess: () => {
      utils.social.isFollowing.invalidate({ targetUserId: user.id });
      utils.social.getFollowerCount.invalidate({ userId: user.id });
    },
  });

  const unfollow = trpc.social.unfollow.useMutation({
    onSuccess: () => {
      utils.social.isFollowing.invalidate({ targetUserId: user.id });
      utils.social.getFollowerCount.invalidate({ userId: user.id });
    },
  });

  const isOwnProfile = clerkUser?.username === user.username;
  const isFollowing = isFollowingData?.following ?? false;

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
        {user.avatarUrl ? (
          <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UserRound className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{user.displayName}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
          {isSignedIn && !isOwnProfile && (
            <button
              onClick={() =>
                isFollowing
                  ? unfollow.mutate({ targetUserId: user.id })
                  : follow.mutate({ targetUserId: user.id })
              }
              disabled={follow.isPending || unfollow.isPending}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                isFollowing
                  ? "border border-border hover:bg-muted"
                  : "bg-primary text-white hover:opacity-90"
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {user.bio && <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p>}

        <div className="mt-3 flex gap-4 text-sm">
          <span>
            <strong>{followerData?.count ?? 0}</strong>{" "}
            <span className="text-muted-foreground">followers</span>
          </span>
          <span>
            <strong>{followingData?.count ?? 0}</strong>{" "}
            <span className="text-muted-foreground">following</span>
          </span>
        </div>
      </div>
    </div>
  );
}
