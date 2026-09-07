import type { Metadata } from "next";
import { AuthShell } from "@/components/profile/AuthShell";
import { AuthForm } from "@/components/profile/AuthForm";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.login };
}
export default async function LoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = dictionaries[locale];
  const site = await getSite();
  return <AuthShell title={d.nav.login} description={locale === "fa" ? "به رزی آتلیه خوش آمدید." : "Welcome back to Rosie Atelier."} image={site.portfolios[5]?.cover ?? site.hero.image}><AuthForm mode="login" /></AuthShell>;
}
