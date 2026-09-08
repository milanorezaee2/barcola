import { cn } from "@/lib/utils";

type Tone = "default" | "secondary" | "bleed";

/**
 * Shared outer chrome for homepage sections.
 *
 * - `default` / `secondary` sections are rendered inside a neat, consistently-radiused card
 *   (hairline border + soft shadow) so every content block reads as a distinct, tidy module —
 *   this replaces the old ad-hoc `hairline` top-border dividers.
 * - `bleed` sections (Hero, Exclusive, B2B/Custom) render edge-to-edge, untouched, to keep their
 *   cinematic full-bleed impact.
 *
 * Vertical rhythm between *all* sections (boxed or bleed) comes from the `gap` on the homepage's
 * flex wrapper in `page.tsx`, not from margins here — so spacing stays perfectly even no matter
 * which sections are toggled on/off.
 */
export function SectionShell({
  id,
  tone = "default",
  className,
  innerClassName,
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  if (tone === "bleed") {
    return (
      <section id={id} className={cn("relative", className)}>
        {children}
      </section>
    );
  }
  return (
    <section id={id} className={cn("container-x", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border shadow-soft md:rounded-[28px]",
          tone === "secondary" ? "bg-background-secondary" : "bg-surface",
        )}
      >
        <div className={cn("px-5 py-12 sm:px-8 md:px-12 md:py-16 lg:py-20", innerClassName)}>{children}</div>
      </div>
    </section>
  );
}
