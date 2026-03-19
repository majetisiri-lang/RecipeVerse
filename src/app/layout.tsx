import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecipeVerse — Share Your Recipes",
  description: "A social recipe-sharing platform with AI-powered voice-to-recipe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
