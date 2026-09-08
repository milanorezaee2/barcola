"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Clock3, Coins, ListChecks, Package, Plus, ShieldAlert, Trash2, Wallet } from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, Skeleton, SuccessState, EmptyState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { cn, href } from "@/lib/utils";

/** Grace period before an unauthenticated visitor is sent to /login (ms). */
const REDIRECT_GRACE_MS = 300;

type ListingStatus = "draft" | "pending_review" | "published" | "rejected" | "archived";
interface ListingRow {
  id: string; kind: "pattern" | "product"; slug: string; sku: string;
  titleFa: string; titleEn: string; descriptionFa: string; descriptionEn: string;
  image: string; priceFa: number; priceEn: number; status: ListingStatus; rejectionReason: string | null;
  createdAt: string;
}
interface LedgerEntry { id: string; type: string; amount: number; currency: string; note: string; createdAt: string; }
interface OrderItemRow { id: string; title: string; image: string; unitPrice: number; qty: number; lineTotal: number; artistEarning: number; commissionAmount: number; }
interface PayoutRow { id: string; amount: number; currency: string; status: string; destination: string; requestedAt: string; }
interface ArtistProfile { id: string; slug: string; displayNameFa: string; displayNameEn: string; commissionPct: string; status: "pending" | "approved" | "rejected" | "suspended"; }
interface DashboardPayload {
  profile: ArtistProfile | null;
  balance: number;
  stats: { totalSales: number; totalEarnings: number; totalCommission: number; itemsSold: number; orders: number };
  recentSales: OrderItemRow[];
  ledger: LedgerEntry[];
  payouts: PayoutRow[];
}

type Tab = "overview" | "listings" | "payouts";

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null }> {
  const r = await fetch(url, { ...SESSION_FETCH, ...init });
  const data = (await r.json().catch(() => null)) as T | null;
  return { ok: r.ok, status: r.status, data };
}

