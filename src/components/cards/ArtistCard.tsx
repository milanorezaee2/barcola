"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, UserPlus, Check, Camera, Globe } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CineModal, CineModalHero, CineModalRow } from "@/components/ui/CineModal";
import { useCinemaModal } from "@/hooks/useCinemaModal";
import { cn, formatNumber, href, t } from "@/lib/utils";
import type { Artist, Pattern } from "@/lib/types";

export interface ArtistCardData extends Artist {
  featuredPattern: Pattern | null;
  portfolioPreview: string[];
  counts: { patterns: number; projects: number };
}

export function ArtistCard({ artist, variant = "default", className }: { artist: ArtistCardData; variant?: "default" | "large"; className?: string }) {
  const { locale, dict } = useLocale();
  const [following, setFollowing] = useState(false);
  const cine = useCinemaModal();
  const url = href(locale, `/artists/${artist.slug}`);

  return (
    <>
      <SpotlightCard
        as="article"
        {...cine.cardBind}
        className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-medium", className)}
      >
        {/* featured pattern / portfolio strip */}
        <Link href={url} className={cn("relative block overflow-hidden bg-background-secondary", variant === "large" ? "aspect-[16/9]" : "aspect-[16/10]")}>
          {artist.featuredPattern && <Image src={artist.featuredPattern.image} alt="" fill sizes="(max-width:768px) 100vw, 33vw" className="img-zoom object-cover" />}
          <div className="absolute inset-0 vignette opacity-70" />
          <div className="absolute bottom-3 inset-inline-start-3 flex gap-1.5">
            {artist.portfolioPreview.slice(0, 3).map((src) => (
              <span key={src} className="relative h-10 w-10 overflow-hidden rounded-sm ring-1 ring-white/50 sm:h-12 sm:w-12">
                <Image src={src} alt="" fill sizes="48px" className="object-cover" />
              </span>
            ))}
          </div>
        </Link>
        <div className="relative flex flex-1 flex-col px-5 pb-5">
          <div className="-mt-8 flex items-end justify-between gap-3">
            <Link href={url} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-soft">
              <Image src={artist.avatar} alt={t(artist.name, locale)} fill sizes="64px" className="object-cover" />
            </Link>
            <button
              type="button"
              aria-pressed={following}
              onClick={() => setFollowing((f) => !f)}
              className={cn("mb-1 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-medium transition-all duration-200 active:scale-95", following ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground")}
            >
              {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {following ? dict.common.following : dict.common.follow}
            </button>
          </div>
          <Link href={url} className="mt-3 block text-h4 font-semibold text-foreground hover:text-accent transition-colors">{t(artist.name, locale)}</Link>
          <p className="text-caption text-accent">{t(artist.profession, locale)}</p>
          <p className="mt-2.5 line-clamp-2 text-body-sm text-foreground-secondary">{t(artist.bio, locale)}</p>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-caption text-foreground-secondary">
            <div className="flex gap-4 tabular">
              <span><strong className="font-semibold text-foreground">{artist.counts.patterns}</strong> {dict.common.patterns}</span>
              <span><strong className="font-semibold text-foreground">{artist.counts.projects}</strong> {dict.common.projects}</span>
              <span><strong className="font-semibold text-foreground">{formatNumber(artist.followers, locale)}</strong> {dict.common.followers}</span>
            </div>
            <Link href={url} aria-label={dict.common.viewProfile} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground">
              <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
            </Link>
          </div>
        </div>
      </SpotlightCard>

      <CineModal open={cine.open} onClose={cine.close} modalBind={cine.modalBind} label={t(artist.name, locale)} className="md:grid md:grid-cols-2">
        <CineModalHero className="aspect-[16/10] md:aspect-auto md:h-full">
          {artist.featuredPattern && <Image src={artist.featuredPattern.image} alt="" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />}
          <div className="absolute inset-0 vignette" />
          <div className="absolute bottom-4 inset-inline-start-4 flex items-end gap-3">
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-surface shadow-soft">
              <Image src={artist.avatar} alt={t(artist.name, locale)} fill sizes="64px" className="object-cover" />
            </span>
          </div>
        </CineModalHero>
        <div className="flex flex-col p-6 md:p-8">
          <CineModalRow step={0}>
            <h2 className="font-display text-h2">{t(artist.name, locale)}</h2>
            <p className="mt-0.5 text-caption text-accent">{t(artist.profession, locale)}</p>
          </CineModalRow>
          <CineModalRow step={1}>
            <p className="mt-4 text-body-sm text-foreground-secondary">{t(artist.bio, locale)}</p>
          </CineModalRow>
          <CineModalRow step={2} className="mt-5 flex items-center gap-4 border-t border-border pt-4 text-caption text-foreground-secondary tabular">
            <span><strong className="font-semibold text-foreground">{artist.counts.patterns}</strong> {dict.common.patterns}</span>
            <span><strong className="font-semibold text-foreground">{artist.counts.projects}</strong> {dict.common.projects}</span>
            <span><strong className="font-semibold text-foreground">{formatNumber(artist.followers, locale)}</strong> {dict.common.followers}</span>
          </CineModalRow>
          {artist.portfolioPreview.length > 0 && (
            <CineModalRow step={3} className="mt-5 flex gap-2">
              {artist.portfolioPreview.slice(0, 4).map((src) => (
                <span key={src} className="relative h-14 w-14 overflow-hidden rounded-md ring-1 ring-border">
                  <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                </span>
              ))}
            </CineModalRow>
          )}
          <CineModalRow step={4} className="mt-6 flex items-center gap-2.5">
            <button
              type="button"
              aria-pressed={following}
              onClick={() => setFollowing((f) => !f)}
              className={cn("inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-all duration-200 active:scale-95", following ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground")}
            >
              {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? dict.common.following : dict.common.follow}
            </button>
            {artist.social.instagram && (
              <a href={artist.social.instagram} target="_blank" rel="noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-foreground">
                <Camera className="h-4 w-4" />
              </a>
            )}
            {artist.social.website && (
              <a href={artist.social.website} target="_blank" rel="noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-foreground">
                <Globe className="h-4 w-4" />
              </a>
            )}
            <Link href={url} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-foreground hover:bg-surface">
              <ArrowUpRight className="h-4 w-4 rtl-flip" />
            </Link>
          </CineModalRow>
        </div>
      </CineModal>
    </>
  );
}
