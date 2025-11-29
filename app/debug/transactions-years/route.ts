import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabase
    .from("transactions")
    .select("fiscal_year");

  console.log("DEBUG getTransactionYears:", { data, error });

  return NextResponse.json({ data, error });
}
