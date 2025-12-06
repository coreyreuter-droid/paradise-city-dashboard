import { NextResponse } from "next/server";

// Disable this debug endpoint in production.
// Keeping the file so imports / routes don't break, but it no longer exposes data.
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { error: "Debug endpoint disabled. Use getTransactionYears() in lib/queries instead." },
    { status: 404 }
  );
}
