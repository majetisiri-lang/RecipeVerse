import { notFound } from "next/navigation";
import { serverTrpc } from "@/lib/trpc/server";
import { RecipeEditForm } from "@/components/recipe/RecipeEditForm";

type Props = { params: { id: string } };

export default async function EditRecipePage({ params }: Props) {
  let recipe;
  try {
    recipe = await serverTrpc.recipes.byId({ id: params.id });
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Recipe</h1>
      <RecipeEditForm recipe={recipe} />
    </div>
  );
}