export function StudioApp() {
  const { user, ready } = useAuth();
  const { locale, dict } = useLocale();
  const router = useRouter();
  const fa = locale === "fa";
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoadError(null);
    const r = await api<DashboardPayload & { ok: boolean }>("/api/artists/me/dashboard");
    if (!r.ok || !r.data) return setLoadError(fa ? "خطا در بارگذاری اطلاعات." : "Could not load dashboard data.");
    setDashboard(r.data);
  }, [fa]);

  useEffect(() => {
    if (!ready || user !== null) return;
    const id = window.setTimeout(() => router.replace(href(locale, "/login")), REDIRECT_GRACE_MS);
    return () => window.clearTimeout(id);
  }, [ready, user, router, locale]);

  useEffect(() => {
    if (!ready || user?.role !== "artist") return;
    void loadDashboard();
  }, [ready, user, loadDashboard]);

  if (user && user.role !== "artist") {
    return (
      <div className="container-x max-w-xl pt-[calc(var(--header-h)+4rem)] pb-20">
        <ErrorState message={fa ? "این حساب دسترسی هنرمند ندارد." : "This account does not have artist access."} />
      </div>
    );
  }

  if (!ready || !user) {
    return (
      <div className="container-x pt-[calc(var(--header-h)+4rem)] pb-20">
        <div className="space-y-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40" /></div>
      </div>
    );
  }

  const status = user.artistStatus;

  if (status === "pending") {
    return (
      <div className="container-x max-w-xl pt-[calc(var(--header-h)+4rem)] pb-20">
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-8 text-center">
          <Clock3 className="mx-auto h-8 w-8 text-warning" />
          <h1 className="mt-4 font-display text-h2">{fa ? "درخواست شما در حال بررسی است" : "Your application is under review"}</h1>
          <p className="mt-2 text-body-sm text-foreground-secondary">{fa ? "پس از تأیید مدیر، امکان انتشار الگو یا محصول و دریافت پورسانت فروش برایتان فعال می‌شود." : "Once an admin approves your account, you'll be able to publish listings and earn commissioned sales."}</p>
        </div>
      </div>
    );
  }
  if (status === "rejected" || status === "suspended") {
    return (
      <div className="container-x max-w-xl pt-[calc(var(--header-h)+4rem)] pb-20">
        <div className="rounded-lg border border-error/30 bg-error/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-error" />
          <h1 className="mt-4 font-display text-h2">{status === "rejected" ? (fa ? "درخواست شما رد شد" : "Your application was rejected") : (fa ? "حساب شما معلق شده است" : "Your account is suspended")}</h1>
          <p className="mt-2 text-body-sm text-foreground-secondary">{fa ? "برای اطلاعات بیشتر با پشتیبانی تماس بگیرید." : "Contact support for more information."}</p>
        </div>
      </div>
    );
  }

  const nav: { id: Tab; label: string; icon: typeof ListChecks }[] = [
    { id: "overview", label: fa ? "نمای کلی" : "Overview", icon: Coins },
    { id: "listings", label: fa ? "الگو / محصولات من" : "My Listings", icon: Package },
    { id: "payouts", label: fa ? "برداشت‌ها" : "Payouts", icon: Wallet },
  ];

  return (
    <div className="container-x pt-[calc(var(--header-h)+2rem)] pb-20">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-label text-accent">{dict.nav.studio}</p>
          <h1 className="mt-1 font-display text-h1">{fa ? "استودیوی هنرمند" : "Artist Studio"}</h1>
        </div>
        <Badge tone="success">{fa ? "تأیید‌شده" : "Approved"} · {dashboard?.profile?.commissionPct ?? "—"}% {fa ? "کمیسیون پلتفرم" : "platform commission"}</Badge>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <nav className="lg:col-span-3">
          <ul className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
            {nav.map((n) => (
              <li key={n.id}>
                <button onClick={() => setTab(n.id)} className={cn("flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-start text-sm transition-colors", tab === n.id ? "bg-foreground text-background" : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground")}>
                  <n.icon className="h-4 w-4" />{n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lg:col-span-9">
          {loadError ? (
            <ErrorState message={loadError} onRetry={loadDashboard} />
          ) : !dashboard ? (
            <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /></div>
          ) : (
            <div key={tab} className="anim-fade-up">
              {tab === "overview" && <Overview dashboard={dashboard} fa={fa} />}
              {tab === "listings" && <ListingsTab fa={fa} />}
              {tab === "payouts" && <PayoutsTab dashboard={dashboard} fa={fa} onChange={loadDashboard} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function money(n: number, fa: boolean) {
  return fa ? `${n.toLocaleString("en-US")} تومان` : `$${n.toLocaleString("en-US")}`;
}

/* ---------------- Overview ---------------- */
function Overview({ dashboard, fa }: { dashboard: DashboardPayload; fa: boolean }) {
  const { stats, balance, recentSales, ledger } = dashboard;
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={fa ? "موجودی قابل برداشت" : "Available balance"} value={money(balance, fa)} icon={Wallet} />
        <StatCard label={fa ? "درآمد کل" : "Total earnings"} value={money(stats.totalEarnings, fa)} icon={Coins} />
        <StatCard label={fa ? "تعداد فروش" : "Items sold"} value={String(stats.itemsSold)} icon={Package} />
        <StatCard label={fa ? "تعداد سفارش" : "Orders"} value={String(stats.orders)} icon={ListChecks} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 md:p-6">
        <h2 className="font-semibold">{fa ? "فروش‌های اخیر" : "Recent sales"}</h2>
        {!recentSales.length ? (
          <p className="mt-4 text-sm text-foreground-secondary">{fa ? "هنوز فروشی ثبت نشده است." : "No sales yet."}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recentSales.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="truncate">{s.title} × {s.qty}</span>
                <span className="tabular text-foreground-secondary">{fa ? `${s.artistEarning.toLocaleString("en-US")} T` : `$${s.artistEarning.toLocaleString("en-US")}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 md:p-6">
        <h2 className="font-semibold">{fa ? "دفتر تراکنش‌ها" : "Ledger"}</h2>
        {!ledger.length ? (
          <p className="mt-4 text-sm text-foreground-secondary">{fa ? "تراکنشی وجود ندارد." : "No transactions yet."}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {ledger.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="flex items-center gap-2"><Badge tone={l.amount >= 0 ? "success" : "outline"}>{l.type}</Badge><span className="truncate text-foreground-secondary">{l.note}</span></span>
                <span className={cn("tabular", l.amount >= 0 ? "text-success" : "text-error")}>{l.amount >= 0 ? "+" : ""}{l.amount.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Coins }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Icon className="h-5 w-5 text-accent" />
      <p className="mt-4 font-display text-h3 tabular">{value}</p>
      <p className="text-caption text-foreground-secondary">{label}</p>
    </div>
  );
}

/* ---------------- Listings ---------------- */
const emptyForm = { kind: "pattern" as "pattern" | "product", titleFa: "", titleEn: "", descriptionFa: "", descriptionEn: "", image: "", priceFa: "", priceEn: "", categorySlug: "" };

function ListingsTab({ fa }: { fa: boolean }) {
  const [rows, setRows] = useState<ListingRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await api<{ ok: boolean; listings: ListingRow[] }>("/api/artists/me/listings");
    if (!r.ok || !r.data) return setErr(fa ? "خطا در بارگذاری." : "Could not load listings.");
    setRows(r.data.listings);
  }, [fa]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    if (!form.titleFa || !form.titleEn || !form.image || !Number(form.priceFa) || !Number(form.priceEn)) {
      setFormErr(fa ? "عنوان (فارسی و انگلیسی)، تصویر و قیمت (هر دو ارز) الزامی است." : "Title (FA & EN), image and both prices are required.");
      return;
    }
    setBusy(true);
    const r = await api<{ ok: boolean; error?: string }>("/api/artists/me/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, priceFa: Number(form.priceFa), priceEn: Number(form.priceEn) }),
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) return setFormErr(fa ? "ثبت الگو/محصول ناموفق بود." : "Could not create the listing.");
    setForm(emptyForm);
    setShowForm(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm(fa ? "این مورد حذف شود؟" : "Delete this listing?")) return;
    await api(`/api/artists/me/listings/${id}`, { method: "DELETE" });
    void load();
  };

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{fa ? "الگو‌ها و محصولات من" : "My listings"}</h2>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus className="h-4 w-4" />{fa ? "افزودن جدید" : "New listing"}</Button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "نوع" : "Kind"}>
              <Select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as "pattern" | "product" }))}>
                <option value="pattern">{fa ? "الگو" : "Pattern"}</option>
                <option value="product">{fa ? "محصول" : "Product"}</option>
              </Select>
            </Field>
            <Field label={fa ? "دسته (اختیاری)" : "Category (optional)"}><Input value={form.categorySlug} onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))} /></Field>
            <Field label={fa ? "عنوان (فارسی)" : "Title (Persian)"}><Input dir="rtl" value={form.titleFa} onChange={(e) => setForm((f) => ({ ...f, titleFa: e.target.value }))} /></Field>
            <Field label={fa ? "عنوان (انگلیسی)" : "Title (English)"}><Input value={form.titleEn} onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))} /></Field>
            <Field label={fa ? "قیمت به تومان" : "Price (Toman)"}><Input type="number" min={0} value={form.priceFa} onChange={(e) => setForm((f) => ({ ...f, priceFa: e.target.value }))} /></Field>
            <Field label={fa ? "قیمت به دلار" : "Price (USD)"}><Input type="number" min={0} value={form.priceEn} onChange={(e) => setForm((f) => ({ ...f, priceEn: e.target.value }))} /></Field>
            <Field label={fa ? "آدرس تصویر" : "Image URL"}><Input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="/images/patterns/example.jpg" /></Field>
          </div>
          <Field label={fa ? "توضیحات (فارسی)" : "Description (Persian)"}><Textarea dir="rtl" value={form.descriptionFa} onChange={(e) => setForm((f) => ({ ...f, descriptionFa: e.target.value }))} /></Field>
          <Field label={fa ? "توضیحات (انگلیسی)" : "Description (English)"}><Textarea value={form.descriptionEn} onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))} /></Field>
          {formErr && <p className="text-sm text-error">{formErr}</p>}
          <p className="text-caption text-muted">{fa ? "پس از ثبت، این مورد در صف بررسی مدیر قرار می‌گیرد و تا زمان تأیید در فروشگاه نمایش داده نمی‌شود." : "After submitting, this listing enters the admin review queue and won't appear on the storefront until approved."}</p>
          <Button type="submit" disabled={busy}>{busy ? (fa ? "در حال ثبت…" : "Submitting…") : (fa ? "ثبت برای بررسی" : "Submit for review")}</Button>
        </form>
      )}

      {!rows.length ? (
        <EmptyState title={fa ? "هنوز الگو یا محصولی ثبت نکرده‌اید." : "You haven't created any listings yet."} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.titleEn || r.titleFa} <span className="text-caption text-muted">· {r.sku}</span></p>
                <p className="mt-1 text-caption text-foreground-secondary">{money(r.priceEn, false)} / {money(r.priceFa, true)}</p>
                {r.status === "rejected" && r.rejectionReason && <p className="mt-1 text-caption text-error">{fa ? "دلیل رد" : "Rejected"}: {r.rejectionReason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} fa={fa} />
                <button onClick={() => remove(r.id)} aria-label="delete" className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-secondary hover:text-error"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status, fa }: { status: ListingStatus; fa: boolean }) {
  const tone = status === "published" ? "success" : status === "rejected" ? "error" : status === "pending_review" ? "warning" : "outline";
  const label: Record<ListingStatus, string> = {
    draft: fa ? "پیش‌نویس" : "Draft",
    pending_review: fa ? "در انتظار بررسی" : "Pending review",
    published: fa ? "منتشرشده" : "Published",
    rejected: fa ? "رد‌شده" : "Rejected",
    archived: fa ? "بایگانی" : "Archived",
  };
  return <Badge tone={tone}>{label[status]}</Badge>;
}

/* ---------------- Payouts ---------------- */
function PayoutsTab({ dashboard, fa, onChange }: { dashboard: DashboardPayload; fa: boolean; onChange: () => void }) {
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(false);
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) return setErr(fa ? "مبلغ نامعتبر است." : "Invalid amount.");
    setBusy(true);
    const r = await api<{ ok: boolean; error?: string }>("/api/artists/me/payouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: amt, currency: fa ? "fa" : "en", destination }),
    });
    setBusy(false);
    if (!r.ok || !r.data?.ok) return setErr(r.data?.error === "insufficient_balance" ? (fa ? "موجودی کافی نیست." : "Insufficient balance.") : fa ? "درخواست ناموفق بود." : "Request failed.");
    setOk(true);
    setAmount("");
    setDestination("");
    onChange();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5 md:p-6">
        <h2 className="font-semibold">{fa ? "درخواست برداشت (شبیه‌سازی‌شده)" : "Request a payout (simulated)"}</h2>
        <p className="mt-1 text-caption text-foreground-secondary">{fa ? `موجودی قابل برداشت: ${money(dashboard.balance, fa)}. این نسخه بدون درگاه پرداخت واقعی است؛ درخواست بلافاصله در دفتر حساب ثبت می‌شود.` : `Available balance: ${money(dashboard.balance, fa)}. No real payment gateway is connected — the request is recorded immediately in your ledger.`}</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label={fa ? "مبلغ" : "Amount"}><Input type="number" min={1} max={dashboard.balance} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label={fa ? "شماره حساب / شبا" : "Bank account / destination"}><Input value={destination} onChange={(e) => setDestination(e.target.value)} dir="ltr" /></Field>
          <div className="flex items-end"><Button type="submit" disabled={busy || dashboard.balance <= 0} className="w-full">{busy ? (fa ? "در حال ارسال…" : "Sending…") : (fa ? "درخواست برداشت" : "Request payout")}</Button></div>
        </form>
        {err && <p className="mt-3 text-sm text-error">{err}</p>}
        {ok && <div className="mt-3"><SuccessState message={fa ? "درخواست برداشت ثبت شد." : "Payout request recorded."} /></div>}
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 md:p-6">
        <h2 className="font-semibold">{fa ? "تاریخچه برداشت‌ها" : "Payout history"}</h2>
        {!dashboard.payouts.length ? (
          <p className="mt-4 text-sm text-foreground-secondary">{fa ? "هنوز برداشتی ثبت نشده است." : "No payouts yet."}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {dashboard.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>{new Date(p.requestedAt).toLocaleDateString(fa ? "fa-IR" : "en-US")} · {p.destination || "—"}</span>
                <span className="flex items-center gap-2"><Badge tone="success">{p.status}</Badge><span className="tabular">{p.amount.toLocaleString("en-US")}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
