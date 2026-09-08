import type { Metadata } from "next";
import { StudioApp } from "@/components/marketplace/StudioApp";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.studio };
}

export default function StudioPage() {
  return <StudioApp />;
}
