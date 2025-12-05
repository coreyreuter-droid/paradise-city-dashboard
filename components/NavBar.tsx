import Link from "next/link";
import { CITY_CONFIG } from "@/lib/cityConfig";

export default function NavBar() {
  const basePath = `/${CITY_CONFIG.slug}`;

  return (
    <nav className="w-full bg-white shadow-sm border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-3 flex gap-6 text-sm font-medium">
        {/* Portal Home (landing page) */}
        <Link
          href={basePath}
          className="text-slate-700 hover:text-black"
        >
          Home
        </Link>

        {/* Overview dashboard */}
        <Link
          href={`${basePath}/overview`}
          className="text-slate-700 hover:text-black"
        >
          Overview
        </Link>

        {/* City label (non-click, just context) */}
        <span
          className="rounded-md px-2 py-1 bg-slate-50 border border-slate-200 text-slate-800"
          style={{
            fontWeight: 600,
          }}
        >
          {CITY_CONFIG.displayName}
        </span>

        {/* Other sections */}
        <Link
          href={`${basePath}/analytics`}
          className="text-slate-700 hover:text-black"
        >
          Analytics
        </Link>

        <Link
          href={`${basePath}/budget`}
          className="text-slate-700 hover:text-black"
        >
          Budget
        </Link>

        <Link
          href={`${basePath}/transactions`}
          className="text-slate-700 hover:text-black"
        >
          Transactions
        </Link>
      </div>
    </nav>
  );
}
