"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ForgotPasswordForm } from "@/components/profile/ForgotPasswordForm";
import { href } from "@/lib/utils";

export function AuthForm({
  mode,
  active = true,
  onSwitchMode,
  onSignupSuccess,
  defaultEmail,
  notice,
}: {
  mode: "login" | "signup";
  active?: boolean;
  onSwitchMode?: () => void;
  /** Called instead of redirecting after a successful signup — lets the parent flip to the login face. */
  onSignupSuccess?: (email: string) => void;
  defaultEmail?: string;
  /** Success banner shown above the form, e.g. after landing here from a fresh signup. */
  notice?: string;
}) {
  const { locale, dict } = useLocale();
  const { login, signup } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const fa = locale === "fa";
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active) setForgot(false);
  }, [active]);

  /* When this face becomes the active (front-facing) side of the flip card, move focus to its
     first field — keeps the interaction keyboard/screen-reader friendly. */
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => firstFieldRef.current?.focus({ preventScroll: true }), 1250);
    return () => window.clearTimeout(id);
  }, [active]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const r = mode === "login"
      ? await login(email, String(fd.get("password")))
      : await signup(String(fd.get("name")), email, String(fd.get("password")));
    setBusy(false);
    if (!r.ok) {
      if (r.error === "admin_not_configured") return setErr(fa ? "حساب مدیر روی سرور پیکربندی نشده است (ADMIN_EMAIL / ADMIN_PASSWORD)." : "Admin account is not configured on the server (ADMIN_EMAIL / ADMIN_PASSWORD).");
      return setErr(fa ? "اطلاعات وارد شده معتبر نیست." : "Please check your details.");
    }
    if (mode === "signup") {
      if (onSignupSuccess) return onSignupSuccess(email);
      return router.push(href(locale, "/account"));
    }
    router.push(href(locale, email.toLowerCase().startsWith("admin@") ? "/admin" : "/account"));
  };

  if (mode === "login" && forgot) {
    return <ForgotPasswordForm onBack={() => setForgot(false)} />;
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {notice && <p role="status" className="rounded-md border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">{notice}</p>}
      {mode === "signup" && <Field label={dict.common.name}><Input ref={firstFieldRef} name="name" required autoComplete="name" /></Field>}
      <Field label={dict.common.email} hint={mode === "login" ? (fa ? "مدیران با ایمیل مدیریت وارد شوند." : "Admins: sign in with the admin email.") : undefined}>
        <Input ref={mode === "login" ? firstFieldRef : undefined} name="email" type="email" required dir="ltr" autoComplete="email" defaultValue={defaultEmail} />
      </Field>
      <div>
        <Field label={dict.common.password}><Input name="password" type="password" required dir="ltr" minLength={mode === "signup" ? 6 : 4} autoComplete={mode === "login" ? "current-password" : "new-password"} /></Field>
        {mode === "login" && (
          <button type="button" onClick={() => setForgot(true)} className="mt-2 text-caption font-medium text-foreground-secondary underline-offset-4 hover:text-foreground hover:underline">
            {dict.auth.forgotPassword}
          </button>
        )}
      </div>
      {err && <p role="alert" className="text-sm text-error">{err}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{mode === "login" ? dict.nav.login : dict.nav.signup}</Button>
      <p className="text-center text-sm text-foreground-secondary">
        {mode === "login" ? (
          <>
            {fa ? "حساب ندارید؟" : "No account?"}{" "}
            {onSwitchMode ? (
              <button type="button" onClick={onSwitchMode} className="font-medium text-foreground underline-offset-4 hover:underline">{dict.nav.signup}</button>
            ) : (
              <Link href={href(locale, "/signup")} className="font-medium text-foreground underline-offset-4 hover:underline">{dict.nav.signup}</Link>
            )}
          </>
        ) : (
          <>
            {fa ? "حساب دارید؟" : "Already have an account?"}{" "}
            {onSwitchMode ? (
              <button type="button" onClick={onSwitchMode} className="font-medium text-foreground underline-offset-4 hover:underline">{dict.nav.login}</button>
            ) : (
              <Link href={href(locale, "/login")} className="font-medium text-foreground underline-offset-4 hover:underline">{dict.nav.login}</Link>
            )}
          </>
        )}
      </p>
    </form>
  );
}
