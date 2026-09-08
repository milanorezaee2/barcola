"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useCart, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sku } from "@/components/ui/Badge";
import { EmptyState, ErrorState, SuccessState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { formatPrice, href } from "@/lib/utils";

export function CheckoutView() {
  const { lines, clear } = useCart();
  const { locale, dict } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fa = locale === "fa";
  const total = lines.reduce((acc, l) => ({ fa: acc.fa + l.price.fa * l.qty, en: acc.en + l.price.en * l.qty }), { fa: 0, en: 0 });

  if (done) return <div className="container-x max-w-xl pt-[calc(var(--header-h)+4rem)] pb-20"><SuccessState message={`${fa ? "سفارش شما ثبت شد. شماره سفارش" : "Order placed. Order number"}: ${done}`} /><Button href={href(locale, "/")} className="mt-6" variant="outline">{dict.common.continueShopping}</Button></div>;
  if (!lines.length) return <div className="container-x max-w-xl pt-[calc(var(--header-h)+4rem)] pb-20"><EmptyState title={dict.common.emptyCart} description={dict.common.emptyCartDesc} action={<Button href={href(locale, "/shop")} size="sm" variant="outline">{dict.common.continueShopping}</Button>} /></div>;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/checkout", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: String(fd.get("name") ?? ""),
          customerEmail: String(fd.get("email") ?? user?.email ?? ""),
          customerPhone: String(fd.get("phone") ?? ""),
          shippingAddress: `${fd.get("address") ?? ""}, ${fd.get("city") ?? ""} ${fd.get("postal") ?? ""}`,
          currency: fa ? "fa" : "en",
          lines: lines.map((l) => ({ listingId: l.id, title: l.title, image: l.image, unitPrice: fa ? l.price.fa : l.price.en, qty: l.qty })),
        }),
      });
      const j = (await r.json()) as { ok: boolean; order?: { orderNumber: string } };
      if (!r.ok || !j.ok || !j.order) throw new Error();
      clear();
      setDone(j.order.orderNumber);
      router.refresh();
    } catch {
      setError(fa ? "ثبت سفارش ناموفق بود. دوباره تلاش کنید." : "Could not place the order. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x pt-[calc(var(--header-h)+2.5rem)] pb-20">
      <h1 className="font-display text-h1">{dict.common.checkout}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <form className="space-y-4 lg:col-span-7" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={dict.common.name}><Input name="name" required autoComplete="name" /></Field>
            <Field label={dict.common.phone}><Input name="phone" type="tel" required dir="ltr" autoComplete="tel" /></Field>
            <Field label={dict.common.email}><Input name="email" type="email" required dir="ltr" autoComplete="email" /></Field>
            <Field label={dict.common.city}><Input name="city" required autoComplete="address-level2" /></Field>
            <div className="sm:col-span-2"><Field label={dict.common.address}><Input name="address" required autoComplete="street-address" /></Field></div>
            <Field label={dict.common.postal}><Input name="postal" dir="ltr" autoComplete="postal-code" /></Field>
          </div>
          {error && <ErrorState message={error} />}
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>{busy ? dict.common.loading : dict.common.placeOrder}</Button>
        </form>
        <aside className="lg:col-span-5">
          <div className="rounded-lg border border-border p-5">
            <ul className="divide-y divide-border">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-3">
                  <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-background-secondary"><Image src={l.image} alt="" fill sizes="56px" className="object-cover" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{l.title}</span><span className="mt-1 flex items-center gap-2 text-caption text-foreground-secondary"><Sku value={l.sku} />{l.colorName && <span>{l.colorName}</span>}<span>× {l.qty}</span></span></span>
                  <span className="text-sm font-semibold tabular">{formatPrice({ fa: l.price.fa * l.qty, en: l.price.en * l.qty }, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4"><span className="text-sm text-foreground-secondary">{dict.common.total}</span><span className="font-display text-h3 tabular">{formatPrice(total, locale)}</span></div>
            <p className="mt-2 text-caption text-muted">{dict.common.shippingNote}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
