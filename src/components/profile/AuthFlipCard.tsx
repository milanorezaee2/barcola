"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { AuthForm } from "@/components/profile/AuthForm";
import { cn, href } from "@/lib/utils";

interface Face {
  title: string;
  description: string;
  image: string;
  quote: string;
}

// A slow, weighted "card turning over" curve (accelerate, hold, decelerate into place) instead of
// a quick linear/ease-out — this is what actually reads as cinematic rather than a snap-cut.
const FLIP_TRANSITION = { duration: 1.2, ease: [0.65, 0, 0.35, 1] as const };
const INSTANT_TRANSITION = { duration: 0.001 };

// `translateZ(1px)` forces each face onto its own compositor layer. Without an explicit Z
// separation, some browsers (notably Chromium at certain zoom/DPR combinations) keep both
// `backface-visibility: hidden` faces on the same coplanar layer and can hit-test — or even
// briefly paint — the wrong one until something forces a repaint, which is what made the card
// look like it needed two clicks to reach the signup face. The 1px offset is visually invisible
// but gives the browser a real depth cue to resolve which face is actually facing the camera.
const faceStyle: React.CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" as never, transform: "translateZ(1px)" };
const backFaceStyle: React.CSSProperties = { ...faceStyle, transform: "rotateY(180deg) translateZ(1px)" };

/**
 * A genuine 3D card flip. Both faces of the card — one arranged for "login", one for "signup" —
 * are mounted at all times, stacked exactly on top of each other with `backface-visibility: hidden`,
 * and the whole card rotates around its vertical axis with `rotateY`. The back face has
 * `rotateY(180deg)` baked into its own transform, so once the card finishes a 180° turn the two
 * rotations cancel out and its content lands upright and perfectly legible — never mirrored.
 * Only `transform` (rotateY / scale) is ever animated; `opacity` is never touched, so nothing
 * fades, dims, or blurs at any point. On each face the photo and the form sit on opposite sides
 * from the other face, so the flip also physically carries the image from one side of the card to
 * the other as it turns.
 */
export function AuthFlipCard({ initialMode, login, signup }: { initialMode: "login" | "signup"; login: Face; signup: Face }) {
  const { locale } = useLocale();
  const { logout } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [justSignedUpEmail, setJustSignedUpEmail] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const fa = locale === "fa";

  // Whichever mode this page opened on lives on the "front" (rotateY 0); the other mode lives on
  // the "back" (rotateY 180, baked in) and is revealed by turning the whole card over.
  const frontMode = initialMode;
  const backMode: "login" | "signup" = initialMode === "login" ? "signup" : "login";
  const flipped = mode !== frontMode;

  // A 180° turn looks identical whether it spins one way or the other, but spinning "with" the
  // reading direction feels more natural — purely cosmetic, still a pure transform.
  const dirSign = fa ? -1 : 1;
  const transition = reduceMotion ? INSTANT_TRANSITION : FLIP_TRANSITION;

  const goTo = (next: "login" | "signup") => {
    setMode(next);
    // Keep the address bar in sync without a navigation/remount, so the flip isn't interrupted.
    window.history.replaceState(null, "", href(locale, `/${next}`));
  };
  const flip = () => {
    setJustSignedUpEmail(null);
    goTo(mode === "login" ? "signup" : "login");
  };
  const handleSignupSuccess = (email: string) => {
    // The account was just created (and locally auto-authenticated) — sign it back out so
    // turning over to the login face is meaningful and the header doesn't show a logged-in
    // state before the user has actually signed in.
    logout();
    setJustSignedUpEmail(email);
    goTo("login");
  };

  const noticeFor = (faceMode: "login" | "signup") =>
    faceMode === "login" && justSignedUpEmail
      ? fa
        ? "ثبت‌نام با موفقیت انجام شد. اکنون وارد شوید."
        : "Account created. Please sign in."
      : undefined;

  const renderFace = (faceMode: "login" | "signup", photoSide: "start" | "end") => {
    const data = faceMode === "login" ? login : signup;
    return (
      <div className="grid h-full lg:grid-cols-2">
        <div className={`relative hidden min-h-[560px] lg:block ${photoSide === "start" ? "lg:order-1" : "lg:order-2"}`}>
          <Image src={data.image} alt="" fill sizes="50vw" className="object-cover" priority={faceMode === frontMode} />
          <div className="absolute inset-0 vignette" />
          <p className="absolute inset-x-0 bottom-0 max-w-md text-balance p-10 font-display text-h2 text-white">{data.quote}</p>
        </div>
        <div className={`flex items-center justify-center px-6 py-12 sm:px-10 lg:py-16 ${photoSide === "start" ? "lg:order-2" : "lg:order-1"}`}>
          <div className="w-full max-w-sm">
            <Logo className="h-9 w-9 text-foreground" />
            <h1 className="mt-6 font-display text-h1">{data.title}</h1>
            <p className="mt-2 text-body-sm text-foreground-secondary">{data.description}</p>
            <div className="mt-8">
              <AuthForm
                mode={faceMode}
                active={mode === faceMode}
                onSwitchMode={flip}
                onSignupSuccess={handleSignupSuccess}
                defaultEmail={faceMode === "login" ? (justSignedUpEmail ?? undefined) : undefined}
                notice={noticeFor(faceMode)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-[calc(var(--header-h)+2rem)] pb-16">
      <div className="w-full max-w-4xl [perspective:1800px]">
        <motion.div
          animate={{ rotateY: flipped ? 180 * dirSign : 0, scale: reduceMotion ? 1 : [1, 1.035, 1] }}
          transition={transition}
          style={{ transformStyle: "preserve-3d" }}
          className="relative min-h-[560px] w-full"
        >
          {/* front face */}
          <div
            style={faceStyle}
            aria-hidden={frontMode !== mode}
            inert={frontMode !== mode ? true : undefined}
            className={cn(
              "absolute inset-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated",
              frontMode !== mode && "pointer-events-none",
            )}
          >
            {renderFace(frontMode, "start")}
          </div>
          {/* back face — pre-rotated 180deg so it lands upright once the card finishes its turn */}
          <div
            style={backFaceStyle}
            aria-hidden={backMode !== mode}
            inert={backMode !== mode ? true : undefined}
            className={cn(
              "absolute inset-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated",
              backMode !== mode && "pointer-events-none",
            )}
          >
            {renderFace(backMode, "end")}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
