import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const difficultyColor: Record<string, string> = {
  Easy:   "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Hard:   "bg-red-100 text-red-700",
};

type RecipeCardProps = {
  recipe: {
    id: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    cookTimeMinutes: number | null;
    prepTimeMinutes: number | null;
    cuisine: string | null;
    createdAt: Date;
    user: { username: string; displayName: string; avatarUrl: string | null };
    likes: { userId: string }[];
  };
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = (recipe.cookTimeMinutes ?? 0) + (recipe.prepTimeMinutes ?? 0);

  return (
    <Link href={`/recipe/${recipe.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow block">
      {/* Image / placeholder */}
      <div className="aspect-[4/3] bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center relative">
        {recipe.coverImageUrl ? (
          <Image src={recipe.coverImageUrl} alt={recipe.title} fill className="object-cover" sizes="50vw" />
        ) : (
          <span className="text-5xl">🍽️</span>
        )}
      </div>

      <div className="p-2.5">
        <h4 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{recipe.title}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{recipe.user.displayName}</p>

        <div className="flex items-center justify-between mt-2">
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", difficultyColor["Easy"])}>
            {recipe.cuisine ?? "Recipe"}
          </span>
          {totalTime > 0 && <span className="text-xs text-gray-400">⏱ {totalTime} min</span>}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-yellow-500">
            ★ <span className="text-gray-400">({recipe.likes.length} likes)</span>
          </span>
          <span className="text-sm">🤍</span>
        </div>
      </div>
    </Link>
  );
}
