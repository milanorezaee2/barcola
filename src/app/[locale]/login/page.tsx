import type { Metadata } from "next";
import { AuthFlipCard } from "@/components/profile/AuthFlipCard";
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
  const fa = locale === "fa";

  return (
    <AuthFlipCard
      initialMode="login"
      login={{
        title: d.nav.login,
        description: fa ? "به رزی آتلیه خوش آمدید." : "Welcome back to Rosie Atelier.",
        image: site.portfolios[5]?.cover ?? site.hero.image,
        quote: fa ? "الگوهایی که فضا را روایت می‌کنند." : "Patterns that tell the story of a space.",
      }}
      signup={{
        title: d.nav.signup,
        description: fa ? "الگوها را ذخیره کنید، سفارش دهید و طراحان را دنبال کنید." : "Save patterns, order and follow designers.",
        image: site.portfolios[2]?.cover ?? site.hero.image,
        quote: fa ? "به جمع رزی آتلیه بپیوندید." : "Join the Rosie Atelier community.",
      }}
    />
  );
}
