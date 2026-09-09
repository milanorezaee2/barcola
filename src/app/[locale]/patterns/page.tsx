import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { FilterBar } from "@/components/product/FilterBar";
import { PatternGrid } from "@/components/product/Grids";
import { GridSkeleton } from "@/components/ui/States";
import { enrichPattern, getSite } from "@/lib/data/queries";
import { filterPatterns, type SP } from "@/lib/data/filters";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { PATTERN_LINES, type PatternLine } from "@/lib/types";
import { cn, href, t } from "@/lib/utils";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/patterns");
  return { title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.patterns, description: m ? t(m.description, locale) : undefined };
}

/** Preserve other URL params while switching the active surface line. */
function lineHref(locale: Locale, sp: SP, line: PatternLine) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "line") continue;
    const vals = Array.isArray(v) ? v : [v];
    for (const val of vals) if (val) q.append(k, String(val));
  }
  const query = q.toString();
  return href(locale, `/patterns?${query ? `${query}&` : ""}line=${line}`);
}

export default async function PatternsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const site = await getSite();
  const d = dictionaries[locale];

  // Surface/material line — wallpaper by default so the original catalogue is unchanged.
  const rawLine = one(sp.line) as PatternLine | undefined;
  const activeLine: PatternLine = rawLine && (PATTERN_LINES as string[]).includes(rawLine) ? rawLine : "wallpaper";

  const base = site.patterns.filter((p) => (p.line ?? "wallpaper") === activeLine);
  const catMap = Object.fromEntries(site.categories.map((c) => [c.slug, c.id]));
  const spaceMap = Object.fromEntries(site.spaces.map((s) => [s.slug, s.id]));
  const list = filterPatterns(base, sp, catMap, spaceMap).map((p) => enrichPattern(site, p));

  // Only show style categories that actually exist on the active line.
  const usedCatIds = new Set(base.map((p) => p.categoryId));
  const catOrder = Object.fromEntries(site.categories.map((c, i) => [c.id, i]));
  const usedCats = site.categories.filter((c) => usedCatIds.has(c.id)).sort((a, b) => catOrder[a.id] - catOrder[b.id]);

  const lineMeta = { wallpaper: d.lines.wallpaperMeta, fabric: d.lines.fabricMeta, paint: d.lines.paintMeta, clothing: d.lines.clothingMeta } as const;

  return (
    <>
      <PageHero eyebrow={d.nav.patterns} title={activeLine === "wallpaper" ? d.nav.patterns : d.lines[activeLine]} description={activeLine === "wallpaper" ? d.home.discoveryDesc : lineMeta[activeLine]} />

      <div className="container-x pb-20">
        {/* Surface line switcher */}
        <div className="mb-5 -mt-2 flex flex-wrap items-center gap-2 border-b border-border pb-5">
          <span className="me-1 text-label text-muted">{d.lines.label}:</span>
          {PATTERN_LINES.map((line) => {
            const active = line === activeLine;
            return (
              <Link
                key={line}
                href={lineHref(locale, sp, line)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-medium transition-[background-color,color,border-color] duration-200",
                  active ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {d.lines[line]}
              </Link>
            );
          })}
        </div>

        <Suspense fallback={null}>
          <FilterBar
            total={list.length}
            categories={usedCats.map((c) => ({ id: c.slug, label: t(c.name, locale) }))}
            sorts={[
              { id: "new", label: d.common.new },
              { id: "trending", label: d.common.trending },
              { id: "best", label: d.common.bestSeller },
              { id: "popular", label: locale === "fa" ? "محبوب‌ترین" : "Most liked" },
              { id: "price-asc", label: locale === "fa" ? "ارزان‌ترین" : "Price: low to high" },
              { id: "price-desc", label: locale === "fa" ? "گران‌ترین" : "Price: high to low" },
            ]}
            extra={[
              { key: "space", label: d.nav.spaces, options: site.spaces.map((s) => ({ id: s.slug, label: t(s.name, locale) })) },
              { key: "owner", label: d.common.creator, options: [{ id: "artist", label: d.nav.artists }, { id: "site", label: d.brand }] },
            ]}
          />
        </Suspense>
        <div className="mt-8">
          <Suspense fallback={<GridSkeleton />}>
            <PatternGrid patterns={list} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
