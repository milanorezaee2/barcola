"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Clock, Layers, Signal } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/Badge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CineModal, CineModalHero, CineModalRow } from "@/components/ui/CineModal";
import { useCinemaModal } from "@/hooks/useCinemaModal";
import { cn, faNum, formatDuration, href, t } from "@/lib/utils";
import type { Artist, Category, EducationItem } from "@/lib/types";

export interface EducationCardData extends EducationItem {
  author: Artist | null;
  category: Category | null;
}

export function EducationCard({ item, variant = "default", className, progress }: { item: EducationCardData; variant?: "default" | "large" | "row"; className?: string; progress?: number }) {
  const { locale, dict } = useLocale();
  const [saved, setSaved] = useState(false);
  const cine = useCinemaModal();
  const url = href(locale, `/academy/${item.slug}`);
  const typeLabel = dict.common[item.type];
  const diff = dict.common[item.difficulty];
  const dur = formatDuration(item.durationMin, locale, dict.common);

  if (variant === "row") {
    return (
      <Link href={url} className={cn("group flex items-center gap-4 border-b border-border py-4 transition-colors hover:bg-background-secondary/60 -mx-3 px-3 rounded-md", className)}>
        <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-background-secondary"><Image src={item.image} alt="" fill sizes="96px" className="img-zoom object-cover" /></span>
        <span className="min-w-0 flex-1">
          <span className="text-caption text-accent">{typeLabel}</span>
          <span className="block truncate font-medium text-foreground">{t(item.title, locale)}</span>
          <span className="block text-caption text-foreground-secondary">{item.author ? t(item.author.name, locale) : dict.brand} · {dur}</span>
        </span>
      </Link>
    );
  }

  return (
    <>
      <SpotlightCard
        as="article"
        {...cine.cardBind}
        className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-medium", className)}
      >
        <Link href={url} className={cn("relative block overflow-hidden bg-background-secondary", variant === "large" ? "aspect-[16/9]" : "aspect-[16/10]")}>
          <Image src={item.image} alt={t(item.title, locale)} fill sizes="(max-width:768px) 100vw, 33vw" className="img-zoom object-cover" />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <Badge tone="glass">{typeLabel}</Badge>
            <button
              type="button"
              aria-pressed={saved}
              aria-label={dict.common.save}
              onClick={(e) => { e.preventDefault(); setSaved((s) => !s); }}
              className={cn("flex h-8 w-8 items-center justify-center rounded-full glass transition-transform active:scale-90", saved ? "text-accent" : "text-foreground")}
            >
              <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
            </button>
          </div>
          {typeof progress === "number" && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30"><div className="h-full bg-accent" style={{ width: `${progress}%` }} /></div>
          )}
        </Link>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-2 text-caption text-foreground-secondary">
            {item.category && <span>{t(item.category.name, locale)}</span>}
            <span className="text-muted">·</span>
            <span className="inline-flex items-center gap-1"><Signal className="h-3 w-3" />{diff}</span>
          </div>
          <Link href={url} className={cn("mt-2 block font-semibold text-foreground text-balance hover:text-accent transition-colors", variant === "large" ? "text-h3" : "text-h4")}>{t(item.title, locale)}</Link>
          <p className="mt-2 line-clamp-2 text-body-sm text-foreground-secondary">{t(item.excerpt, locale)}</p>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-caption text-foreground-secondary">
            <div className="flex items-center gap-2 min-w-0">
              {item.author && <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full"><Image src={item.author.avatar} alt="" fill sizes="24px" className="object-cover" /></span>}
              <span className="truncate">{item.author ? t(item.author.name, locale) : dict.brand}</span>
            </div>
            <div className="flex items-center gap-3 tabular shrink-0">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{dur}</span>
              {item.lessons > 1 && <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{locale === "fa" ? faNum(item.lessons) : item.lessons} {dict.common.lessons}</span>}
            </div>
          </div>
        </div>
      </SpotlightCard>

      <CineModal open={cine.open} onClose={cine.close} modalBind={cine.modalBind} label={t(item.title, locale)} className="md:grid md:grid-cols-2">
        <CineModalHero className="aspect-[16/10] md:aspect-auto md:h-full">
          <Image src={item.image} alt={t(item.title, locale)} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
        </CineModalHero>
        <div className="flex flex-col p-6 md:p-8">
          <CineModalRow step={0} className="flex items-center gap-2 text-caption text-foreground-secondary">
            <Badge>{typeLabel}</Badge>
            <span className="inline-flex items-center gap-1"><Signal className="h-3 w-3" />{diff}</span>
          </CineModalRow>
          <CineModalRow step={1}>
            <h2 className="mt-3 font-display text-h2 text-balance">{t(item.title, locale)}</h2>
          </CineModalRow>
          <CineModalRow step={2}>
            <p className="mt-4 text-body-sm text-foreground-secondary">{t(item.excerpt, locale)}</p>
          </CineModalRow>
          <CineModalRow step={3} className="mt-5 flex items-center gap-4 border-t border-border pt-4 text-caption text-foreground-secondary tabular">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{dur}</span>
            {item.lessons > 1 && <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{locale === "fa" ? faNum(item.lessons) : item.lessons} {dict.common.lessons}</span>}
          </CineModalRow>
          <CineModalRow step={4} className="mt-4 flex items-center gap-2 min-w-0">
            {item.author && <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full"><Image src={item.author.avatar} alt="" fill sizes="32px" className="object-cover" /></span>}
            <span className="truncate text-body-sm text-foreground">{item.author ? t(item.author.name, locale) : dict.brand}</span>
          </CineModalRow>
          <CineModalRow step={5} className="mt-6 flex items-center gap-2.5">
            <button
              type="button"
              aria-pressed={saved}
              onClick={() => setSaved((s) => !s)}
              className={cn("inline-flex h-11 items-center gap-1.5 rounded-md border px-4 text-sm font-medium transition-all duration-200 active:scale-95", saved ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground")}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
              {dict.common.save}
            </button>
            <Link href={url} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90">
              {dict.nav.education}
              <ArrowUpRight className="h-4 w-4 rtl-flip" />
            </Link>
          </CineModalRow>
        </div>
      </CineModal>
    </>
  );
}
