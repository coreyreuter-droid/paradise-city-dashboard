// components/City/ParadiseSettingsMenu.tsx
"use client";

import Link from "next/link";
import { cityHref } from "@/lib/cityRouting";

export default function ParadiseSettingsMenu() {
  return (
    <Link
      href={cityHref("/admin")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
      aria-label="Admin settings"
    >
      {/* Simple gear icon */}
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          d="M8.999 2.25a1 1 0 0 1 2.002 0l.058.58a4.96 4.96 0 0 1 1.42.586l.52-.3a1 1 0 0 1 1.366.366l1 1.732a1 1 0 0 1-.366 1.366l-.5.289c.067.324.101.658.101 1s-.034.676-.1 1l.5.289a1 1 0 0 1 .366 1.366l-1 1.732a1 1 0 0 1-1.366.366l-.52-.3a4.96 4.96 0 0 1-1.42.586l-.058.58a1 1 0 0 1-2.002 0l-.058-.58a4.96 4.96 0 0 1-1.42-.586l-.52.3a1 1 0 0 1-1.366-.366l-1-1.732a1 1 0 0 1 .366-1.366l.5-.289A5.05 5.05 0 0 1 5 10c0-.342.034-.676.1-1l-.5-.289a1 1 0 0 1-.366-1.366l1-1.732a1 1 0 0 1 1.366-.366l.52.3c.43-.26.9-.46 1.42-.586l.058-.58ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
          fill="currentColor"
        />
      </svg>
    </Link>
  );
}
