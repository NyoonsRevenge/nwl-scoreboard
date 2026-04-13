export const config = { runtime: 'edge' };

export default async function handler() {
  const url = 'https://docs.google.com/spreadsheets/d/1vYy9Zsn7hVN3Z3sEW2S0GsXEMh1VVM_P7vn6C5LMFgY/export?format=xlsx';
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });
    if (!resp.ok) return new Response('XLSX fetch failed', { status: 502 });
    return new Response(resp.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response('XLSX proxy error: ' + e.message, { status: 502 });
  }
}
