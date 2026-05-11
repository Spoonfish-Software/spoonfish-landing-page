// Spoonfish voicemail transcription — Pages Function
//
// Receives SignalWire's transcribeCallback when a voicemail recording is transcribed.
// SMS the transcription to the ops cell so the founder sees voicemails in real time
// without having to log into the SignalWire dashboard.
//
// Same env as sms-inbound.js.

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

export async function onRequestPost(context) {
  const { request, env } = context;

  const formText = await request.text();
  const params = new URLSearchParams(formText);
  const transcriptionStatus = params.get('TranscriptionStatus') || '';
  const transcriptionText = params.get('TranscriptionText') || '';
  const recordingUrl = params.get('RecordingUrl') || '';
  const callerFrom = params.get('From') || params.get('Caller') || 'unknown';

  if (transcriptionStatus !== 'completed') {
    console.log('Transcription not completed, status:', transcriptionStatus);
    return new Response(TWIML_EMPTY, {
      status: 200,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
  }

  await sendToCell(env, callerFrom, transcriptionText, recordingUrl);

  return new Response(TWIML_EMPTY, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

async function sendToCell(env, from, text, recordingUrl) {
  if (!env.OPS_CELL_NUMBER) {
    console.error('OPS_CELL_NUMBER unset; voicemail notification skipped');
    return;
  }
  if (!env.SIGNALWIRE_PROJECT_ID || !env.SIGNALWIRE_API_TOKEN || !env.SIGNALWIRE_SPACE || !env.SIGNALWIRE_FROM_NUMBER) {
    console.error('SignalWire env missing; voicemail notification skipped');
    return;
  }

  const auth = btoa(`${env.SIGNALWIRE_PROJECT_ID}:${env.SIGNALWIRE_API_TOKEN}`);
  const url = `https://${env.SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${env.SIGNALWIRE_PROJECT_ID}/Messages.json`;
  const message = `Voicemail from ${from}: ${text || '(no transcription)'}\n${recordingUrl ? recordingUrl + '.mp3' : ''}`.trim();

  const formBody = new URLSearchParams({
    From: env.SIGNALWIRE_FROM_NUMBER,
    To: env.OPS_CELL_NUMBER,
    Body: message.slice(0, 1500),
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
    console.error('Voicemail SMS failed', res.status, await res.text());
  }
}

export async function onRequestGet() {
  return new Response('Voicemail transcription webhook — POST only', { status: 405 });
}
