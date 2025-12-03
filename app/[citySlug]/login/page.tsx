// app/[citySlug]/login/page.tsx
import LoginClient from "@/components/City/LoginClient";
import { cityHref } from "@/lib/cityRouting";

type PageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

export const revalidate = 0;

export default function LoginPage({ searchParams }: PageProps) {
  const raw = searchParams?.redirect;
  const redirectParam =
    typeof raw === "string" && raw.length > 0
      ? raw
      : cityHref("/admin");

  return <LoginClient redirect={redirectParam} />;
}
