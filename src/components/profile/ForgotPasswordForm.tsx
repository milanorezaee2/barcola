"use client";

import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { SESSION_FETCH } from "@/lib/http";
import { href } from "@/lib/utils";

/**
 * Simulated "forgot password" step shown inline on the login face. No real email service is
 * connected (consistent with the rest of the platform's simulated flows) — instead of "check your
 * inbox", the one-time reset link is generated and shown directly on screen so the whole loop
 * (request → reset → sign in with the new password) is testable end-to-end.
 */
export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { locale, dict } = useLocale();
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [resetLink, setResetLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: String(fd.get("email") ?? "") }),
      });
      const j = (await r.json()) as { ok: boolean; token?: string | null };
      if (!r.ok || !j.ok) throw new Error();
      setResetLink(j.token ? `${window.location.origin}${href(locale, `/reset-password?token=${j.token}`)}` : null);
      setState("sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className="space-y-4">
        <p className="font-medium text-foreground">{dict.auth.resetLinkSentTitle}</p>
        <p className="text-sm text-foreground-secondary">{dict.auth.resetLinkSentDesc}</p>
        {resetLink && (
          <a href={resetLink} className="block break-all rounded-md border border-border bg-background-secondary px-3.5 py-2.5 text-sm text-accent underline-offset-4 hover:underline" dir="ltr">
            {resetLink}
          </a>
        )}
        <button type="button" onClick={onBack} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
          {dict.auth.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-foreground-secondary">{dict.auth.resetPasswordDesc}</p>
      <Field label={dict.common.email}>
        <Input name="email" type="email" required dir="ltr" autoComplete="email" autoFocus />
      </Field>
      {state === "error" && <p role="alert" className="text-sm text-error">{dict.common.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={state === "loading"}>
        {dict.auth.sendResetLink}
      </Button>
      <button type="button" onClick={onBack} className="block w-full text-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
        {dict.auth.backToLogin}
      </button>
    </form>
  );
}
