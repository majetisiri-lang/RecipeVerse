"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/feed",    icon: "🏠", label: "Home" },
  { href: "/voice",   icon: "🎙️", label: "Voice" },
  { href: "/feed",    icon: "🔖", label: "Saved" },
  { href: "/profile", icon: "👤", label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-50">
      {tabs.map(({ href, icon, label }) => {
        const active = pathname === href || (label === "Home" && pathname === "/feed");
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all",
              active ? "text-orange-500" : "text-gray-400"
            )}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
