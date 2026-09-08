"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/AppProviders";
import { SESSION_FETCH } from "@/lib/http";
import { href } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, SuccessState } from "@/components/ui/States";

/**
 * Real artist application: creates an actual `users` row (role="artist") plus a linked
 * `artist_profiles` row in "pending" status. This replaces the old generic lead-capture form for
 * the "become a creator" flow — the applicant gets a real account and can track their approval
 * status from /studio, instead of the request only ever reaching an admin inbox.
 */
export function ArtistApplyForm({ options }: { options?: string[] }) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fa = locale === "fa";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/artists/apply", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          professionFa: fa ? String(fd.get("profession") ?? "") : undefined,
          professionEn: !fa ? String(fd.get("profession") ?? "") : undefined,
          bioFa: fa ? String(fd.get("message") ?? "") : undefined,
          bioEn: !fa ? String(fd.get("message") ?? "") : undefined,
        }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setError(j.error === "email_taken" ? (fa ? "این ایمیل قبلاً ثبت شده است." : "This email is already registered.") : fa ? "مشکلی پیش آمد." : "Something went wrong.");
        setState("error");
        return;
      }
      setState("ok");
    } catch {
      setError(fa ? "مشکلی پیش آمد." : "Something went wrong.");
      setState("error");
    }
  };

  if (state === "ok") {
    return (
      <div className="space-y-4">
        <SuccessState message={fa ? "درخواست شما ثبت شد و حساب هنرمندی شما ساخته شد. پس از تأیید مدیر، امکان انتشار الگو/محصول فعال می‌شود." : "Your application was submitted and your artist account was created. Once approved, you'll be able to publish listings."} />
        <Button onClick={() => router.push(href(locale, "/studio"))}>{fa ? "رفتن به استودیوی هنرمند" : "Go to Artist Studio"}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={dict.common.name}><Input name="name" required autoComplete="name" /></Field>
      <Field label={dict.common.email}><Input name="email" type="email" required dir="ltr" autoComplete="email" /></Field>
      <Field label={dict.common.password} hint={fa ? "حداقل ۶ کاراکتر" : "At least 6 characters"}><Input name="password" type="password" required dir="ltr" minLength={6} autoComplete="new-password" /></Field>
      {options && (
        <Field label={fa ? "نوع پروژه" : "Project type"}>
          <Select name="profession">{options.map((o) => <option key={o}>{o}</option>)}</Select>
        </Field>
      )}
      <div className="sm:col-span-2"><Field label={fa ? "درباره خودتان" : "About you"}><Textarea name="message" placeholder={fa ? "درباره سبک کاری، سابقه و نمونه‌کارها بنویسید…" : "Tell us about your style, experience and portfolio…"} /></Field></div>
      {state === "error" && <div className="sm:col-span-2"><ErrorState message={error ?? undefined} /></div>}
      <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={state === "loading"}>{dict.common.submit}</Button></div>
    </form>
  );
}
