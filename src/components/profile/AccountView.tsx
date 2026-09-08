"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Heart, LogOut, Package, Palette, Settings, ShieldCheck } from "lucide-react";
import { useAuth, useCart, useFavorites, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { faNum, href } from "@/lib/utils";

export function AccountView() {
  const { user, logout } = useAuth();
  const { ids } = useFavorites();
  const { lines } = useCart();
  const { locale, dict } = useLocale();
  const router = useRouter();
  const fa = locale === "fa";
  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => router.replace(href(locale, "/login")), 50);
      return () => clearTimeout(t);
    }
  }, [user, router, locale]);
  if (!user) return <div className="container-x pt-[calc(var(--header-h)+4rem)] pb-20"><div className="skeleton h-40 rounded-lg" /></div>;

  return (
    <div className="container-x pt-[calc(var(--header-h)+2.5rem)] pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label text-accent">{dict.nav.account}</p>
          <h1 className="mt-2 font-display text-h1">{fa ? "سلام،" : "Hello,"} {user.name}</h1>
          <p className="mt-1 text-sm text-foreground-secondary" dir="ltr">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && <Button href={href(locale, "/admin")} variant="outline"><ShieldCheck className="h-4 w-4" />{dict.nav.admin}</Button>}
          {user.role === "artist" && <Button href={href(locale, "/studio")} variant="outline"><Palette className="h-4 w-4" />{dict.nav.studio}</Button>}
          <Button variant="ghost" onClick={() => { logout(); router.push(href(locale, "/")); }}><LogOut className="h-4 w-4" />{fa ? "خروج" : "Sign out"}</Button>
        </div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Link href={href(locale, "/favorites")} className="rounded-lg border border-border p-6 transition-shadow hover:shadow-medium"><Heart className="h-5 w-5 text-accent" /><p className="mt-4 font-display text-h2 tabular">{fa ? faNum(ids.size) : ids.size}</p><p className="text-caption text-foreground-secondary">{dict.common.favorite}</p></Link>
        <Link href={href(locale, "/checkout")} className="rounded-lg border border-border p-6 transition-shadow hover:shadow-medium"><Package className="h-5 w-5 text-accent" /><p className="mt-4 font-display text-h2 tabular">{fa ? faNum(lines.length) : lines.length}</p><p className="text-caption text-foreground-secondary">{dict.nav.cart}</p></Link>
        <div className="rounded-lg border border-border p-6"><Settings className="h-5 w-5 text-accent" /><p className="mt-4 font-medium">{fa ? "تنظیمات" : "Settings"}</p><p className="text-caption text-foreground-secondary">{fa ? "زبان، حالت نمایش و اعلان‌ها" : "Language, theme and notifications"}</p></div>
      </div>
      <div className="mt-10"><p className="text-label text-muted">{fa ? "سفارش‌های اخیر" : "Recent orders"}</p><div className="mt-3"><EmptyState title={fa ? "هنوز سفارشی ندارید." : "No orders yet."} action={<Button href={href(locale, "/shop")} size="sm" variant="outline">{dict.common.continueShopping}</Button>} /></div></div>
    </div>
  );
}
