import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/http";
import { resetPasswordWithToken } from "@/lib/marketplace/repo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: string; password?: string } | null;
  if (!body?.token || !body?.password || body.password.length < 6) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const result = await resetPasswordWithToken(body.token, body.password);
  if (!result.ok) return NextResponse.json(result, withNoStore({ status: 400 }));
  return NextResponse.json(result, withNoStore());
}
