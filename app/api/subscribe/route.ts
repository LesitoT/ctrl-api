// app/api/subscribe/route.ts
import { NextRequest } from 'next/server';

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
    const { email, name } = await req.json().catch(() => ({} as any));
    const valid = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) return withCors(json({ ok: false, message: 'Please enter a valid email address.' }, 422));

    const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        // Optional additional fields later:
        // fields: name ? { name } : undefined,
        groups: ['164263897807717645'], // WaitlistLp group
      }),
    });

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      return withCors(json({ ok: false, message: data?.message || 'Signup failed', errors: data?.errors }, r.status));
    }
    return withCors(json({ ok: true }, 200));
  } catch {
    return withCors(json({ ok: false, message: 'Server error. Please try again.' }, 500));
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
function withCors(res: Response) {
  const allow = process.env.CORS_ALLOW_ORIGIN || '';
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', allow);
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}
