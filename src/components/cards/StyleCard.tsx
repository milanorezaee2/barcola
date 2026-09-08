"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CineModal, CineModalHero, CineModalRow } from "@/components/ui/CineModal";
import { useCinemaModal } from "@/hooks/useCinemaModal";
import { cn } from "@/lib/utils";

/** Editorial tile with typographic overlay + directional arrow. Used for Styles/Spaces/Collections.
 * After a 2s hover/focus dwell, a large cinematic modal opens showing the full photo and
 * description with a link through to the destination. */
export function StyleCard({ href, title, description, image, className, count, big }: { href: string; title: string; description?: string; image: string; className?: string; count?: string; big?: boolean }) {
  const cine = useCinemaModal();
  return (
    <>
      <Link href={href} {...cine.cardBind} className={cn("group relative block overflow-hidden rounded-xl border border-border bg-background-secondary", className)}>
        <Image src={image} alt={title} fill sizes="(max-width:768px) 50vw, 25vw" className="img-zoom object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className={cn("font-display leading-none text-balance", big ? "text-h2" : "text-h3")}>{title}</h3>
              {description && <p className="mt-1.5 line-clamp-1 text-caption text-white/75 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 md:block hidden">{description}</p>}
              {count && <p className="mt-1 text-caption text-white/70 tabular">{count}</p>}
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition-[background-color,border-color] duration-300 group-hover:bg-white group-hover:text-black">
              <ArrowRight className="h-4 w-4 rtl-flip arrow-shift" />
            </span>
          </div>
        </div>
      </Link>

      <CineModal open={cine.open} onClose={cine.close} modalBind={cine.modalBind} label={title}>
        <CineModalHero className="aspect-[16/9]">
          <Image src={image} alt={title} fill sizes="(max-width:896px) 100vw, 896px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.45)" }}>
            <h2 className="font-display text-h1 leading-tight text-balance">{title}</h2>
            {count && <p className="mt-1 text-caption text-white/75 tabular">{count}</p>}
          </div>
        </CineModalHero>
        {description && (
          <div className="p-6 md:p-8">
            <CineModalRow step={0}>
              <p className="text-body-sm text-foreground-secondary">{description}</p>
            </CineModalRow>
            <CineModalRow step={1} className="mt-6">
              <Link href={href} className="inline-flex h-11 items-center gap-1.5 rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90">
                {title}
                <ArrowUpRight className="h-4 w-4 rtl-flip" />
              </Link>
            </CineModalRow>
          </div>
        )}
      </CineModal>
    </>
  );
}
