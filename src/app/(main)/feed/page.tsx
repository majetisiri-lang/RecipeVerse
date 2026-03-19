import { FeedList } from "@/components/feed/FeedList";

export const metadata = { title: "Feed — RecipeVerse" };

export default function FeedPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Latest Recipes</h1>
        <p className="mt-1 text-gray-500">Discover what the community is cooking</p>
      </div>
      <FeedList />
    </div>
  );
}
