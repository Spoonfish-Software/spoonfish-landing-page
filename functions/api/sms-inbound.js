// Spoonfish SMS inbound — Pages Function
//
// Receives SignalWire's webhook POST when an SMS lands on the Spoonfish number.
// Fans out to:
//   1. Missive (so the message threads in the team inbox)
//   2. The ops cell (so the founder sees it in their phone's native Messages app)
//
// Env (wrangler secrets / vars):
//   SIGNALWIRE_PROJECT_ID   — UUID
//   SIGNALWIRE_API_TOKEN    — secret
//   SIGNALWIRE_SPACE        — e.g. spoonfish-software.signalwire.com
//   SIGNALWIRE_FROM_NUMBER  — e.g. +12532765486
//   OPS_CELL_NUMBER         — e.g. +12065551234 (where SMS copies forward)
//   MISSIVE_SMS_WEBHOOK     — defaults to https://callback.missiveapp.com/signalwire

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

export async function onRequestPost(context) {
  const { request, env } = context;

  const formText = await request.text();
  const params = new URLSearchParams(formText);
  const from = params.get('From') || '';
  const to = params.get('To') || '';
  const body = params.get('Body') || '';

  const missiveUrl = env.MISSIVE_SMS_WEBHOOK || 'https://callback.missiveapp.com/signalwire';

  const missiveForward = fetch(missiveUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formText,
  }).catch((e) => console.error('Missive forward failed', e));

  const cellForward = forwardToCell(env, from, to, body);

  await Promise.allSettled([missiveForward, cellForward]);

  return new Response(TWIML_EMPTY, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

async function forwardToCell(env, from, to, body) {
  if (!env.OPS_CELL_NUMBER) return;
  if (from === env.OPS_CELL_NUMBER) return;
  if (!env.SIGNALWIRE_PROJECT_ID || !env.SIGNALWIRE_API_TOKEN || !env.SIGNALWIRE_SPACE || !env.SIGNALWIRE_FROM_NUMBER) {
    console.error('SignalWire env missing; cell forward skipped');
    return;
  }

  const auth = btoa(`${env.SIGNALWIRE_PROJECT_ID}:${env.SIGNALWIRE_API_TOKEN}`);
  const url = `https://${env.SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${env.SIGNALWIRE_PROJECT_ID}/Messages.json`;
  const formBody = new URLSearchParams({
    From: env.SIGNALWIRE_FROM_NUMBER,
    To: env.OPS_CELL_NUMBER,
    Body: `[${from}] ${body}`,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: formBody,
  });
  if (!res.ok) {
    console.error('Cell forward failed', res.status, await res.text());
  }
}

export async function onRequestGet() {
  return new Response('SMS inbound webhook — POST only', { status: 405 });
}
