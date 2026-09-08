"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Cancels the pending auto-close while the pointer is over the modal itself. */
  modalBind?: { onMouseEnter?: () => void; onMouseLeave?: () => void };
  label?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared shell for the "hover-dwell → cinematic modal" pattern used across every card grid.
 * A dark, blurred backdrop fades in behind a large centered panel that rises into place with a
 * slow 3D settle (scale + rotateX + blur → flat/sharp) — see the `ra-cm-*` keyframes in
 * globals.css. The panel itself is left to the caller (`children`) so each card kind can compose
 * its own hero-image / detail layout while sharing the same entrance choreography and close
 * behaviour (Escape, backdrop click, explicit ✕, or the hover grace-period from useCinemaModal).
 */
export function CineModal({ open, onClose, modalBind, label, className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal
      aria-label={label}
      style={{ animation: "ra-cm-backdrop 260ms var(--ease-out) both" }}
      onMouseEnter={modalBind?.onMouseEnter}
      onMouseLeave={modalBind?.onMouseLeave}
    >
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-foreground/45 backdrop-blur-md" />
      <div
        ref={ref}
        className="relative z-10 max-h-[88svh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[0_32px_88px_rgba(0,0,0,0.28),0_8px_24px_rgba(0,0,0,0.16)]"
        style={{ animation: "ra-cm-panel 560ms cubic-bezier(0.16,1,0.3,1) both", transformStyle: "preserve-3d" }}
      >
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute top-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full glass text-foreground transition-colors hover:bg-surface inset-inline-end-3.5"
        >
          <X className="h-4 w-4" />
        </button>
        {/* the layout classes (e.g. md:grid md:grid-cols-2) belong on THIS scrollable element —
            it's the direct parent of the hero + content children each card passes in, so this is
            what actually needs to lay them out side by side; putting them on the outer panel
            above did nothing since that div only ever has one child (this one). */}
        <div className={cn("max-h-[88svh] overflow-y-auto", className)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Hero image wrapper used inside CineModal panels — applies the slow Ken-Burns zoom-out entrance. */
export function CineModalHero({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-background-secondary", className)} style={{ animation: "ra-cm-image 900ms 60ms cubic-bezier(0.16,1,0.3,1) both" }}>
      {children}
    </div>
  );
}

/** Staggered detail row — pass an increasing `step` (0,1,2…) to delay each row after the panel settles. */
export function CineModalRow({ step = 0, children, className }: { step?: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ animation: `ra-cm-stagger 460ms ${180 + step * 90}ms var(--ease-out) both` }}>
      {children}
    </div>
  );
}
