// Zaehler fuer das "Thank you, Irvine"-Fenster.
//
//   GET  /api/thanks   -> { ok: true, count: <n> }
//   POST /api/thanks   -> { ok: true, count: <n>, counted: true|false }
//
// Gezaehlt wird eine Stimme pro Besucher und Tag: Ein Sperrschluessel mit
// 24-Stunden-Ablauf wird per SET NX gesetzt; nur wenn er neu war, zaehlt INCR
// hoch. Sonst koennte eine einzelne Person die Zahl beliebig hochtreiben und
// sie wuerde nichts mehr aussagen.
//
// Faellt der Store aus oder ist er gar nicht eingerichtet, antwortet die
// Funktion mit ok:false statt mit einem Fehler. Die Seite zeigt dann still
// ihren lokalen Zaehler weiter, ohne dass ein Besucher etwas davon merkt.

export const config = { runtime: 'edge' };

// Achtung: Das Projekt hat zusaetzlich KV_URL und REDIS_URL. Das sind
// redis://-Adressen fuer echte Redis-Clients und ueber fetch nicht nutzbar.
// Gebraucht wird die REST-Adresse.
const REST_URL = process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN;

const COUNT_KEY = 'nwl:thanks:total';
const VOTE_TTL_SECONDS = 86400;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Der Stand aendert sich staendig, er darf nicht zwischengespeichert werden.
      'Cache-Control': 'no-store',
    },
  });
}

// Upstash-REST: Kommando als JSON-Array im Body. Sicherer als die Pfadform,
// weil hier nichts an Schluesseln oder Werten kodiert werden muss.
async function redis(command) {
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis antwortete mit ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// Die IP wird nie im Klartext gespeichert. Der Hash reicht, um denselben
// Besucher innerhalb eines Tages wiederzuerkennen, und laeuft mit dem
// Sperrschluessel nach 24 Stunden ohnehin ab.
async function voterKey(req) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unbekannt';
  const tag = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${ip}|${tag}|nwl-thanks`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `nwl:thanks:voter:${tag}:${hex}`;
}

export default async function handler(req) {
  if (!REST_URL || !REST_TOKEN) {
    return json({ ok: false, reason: 'kein Store eingerichtet' });
  }

  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', COUNT_KEY]);
      return json({ ok: true, count: Number(raw) || 0 });
    }

    if (req.method === 'POST') {
      const key = await voterKey(req);
      const gesetzt = await redis(['SET', key, '1', 'NX', 'EX', String(VOTE_TTL_SECONDS)]);

      if (gesetzt !== 'OK') {
        // Heute schon gezaehlt — den aktuellen Stand trotzdem zurueckgeben,
        // damit die Anzeige stimmt.
        const raw = await redis(['GET', COUNT_KEY]);
        return json({ ok: true, count: Number(raw) || 0, counted: false });
      }

      const count = await redis(['INCR', COUNT_KEY]);
      return json({ ok: true, count: Number(count) || 0, counted: true });
    }

    return json({ ok: false, reason: 'Methode nicht erlaubt' }, 405);
  } catch (e) {
    // Bewusst kein 5xx: Die Seite soll bei einem Ausfall des Stores einfach
    // auf ihren lokalen Zaehler zurueckfallen, nicht eine Fehlermeldung zeigen.
    return json({ ok: false, reason: e.message });
  }
}
