"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ErrorState, SuccessState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { href } from "@/lib/utils";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto h-9 w-9 text-foreground" />
        <p className="mt-6 text-sm text-error">{dict.auth.invalidResetLink}</p>
        <Button href={href(locale, "/login")} className="mt-6">{dict.auth.backToLogin}</Button>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto h-9 w-9 text-foreground" />
        <div className="mt-6"><SuccessState message={dict.auth.passwordResetSuccess} /></div>
        <Button href={href(locale, "/login")} className="mt-6">{dict.nav.login}</Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    try {
      const r = await fetch("/api/auth/reset-password", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setError(j.error === "invalid_or_expired_token" ? dict.auth.invalidResetLink : dict.common.error);
        setState("error");
        return;
      }
      setState("done");
      router.refresh();
    } catch {
      setError(dict.common.error);
      setState("error");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <Logo className="h-9 w-9 text-foreground" />
      <h1 className="mt-6 font-display text-h1">{dict.auth.resetPassword}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label={dict.auth.newPassword}>
          <Input name="password" type="password" required dir="ltr" minLength={6} autoComplete="new-password" autoFocus />
        </Field>
        {state === "error" && error && <ErrorState message={error} />}
        <Button type="submit" size="lg" className="w-full" disabled={state === "loading"}>{dict.auth.setNewPassword}</Button>
      </form>
    </div>
  );
}
