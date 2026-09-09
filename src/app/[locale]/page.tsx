import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import {
  ArtistsSection,
  B2BCustomSection,
  BestSellersSection,
  DiscoverySection,
  EducationSection,
  ExclusiveSection,
  NewsletterSection,
  PatternRail,
  PortfoliosSection,
  SpacesSection,
  StoriesSection,
  StylesSection,
  SurfacesSection,
} from "@/components/home/sections";
import { artistStats, enrichEducation, enrichPattern, enrichPortfolio, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { PATTERN_LINES } from "@/lib/types";
import { t } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const meta = site.seo.find((s) => s.path === "/");
  return { title: meta ? { absolute: t(meta.title, locale) } : undefined, description: meta ? t(meta.description, locale) : undefined };
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];

  const sections = site.homeSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const on = (k: string) => sections.some((s) => s.key === k);

  const patterns = site.patterns.map((p) => enrichPattern(site, p));
  const products = site.products.slice().sort((a, b) => a.order - b.order).map((p) => enrichProduct(site, p));
  const portfolios = site.portfolios.map((p) => enrichPortfolio(site, p));
  const education = site.education.map((e) => enrichEducation(site, e));
  const artists = site.artists
    .filter((a) => a.featured)
    .map((a) => {
      const s = artistStats(site, a.id);
      return { ...a, featuredPattern: s.patterns[0] ?? null, portfolioPreview: s.portfolios.map((p) => p.cover), counts: { patterns: s.patterns.length, projects: s.portfolios.length } };
    });
  const heroPatterns = site.hero.featuredPatternIds.map((id) => site.patterns.find((p) => p.id === id)).filter(Boolean) as typeof site.patterns;
  const styleCounts = Object.fromEntries(site.categories.map((c) => [c.id, site.patterns.filter((p) => p.categoryId === c.id).length]));
  const featuredCats = site.categories.filter((c) => c.featured).sort((a, b) => a.order - b.order);

  // Surface-line showcase tiles (wallpaper · fabric · paint · clothing)
  const surfacesItems = PATTERN_LINES.map((line) => {
    const group = site.patterns.filter((p) => (p.line ?? "wallpaper") === line);
    return { key: line, count: group.length, image: group[0]?.image ?? site.hero.image };
  });

  // Cross-line rails — pick one best-seller / trending / new item from each of the four lines
  const line = (p: { line?: string }) => p.line ?? "wallpaper";
  const onePerLine = (items: typeof patterns) => PATTERN_LINES.map((l) => items.find((p) => line(p) === l)).filter((p): p is (typeof patterns)[number] => Boolean(p));
  const bestSellersPatterns = onePerLine(patterns.filter((p) => p.bestSeller));
  // Leading physical best-sellers first (atelier's own objects, then artist-made)
  const bestSellersProducts = [
    ...products.filter((p) => p.bestSeller && !p.artistId),
    ...products.filter((p) => p.bestSeller && p.artistId),
  ];
  // Exclusive — cross-line editorial picks + the atelier's leading physical objects
  const exclusivePatterns = onePerLine(patterns);
  const exclusiveProducts = products.filter((p) => !p.artistId && p.featured);

  return (
    <>
      {on("hero") && <Hero hero={site.hero} patterns={heroPatterns} stats={{ patterns: site.patterns.length * 40, artists: site.artists.length * 30, projects: site.portfolios.length * 20 }} />}
      <div className="flex flex-col gap-14 py-14 md:gap-20 md:py-20 lg:gap-24 lg:py-24">
        {on("discovery") && <DiscoverySection patterns={patterns.filter((p) => p.featured)} categories={featuredCats} />}
        {on("surfaces") && <SurfacesSection items={surfacesItems} />}
        {on("trending") && <PatternRail id="trending" eyebrow={d.common.trending} title={d.home.trendingTitle} description={d.home.trendingDesc} patterns={patterns.filter((p) => p.trending)} hrefPath="/patterns?sort=trending" tone="secondary" />}
        {on("bestSellers") && <BestSellersSection patterns={bestSellersPatterns} products={bestSellersProducts} />}
        {on("newPatterns") && <PatternRail id="new" eyebrow={d.common.new} title={d.home.newTitle} description={d.home.newDesc} patterns={patterns.filter((p) => p.isNew)} hrefPath="/patterns?sort=new" tone="secondary" />}
        {on("artists") && <ArtistsSection artists={artists} />}
        {on("portfolios") && <PortfoliosSection items={portfolios.filter((p) => p.featured)} eyebrow={d.nav.portfolio} title={d.home.portfolioTitle} description={d.home.portfolioDesc} hrefPath="/portfolio" />}
        {on("styles") && <StylesSection categories={featuredCats} counts={styleCounts} />}
        {on("spaces") && <SpacesSection spaces={site.spaces.slice().sort((a, b) => a.order - b.order)} />}
        {on("exclusive") && <ExclusiveSection patterns={exclusivePatterns} products={exclusiveProducts} />}
        {on("projects") && <PortfoliosSection items={portfolios.filter((p) => p.isProject)} eyebrow={d.nav.projects} title={d.home.projectsTitle} description={d.home.projectsDesc} hrefPath="/projects" />}
        {on("education") && <EducationSection items={[...education.filter((e) => e.featured), ...education.filter((e) => !e.featured && e.popular)]} tone="secondary" />}
        {(on("b2b") || on("custom")) && <B2BCustomSection image1={site.portfolios[0]?.cover ?? site.hero.image} image2={site.portfolios[3]?.cover ?? site.hero.image} />}
        {on("stories") && <StoriesSection stories={site.stories} artists={site.artists} />}
        {on("newsletter") && <NewsletterSection />}
      </div>
    </>
  );
}
