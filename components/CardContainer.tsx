// components/CardContainer.tsx
import type { ReactNode } from "react";

export default function CardContainer({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
      {children}
    </div>
  );
}
