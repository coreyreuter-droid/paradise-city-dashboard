// app/[citySlug]/login/page.tsx
import LoginClient from "@/components/City/LoginClient";
import { cityHref } from "@/lib/cityRouting";
import { supabaseAdmin } from "@/lib/supabaseService";

type PageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

export const revalidate = 0;

export default async function LoginPage({ searchParams }: PageProps) {
  const raw = searchParams?.redirect;
  const redirectParam =
    typeof raw === "string" && raw.length > 0 ? raw : cityHref("/admin");

  // Pull branded city name server-side to avoid "Your City" flash/mismatch
  const { data: settings } = await supabaseAdmin
    .from("portal_settings")
    .select("city_name")
    .eq("id", 1)
    .maybeSingle();

  const cityName =
    settings?.city_name && settings.city_name.trim().length > 0
      ? settings.city_name.trim()
      : null;

  return <LoginClient redirect={redirectParam} cityName={cityName} />;
}
