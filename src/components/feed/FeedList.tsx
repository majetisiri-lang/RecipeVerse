"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["All", "Italian", "Mexican", "Korean", "Dessert", "Vegan", "Quick"];

export function FeedList() {
  const [category, setCategory] = useState("All");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.recipes.list.useInfiniteQuery(
      { limit: 12 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allRecipes = data?.pages.flatMap((p) => p.items) ?? [];
  const recipes = category === "All"
    ? allRecipes
    : allRecipes.filter((r) => r.cuisine?.toLowerCase() === category.toLowerCase());

  return (
    <>
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              category === c
                ? "bg-orange-500 text-white shadow"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Heading */}
      <h3 className="font-bold text-gray-800 mb-3">
        {category === "All" ? "Trending Recipes" : `${category} Recipes`}
        {!isLoading && (
          <span className="text-gray-400 font-normal text-sm ml-2">({recipes.length})</span>
        )}
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🥺</div>
          <p>No recipes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} className="flex justify-center py-8">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-orange-400" />}
      </div>
    </>
  );
}
