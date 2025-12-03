// app/paradise/login/page.tsx
import LoginClient from "@/components/City/LoginClient";

type PageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

export const revalidate = 0;

export default function ParadiseLoginPage({ searchParams }: PageProps) {
  const raw = searchParams?.redirect;
  const redirectParam =
    typeof raw === "string" && raw.length > 0
      ? raw
      : "/paradise/admin";

  return <LoginClient redirect={redirectParam} />;
}
