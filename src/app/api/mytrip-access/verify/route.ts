import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, getConfiguredAccessCode, sha256Hex } from "@/lib/accessCode";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~180 days

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const submitted = body.code?.trim();
  const configuredCode = getConfiguredAccessCode();

  if (!configuredCode) {
    return NextResponse.json({ error: "Access code isn't configured on the server." }, { status: 503 });
  }
  if (!submitted || submitted !== configuredCode) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: await sha256Hex(configuredCode),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
