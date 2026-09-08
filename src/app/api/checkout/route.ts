import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { getSession } from "@/lib/auth";
import { placeOrder, type CheckoutLine } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

interface CheckoutBody {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  currency?: "fa" | "en";
  lines?: Array<{ listingId?: string; title?: string; image?: string; unitPrice?: number; qty?: number }>;
}

/**
 * Real (simulated-payment) checkout endpoint: creates a persisted `orders` + `order_items` row
 * for every cart line, freezes each artist's commission split at sale time, and credits the
 * artist ledger — no external payment gateway is called, the order is marked "paid" immediately,
 * exactly as agreed for the MVP.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CheckoutBody | null;
  if (!body?.customerName?.trim() || !body?.customerEmail?.trim() || !Array.isArray(body.lines) || !body.lines.length) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const lines: CheckoutLine[] = [];
  for (const l of body.lines) {
    const qty = Math.max(1, Math.round(Number(l.qty) || 1));
    const unitPrice = Math.round(Number(l.unitPrice) || 0);
    if (!l.listingId || !l.title || unitPrice <= 0) continue;
    lines.push({ listingId: l.listingId, title: l.title, image: l.image ?? "", unitPrice, qty });
  }
  if (!lines.length) return NextResponse.json({ ok: false, error: "empty_cart" }, withNoStore({ status: 400 }));

  const session = await getSession();
  const order = await placeOrder({
    userId: session?.id ?? null,
    customerName: body.customerName.trim(),
    customerEmail: body.customerEmail.trim(),
    customerPhone: body.customerPhone?.trim(),
    shippingAddress: body.shippingAddress?.trim(),
    currency: body.currency === "en" ? "en" : "fa",
    lines,
  });
  return NextResponse.json({ ok: true, order }, withNoStore({ status: 201 }));
}
