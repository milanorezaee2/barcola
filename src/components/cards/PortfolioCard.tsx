"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { CineModal, CineModalHero, CineModalRow } from "@/components/ui/CineModal";
import { useCinemaModal } from "@/hooks/useCinemaModal";
import { cn, faNum, href, t } from "@/lib/utils";
import type { Artist, Category, Portfolio } from "@/lib/types";

export interface PortfolioCardData extends Portfolio {
  artist: Artist | null;
  category: Category | null;
}

/** Editorial card with CSS-only 3D mouse-tracking tilt and parallax shine layer. After a 2s
 * hover/focus dwell, a large cinematic modal opens with the full cover photo, intro, scope and a
 * link into the case study. */
export function PortfolioCard({
  item,
  className,
  priority,
  overlay = true,
}: {
  item: PortfolioCardData;
  className?: string;
  priority?: boolean;
  overlay?: boolean;
}) {
  const { locale, dict } = useLocale();
  const url = href(locale, `/portfolio/${item.slug}`);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const cine = useCinemaModal();

  const handleMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = cardRef.current;
    const shine = shineRef.current;
    const inner = innerRef.current;
    if (!card || !shine || !inner) return;
    const rect = card.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const rx = -ny * 10;
    const ry = nx * 10;
    inner.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
    const sx = ((e.clientX - rect.left) / rect.width) * 100;
    const sy = ((e.clientY - rect.top) / rect.height) * 100;
    shine.style.background = `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.18) 0%, transparent 65%)`;
    shine.style.opacity = "1";
  }, []);

  const handleLeave = useCallback(() => {
    const inner = innerRef.current;
    const shine = shineRef.current;
    if (!inner) return;
    inner.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    if (shine) shine.style.opacity = "0";
    cine.cardBind.onMouseLeave();
  }, [cine.cardBind]);

  return (
    <>
      <Link
        ref={cardRef}
        href={url}
        onMouseMove={handleMove}
        onMouseEnter={cine.cardBind.onMouseEnter}
        onMouseLeave={handleLeave}
        onFocus={cine.cardBind.onFocus}
        onBlur={cine.cardBind.onBlur}
        className={cn(
          "group relative block h-full min-h-[280px] overflow-hidden rounded-xl border border-border bg-background-secondary",
          "[perspective:900px]",
          className,
        )}
      >
        <span
          ref={innerRef}
          className="pointer-events-none absolute inset-0 block"
          style={{ transformOrigin: "center center", transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)", willChange: "transform" }}
        >
          <Image src={item.cover} alt={t(item.title, locale)} fill priority={priority} sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 40vw" className="object-cover" />
          {overlay && <span className="absolute inset-0 vignette" />}
          <span ref={shineRef} aria-hidden className="absolute inset-0 rounded-xl" style={{ opacity: 0, transition: "opacity 200ms ease, background 60ms linear", pointerEvents: "none" }} />
        </span>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 text-white/80">
          <span className="text-label text-white/70">{item.category ? t(item.category.name, locale) : ""}</span>
          <span className="text-caption tabular">{locale === "fa" ? faNum(item.year) : item.year}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
          <div className="min-w-0 text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.45)" }}>
            <p className="text-caption text-white/70">
              {item.artist ? t(item.artist.name, locale) : dict.brand} · {t(item.location, locale)}
            </p>
            <h3 className="mt-1 font-display text-h3 leading-tight text-balance">{t(item.title, locale)}</h3>
            <p className="mt-1 line-clamp-1 text-body-sm text-white/75">{t(item.subtitle, locale)}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full glass text-white/90 transition-transform duration-300 group-hover:scale-105">
            <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
          </span>
        </div>
      </Link>

      <CineModal open={cine.open} onClose={cine.close} modalBind={cine.modalBind} label={t(item.title, locale)}>
        <CineModalHero className="aspect-[16/9]">
          <Image src={item.cover} alt={t(item.title, locale)} fill sizes="(max-width:896px) 100vw, 896px" className="object-cover" />
          <div className="absolute inset-0 vignette" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.45)" }}>
            <p className="text-caption text-white/75">{item.category ? t(item.category.name, locale) : ""} · {locale === "fa" ? faNum(item.year) : item.year}</p>
            <h2 className="mt-1 font-display text-h1 leading-tight text-balance">{t(item.title, locale)}</h2>
            <p className="mt-1 text-body-sm text-white/80">{t(item.subtitle, locale)}</p>
          </div>
        </CineModalHero>
        <div className="p-6 md:p-8">
          <CineModalRow step={0} className="text-caption text-foreground-secondary">
            {item.artist ? t(item.artist.name, locale) : dict.brand} · {t(item.location, locale)}
          </CineModalRow>
          <CineModalRow step={1}>
            <p className="mt-3 text-body-sm text-foreground-secondary">{t(item.intro, locale)}</p>
          </CineModalRow>
          <CineModalRow step={2} className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-4">
            <div><dt className="text-caption text-muted">{dict.common.client}</dt><dd className="mt-0.5 font-medium text-foreground">{t(item.client, locale)}</dd></div>
            <div><dt className="text-caption text-muted">{dict.common.scope}</dt><dd className="mt-0.5 font-medium text-foreground">{t(item.scope, locale)}</dd></div>
            <div><dt className="text-caption text-muted">{dict.common.location}</dt><dd className="mt-0.5 font-medium text-foreground">{t(item.location, locale)}</dd></div>
            <div><dt className="text-caption text-muted">{dict.common.year}</dt><dd className="mt-0.5 font-medium text-foreground tabular">{locale === "fa" ? faNum(item.year) : item.year}</dd></div>
          </CineModalRow>
          <CineModalRow step={3} className="mt-6">
            <Link href={url} className="inline-flex h-11 items-center gap-1.5 rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90">
              {dict.nav.portfolio}
              <ArrowUpRight className="h-4 w-4 rtl-flip" />
            </Link>
          </CineModalRow>
        </div>
      </CineModal>
    </>
  );
}
