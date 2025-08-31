// app/api/subscribe/route.ts
import { NextRequest } from 'next/server';

// Force Node.js runtime so process.env is available (not Edge)
export const runtime = 'nodejs';
// Ensure this API route is always dynamic (no static optimisation)
export const dynamic = 'force-dynamic';

type SubscribeOk = { ok: true };
type SubscribeErr = { ok: false; message: string; errors?: unknown };

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOW_ORIGIN?.trim() || '';
  // Support comma- or space-separated list
  return raw ? raw.split(/[,\s]+/).filter(Boolean) : [];
}

function pickCorsOrigin(req: NextRequest, allowList: string[]): string | '' {
  const reqOrigin = req.headers.get('origin') || '';
  if (!allowList.length) return '';
  if (allowList.includes('*')) return '*';
  return allowList.includes(reqOrigin) ? reqOrigin : '';
}

function corsJson<T>(body: T, status: number, origin: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export async function OPTIONS(req: NextRequest) {
  const allowList = parseAllowedOrigins();
  const origin = pickCorsOrigin(req, allowList);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return new Response(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  const allowList = parseAllowedOrigins();
  const origin = pickCorsOrigin(req, allowList);

  try {
    // Body + validation
    const body = (await req.json().catch(() => ({}))) as Partial<{ email: string }>;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!validEmail) {
      return corsJson<SubscribeErr>(
        { ok: false, message: 'Please enter a valid email address.' },
        422,
        origin
      );
    }

    // MailerLite call
    const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        groups: ['164263897807717645'], // WaitlistLp group
      }),
    });

    const data = (await r.json().catch(() => null)) as { message?: string; errors?: unknown } | null;

    if (!r.ok) {
      return corsJson<SubscribeErr>(
        { ok: false, message: data?.message || 'Signup failed', errors: data?.errors },
        r.status,
        origin
      );
    }

    return corsJson<SubscribeOk>({ ok: true }, 200, origin);
  } catch {
    return corsJson<SubscribeErr>(
      { ok: false, message: 'Server error. Please try again.' },
      500,
      origin
    );
  }
}
