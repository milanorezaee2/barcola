"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge, Sku } from "@/components/ui/Badge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CineModal, CineModalHero, CineModalRow } from "@/components/ui/CineModal";
import { AddToCartButton, FavoriteButton } from "@/components/product/Actions";
import { useCinemaModal } from "@/hooks/useCinemaModal";
import { cn, formatPrice, href, t } from "@/lib/utils";
import type { Artist, Category, Pattern } from "@/lib/types";
import { QuickView } from "@/components/product/QuickView";

export interface PatternCardData extends Pattern {
  artist: Artist | null;
  category: Category | null;
}

type Variant = "default" | "large" | "wide" | "compact";

export function PatternCard({ pattern, variant = "default", priority, className }: { pattern: PatternCardData; variant?: Variant; priority?: boolean; className?: string }) {
  const { locale, dict } = useLocale();
  const [quick, setQuick] = useState(false);
  const cine = useCinemaModal();
  const url = href(locale, `/patterns/${pattern.slug}`);
  const ratio = variant === "large" ? "aspect-[4/5]" : variant === "wide" ? "aspect-[16/10]" : variant === "compact" ? "aspect-square" : "aspect-[4/5]";

  return (
    <>
      <SpotlightCard
        as="article"
        {...cine.cardBind}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-medium",
          className,
        )}
      >
        <Link href={url} className="relative block overflow-hidden bg-background-secondary" aria-label={t(pattern.title, locale)}>
          <div className={cn("relative w-full", ratio)}>
            <Image
              src={pattern.image}
              alt={t(pattern.title, locale)}
              fill
              priority={priority}
              sizes={variant === "large" ? "(max-width:768px) 100vw, 50vw" : "(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"}
              className="img-zoom object-cover"
            />
          </div>
          {/* top row */}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {pattern.isNew && <Badge tone="glass">{dict.common.new}</Badge>}
              {pattern.trending && <Badge tone="glass">{dict.common.trending}</Badge>}
              {pattern.bestSeller && !pattern.trending && <Badge tone="glass">{dict.common.bestSeller}</Badge>}
              {!pattern.artistId && <Badge tone="glass" className="text-accent">{dict.common.sitePattern}</Badge>}
            </div>
            <FavoriteButton id={pattern.id} size="sm" />
          </div>
          {/* hover CTA */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-between gap-2 opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setQuick(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full glass px-3 text-[13px] font-medium text-foreground hover:bg-surface"
            >
              <Eye className="h-3.5 w-3.5" />
              {dict.common.quickView}
            </button>
            <AddToCartButton
              variant="icon"
              line={{ kind: "pattern", id: pattern.id, sku: pattern.sku, title: t(pattern.title, locale), image: pattern.image, price: pattern.price, href: url }}
            />
          </div>
          {variant !== "compact" && (
            <div className="pointer-events-none absolute bottom-3 inset-inline-end-3 flex gap-1 opacity-100 transition-opacity duration-300 group-hover:opacity-0">
              {pattern.palette.slice(0, 3).map((c) => (
                <span key={c} className="h-3 w-3 rounded-full ring-1 ring-white/60" style={{ background: c }} />
              ))}
            </div>
          )}
        </Link>

        <div className={cn("flex flex-col gap-1.5 p-3.5", variant === "large" && "p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={url} className={cn("block truncate font-medium text-foreground hover:text-accent transition-colors", variant === "large" ? "text-h4" : "text-[15px]")}>
                {t(pattern.title, locale)}
              </Link>
              <p className="mt-0.5 truncate text-caption text-foreground-secondary">
                {pattern.artist ? (
                  <Link href={href(locale, `/artists/${pattern.artist.slug}`)} className="hover:text-foreground">
                    {t(pattern.artist.name, locale)}
                  </Link>
                ) : (
                  dict.brand
                )}
                {pattern.category && <span className="text-muted"> · {t(pattern.category.name, locale)}</span>}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular text-foreground">{formatPrice(pattern.price, locale)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <Sku value={pattern.sku} />
            {variant !== "compact" && (
              <span className="truncate text-caption text-muted" dir="auto">
                {t(pattern.specs.repeat, locale)} · {pattern.specs.dpi} · {t(pattern.specs.scale, locale)}
              </span>
            )}
          </div>
        </div>
      </SpotlightCard>

      <CineModal open={cine.open} onClose={cine.close} modalBind={cine.modalBind} label={t(pattern.title, locale)} className="md:grid md:grid-cols-2">
        <CineModalHero className="aspect-[4/5] md:aspect-auto md:h-full">
          <Image src={pattern.image} alt={t(pattern.title, locale)} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
          <div className="absolute inset-0 vignette opacity-60 md:hidden" />
        </CineModalHero>
        <div className="flex flex-col p-6 md:p-8">
          <CineModalRow step={0} className="flex flex-wrap gap-1.5">
            {pattern.isNew && <Badge>{dict.common.new}</Badge>}
            {pattern.trending && <Badge>{dict.common.trending}</Badge>}
            {pattern.bestSeller && !pattern.trending && <Badge>{dict.common.bestSeller}</Badge>}
            {!pattern.artistId && <Badge tone="accent">{dict.common.sitePattern}</Badge>}
          </CineModalRow>
          <CineModalRow step={1}>
            <h2 className="mt-3 font-display text-h2">{t(pattern.title, locale)}</h2>
            <p className="mt-1 text-body-sm text-foreground-secondary">
              {pattern.artist ? t(pattern.artist.name, locale) : dict.brand}
              {pattern.category && <span className="text-muted"> · {t(pattern.category.name, locale)}</span>}
            </p>
          </CineModalRow>
          <CineModalRow step={2}>
            <p className="mt-4 text-body-sm text-foreground-secondary">{t(pattern.description, locale)}</p>
          </CineModalRow>
          <CineModalRow step={3} className="mt-4 text-h3 font-semibold tabular text-foreground">
            {formatPrice(pattern.price, locale)}
          </CineModalRow>
          <CineModalRow step={4}>
            <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-background-secondary px-4 py-3 text-sm">
              <div><dt className="text-caption text-muted">{dict.common.repeat}</dt><dd className="mt-0.5 font-medium text-foreground">{t(pattern.specs.repeat, locale)}</dd></div>
              <div><dt className="text-caption text-muted">{dict.common.dpi}</dt><dd className="mt-0.5 font-medium text-foreground">{pattern.specs.dpi}</dd></div>
              <div><dt className="text-caption text-muted">{dict.common.formats}</dt><dd className="mt-0.5 font-medium text-foreground">{pattern.specs.formats}</dd></div>
              <div><dt className="text-caption text-muted">{dict.common.colors}</dt><dd className="mt-0.5 font-medium text-foreground">{pattern.specs.colors}</dd></div>
            </dl>
          </CineModalRow>
          <CineModalRow step={5} className="mt-4 flex gap-1.5">
            {pattern.palette.slice(0, 7).map((c) => (
              <span key={c} className="h-5 w-5 rounded-full ring-1 ring-border" style={{ background: c }} />
            ))}
          </CineModalRow>
          <CineModalRow step={6} className="mt-6 flex items-center gap-2.5">
            <AddToCartButton className="h-11 flex-1" line={{ kind: "pattern", id: pattern.id, sku: pattern.sku, title: t(pattern.title, locale), image: pattern.image, price: pattern.price, href: url }} />
            <Link href={url} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-foreground hover:bg-surface">
              <ArrowUpRight className="h-4 w-4 rtl-flip" />
            </Link>
          </CineModalRow>
        </div>
      </CineModal>

      {quick && <QuickView open={quick} onClose={() => setQuick(false)} item={{ kind: "pattern", pattern }} />}
    </>
  );
}
