// app/paradise/layout.tsx
import type { ReactNode } from "react";
import ParadiseSidebar from "@/components/ParadiseSidebar";
import { CITY_CONFIG } from "@/lib/cityConfig";

export default function ParadiseLayout({ children }: { children: ReactNode }) {
  const accent = CITY_CONFIG.primaryColor ?? "#2563eb";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ParadiseSidebar />

      <main className="flex-1">
        {/* Top accent band */}
        <div
          className="h-28 w-full"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent}1F, transparent)`,
          }}
        />

        {/* Floating content card */}
        <div className="-mt-10 px-3 pb-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
