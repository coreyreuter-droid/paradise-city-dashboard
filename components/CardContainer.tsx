// components/CardContainer.tsx
"use client";

import type { ReactNode } from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function CardContainer({ children }: { children: ReactNode }) {
  return (
    <ScrollReveal variant="fade-up" duration={400} delay={0}>
      <div className="w-full max-w-full rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
        {children}
      </div>
    </ScrollReveal>
  );
}
