"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Users, ChefHat, Pencil } from "lucide-react";
import { LikeButton } from "./LikeButton";
import { useUser } from "@clerk/nextjs";

type Ingredient = {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
};

type Step = {
  id: string;
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
};

type RecipeDetailProps = {
  recipe: {
    id: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    servings: number | null;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    cuisine: string | null;
    ingredients: Ingredient[];
    steps: Step[];
    likes: { userId: string }[];
    user: { username: string; displayName: string; avatarUrl: string | null; clerkId: string };
  };
  recipeId: string;
};

export function RecipeDetail({ recipe, recipeId }: RecipeDetailProps) {
  const { user } = useUser();
  const isOwner = user?.id === recipe.user.clerkId;
  return (
    <article className="mx-auto max-w-2xl">
      {recipe.coverImageUrl && (
        <div className="relative mb-6 aspect-video overflow-hidden rounded-xl">
          <Image
            src={recipe.coverImageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{recipe.title}</h1>
            {isOwner && (
              <Link href={`/recipe/${recipeId}/edit`}
                className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                <Pencil className="h-3 w-3" /> Edit
              </Link>
            )}
          </div>
          {recipe.cuisine && (
            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
              {recipe.cuisine}
            </span>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            by {recipe.user.displayName}
          </p>
        </div>
        <LikeButton recipeId={recipe.id} initialCount={recipe.likes.length} />
      </div>

      {recipe.description && (
        <p className="mb-6 text-muted-foreground">{recipe.description}</p>
      )}

      <div className="mb-8 flex flex-wrap gap-4 rounded-xl border border-border p-4">
        {recipe.prepTimeMinutes != null && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Prep:</span>
            <span className="font-medium">{recipe.prepTimeMinutes}m</span>
          </div>
        )}
        {recipe.cookTimeMinutes != null && (
          <div className="flex items-center gap-1.5 text-sm">
            <ChefHat className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cook:</span>
            <span className="font-medium">{recipe.cookTimeMinutes}m</span>
          </div>
        )}
        {recipe.servings != null && (
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Serves:</span>
            <span className="font-medium">{recipe.servings}</span>
          </div>
        )}
      </div>

      {recipe.ingredients.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="flex items-baseline gap-2 text-sm">
                <span className="text-muted-foreground">•</span>
                <span>
                  {ing.quantity && <span className="font-medium">{ing.quantity} </span>}
                  {ing.unit && <span className="font-medium">{ing.unit} </span>}
                  {ing.name}
                  {ing.notes && (
                    <span className="ml-1 text-muted-foreground">({ing.notes})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Instructions</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step) => (
              <li key={step.id} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {step.stepNumber}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm">{step.instruction}</p>
                  {step.durationMinutes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ~{step.durationMinutes} min
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
