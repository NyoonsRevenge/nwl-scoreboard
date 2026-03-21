const PUBLISHED_ID = '2PACX-1vReMFS4C8UfVHqgl0rI14LVdU4adkyw8_ClQpAJgkXluqncRdqBHXer156nDt_A3deeB7qO0vuDaHE8';
async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/e/' + PUBLISHED_ID + '/pubhtml';
  const res = await fetch(url);
  const html = await res.text();
  const sheets = [];
  const regex = /name:\s*"([^"]+)"[^}]*gid:\s*"(\d+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const name = match[1].replace(/\\\//g, '/');
    const gid = match[2];
    if (name !== 'Template' && name.match(/\d{2}\.\d{2}\.\d{4}/) && name.match(/NWL#/i)) {
      sheets.push({ gid, name });
    }
  }
  console.log('Sheets found:', sheets.length);
  console.log(sheets.map(s => s.name));
  
  if (sheets.length > 0) {
    const s24 = sheets[0];
    console.log('Fetching', s24.name);
    const url2 = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?output=csv&gid=${s24.gid}`;
    const res2 = await fetch(url2);
    if (!res2.ok) {
        console.error("FAILED to fetch CSV");
    } else {
        const text = await res2.text();
        console.log("CSV fetched, length", text.length);
    }
  }
}
run().catch(console.error);
