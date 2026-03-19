import { notFound } from "next/navigation";
import { serverTrpc } from "@/lib/trpc/server";
import { RecipeDetail } from "@/components/recipe/RecipeDetail";
import type { Metadata } from "next";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const recipe = await serverTrpc.recipes.byId({ id: params.id });
    return {
      title: `${recipe.title} — RecipeVerse`,
      description: recipe.description ?? undefined,
    };
  } catch {
    return { title: "Recipe — RecipeVerse" };
  }
}

export default async function RecipePage({ params }: Props) {
  let recipe;
  try {
    recipe = await serverTrpc.recipes.byId({ id: params.id });
  } catch {
    notFound();
  }

  return <RecipeDetail recipe={recipe} recipeId={params.id} />;
}
