// app/api/subscribe/route.ts
import { NextRequest } from 'next/server';

type SubscribeOk = { ok: true };
type SubscribeErr = { ok: false; message: string; errors?: unknown };

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<{ email: string }>;
    const email = typeof body.email === 'string' ? body.email : '';

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail) {
      return withCors(json<SubscribeErr>({ ok: false, message: 'Please enter a valid email address.' }, 422));
    }

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
      return withCors(
        json<SubscribeErr>(
          { ok: false, message: data?.message || 'Signup failed', errors: data?.errors },
          r.status,
        ),
      );
    }

    return withCors(json<SubscribeOk>({ ok: true }, 200));
  } catch {
    return withCors(json<SubscribeErr>({ ok: false, message: 'Server error. Please try again.' }, 500));
  }
}

function json<T>(body: T, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function withCors(res: Response) {
  const allow = process.env.CORS_ALLOW_ORIGIN || '';
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', allow);
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}
