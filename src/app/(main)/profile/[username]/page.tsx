import { notFound } from "next/navigation";
import { serverTrpc } from "@/lib/trpc/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import type { Metadata } from "next";

type Props = { params: { username: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const user = await serverTrpc.users.byUsername({ username: params.username });
    return {
      title: `${user.displayName} (@${user.username}) — RecipeVerse`,
    };
  } catch {
    return { title: "Profile — RecipeVerse" };
  }
}

export default async function ProfilePage({ params }: Props) {
  let user;
  try {
    user = await serverTrpc.users.byUsername({ username: params.username });
  } catch {
    notFound();
  }

  const { items: recipes } = await serverTrpc.recipes.list({ limit: 20 });
  const userRecipes = recipes.filter((r) => r.user.username === params.username);

  return (
    <div>
      <ProfileHeader user={user} />
      <h2 className="mb-4 font-semibold">Recipes</h2>
      {userRecipes.length === 0 ? (
        <p className="text-sm text-[--color-muted-foreground]">No published recipes yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
