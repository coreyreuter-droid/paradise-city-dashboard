// app/paradise/layout.tsx
import type { ReactNode } from "react";
import ParadiseSidebar from "@/components/ParadiseSidebar";

export default function ParadiseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl">
        <ParadiseSidebar />
        <div className="flex-1 px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
