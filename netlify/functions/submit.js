// ================================================================
// MOISDES — SUBMIT FUNCTION (metadata only, no file data)
// netlify/functions/submit.js
// Files are uploaded directly to R2 via presigned URLs.
// This function only writes metadata to D1.
// ================================================================

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '827d870dd8e30d20f69797a9c2d6fda7';
const CF_DB_ID      = process.env.CF_DB_ID      || '45bea6a4-108d-4bfb-8baf-5fa22b2a5bfd';
const CF_API_TOKEN  = process.env.CF_API_TOKEN;

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!CF_API_TOKEN) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'CF_API_TOKEN not set in Netlify environment variables' }) };

  // Test endpoint — POST with {"type":"test"} to check D1 connectivity
  try {
    const p = JSON.parse(event.body);
    const { type } = p;
    if (!type) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing type' }) };

    if (type === 'test') {
      try {
        const testResult = await d1Run('SELECT 1 as ok', []);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, d1: 'connected', result: testResult }) };
      } catch(e) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'D1 test failed: ' + e.message, token_prefix: CF_API_TOKEN?.slice(0,8) + '...', account: CF_ACCOUNT_ID, db: CF_DB_ID }) };
      }
    }

    let id = 0;
    if (type === 'blog')        id = await d1Run('INSERT INTO posts (date,title,body,folder_url,tags,uploaded_by) VALUES (?,?,?,?,?,?)', [p.date||'',p.title||'',p.body||'',p.folder_url||'',p.tags||'',1]);
    else if (type === 'poster') id = await d1Run('INSERT INTO posters (date,parsha,folder_url,uploaded_by) VALUES (?,?,?,?)', [p.date||'',p.parsha||'',p.folder_url||'',1]);
    else if (type === 'event')  id = await d1Run('INSERT INTO events (date,title,location,category,description,tags,folder_url,uploaded_by) VALUES (?,?,?,?,?,?,?,?)', [p.date||'',p.title||'',p.location||'',p.category||'',p.description||'',p.tags||'',p.folder_url||'',1]);
    else if (type === 'video')  id = await d1Run('INSERT INTO videos (date,title,location,category,description,tags,video_url,uploaded_by) VALUES (?,?,?,?,?,?,?,?)', [p.date||'',p.title||'',p.location||'',p.category||'',p.description||'',p.tags||'',p.video_url||'',1]);
    else if (type === 'pdf')    id = await d1Run('INSERT INTO pdfs (date,title,category,language,parsha,year,tags,pdf_url,thumb_url,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?)', [p.date||'',p.title||'',p.category||'',p.language||'',p.parsha||'',p.year||'',p.tags||'',p.pdf_url||'','',1]);
    else throw new Error('Unknown type: ' + type);

    // Track R2 files
    for (const key of (p.r2_keys||[])) {
      await d1Run('INSERT INTO r2_files (key,table_name,record_id) VALUES (?,?,?)', [key, type==='blog'?'posts':type==='poster'?'posters':type+'s', id]);
    }

    // Save new taxonomy
    if (p.newTags?.length)       for (const n of p.newTags)       await d1Run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [n.trim()]).catch(()=>{});
    if (p.newCategories?.length) for (const n of p.newCategories) await d1Run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [n.trim()]).catch(()=>{});
    if (p.newParshas?.length)    for (const n of p.newParshas)    await d1Run('INSERT OR IGNORE INTO parshas (name) VALUES (?)', [n.trim()]).catch(()=>{});

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, id }) };
  } catch(err) {
    console.error('Submit error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};

async function d1Run(sql, params=[]) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { throw new Error(`D1 returned non-JSON (status ${res.status}): ${text.slice(0,200)}`); }
  if (!res.ok || !data.success) {
    const msg = data.errors?.[0]?.message || data.error || JSON.stringify(data);
    throw new Error(`D1 error (${res.status}): ${msg}`);
  }
  return data.result?.[0]?.meta?.last_row_id || 0;
}
