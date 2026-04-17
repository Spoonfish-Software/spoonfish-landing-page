// Spoonfish waitlist — Pages Function
// Stores emails in KV namespace bound as WAITLIST
// 
// Setup:
//   1. Create KV namespace: wrangler kv namespace create WAITLIST
//   2. Add binding in wrangler.toml or Pages dashboard:
//      [[kv_namespaces]]
//      binding = "WAITLIST"
//      id = "<your-namespace-id>"

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { email, token } = await request.json();

    // Validate
    if (!email || !email.includes('@') || email.length > 320) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers,
      });
    }

    const clean = email.toLowerCase().trim();
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Verify Turnstile token
    if (env.TURNSTILE_SECRET) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing challenge token' }), { status: 400, headers });
      }
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
      });
      const verify = await verifyRes.json();
      if (!verify.success) {
        return new Response(JSON.stringify({ error: 'Challenge failed' }), { status: 403, headers });
      }
    }
    const rateKey = `rate:${ip}`;
    const rateCount = parseInt(await env.WAITLIST.get(rateKey) || '0');
    if (rateCount >= 5) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers,
      });
    }
    await env.WAITLIST.put(rateKey, String(rateCount + 1), { expirationTtl: 3600 });

    // Store email with timestamp
    const timestamp = new Date().toISOString();
    await env.WAITLIST.put(`email:${clean}`, JSON.stringify({
      email: clean,
      timestamp,
      ip,
      userAgent: request.headers.get('User-Agent') || '',
    }));

    // Forward to Loops (upsert — creates or updates the contact)
    if (env.LOOPS_API_KEY) {
      try {
        const res = await fetch('https://app.loops.so/api/v1/contacts/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.LOOPS_API_KEY}`,
          },
          body: JSON.stringify({
            email: clean,
            userGroup: 'Waitlist',
            source: 'spoonfish.dev',
            subscribed: true,
          }),
        });
        if (!res.ok) {
          console.error('Loops error', res.status, await res.text());
        }
      } catch (loopsErr) {
        console.error('Loops fetch failed', loopsErr);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers,
    });
  }
}

// Handle preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
