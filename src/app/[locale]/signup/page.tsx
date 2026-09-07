import type { Metadata } from "next";
import { AuthShell } from "@/components/profile/AuthShell";
import { AuthForm } from "@/components/profile/AuthForm";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.signup };
}
export default async function SignupPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = dictionaries[locale];
  const site = await getSite();
  return <AuthShell title={d.nav.signup} description={locale === "fa" ? "الگوها را ذخیره کنید، سفارش دهید و طراحان را دنبال کنید." : "Save patterns, order and follow designers."} image={site.portfolios[2]?.cover ?? site.hero.image}><AuthForm mode="signup" /></AuthShell>;
}
