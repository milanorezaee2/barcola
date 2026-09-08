import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/profile/ResetPasswordForm";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].auth.resetPassword };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-[calc(var(--header-h)+2rem)] pb-16">
      <ResetPasswordForm token={token ?? null} />
    </div>
  );
}
