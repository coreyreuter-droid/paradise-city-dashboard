// app/page.tsx
import { redirect } from "next/navigation";
import { cityHref } from "@/lib/cityRouting";

export default function Home() {
  // Always send root to the active city's overview page
  redirect(cityHref("/"));
}
