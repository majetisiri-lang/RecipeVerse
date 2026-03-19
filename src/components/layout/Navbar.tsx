"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { ChefHat, Home, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  const navLinks = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/voice", label: "Voice", icon: Mic },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <ChefHat className="h-5 w-5 text-orange-500" />
          <span>RecipeVerse</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname === href
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}
