// ================================================================
// MOISDES PLATFORM — NETLIFY FUNCTION
// netlify/functions/submit.js
//
// Receives uploads from admin page,
// stores files in Cloudflare R2,
// writes metadata to Cloudflare D1.
//
// REQUIRED ENV VARS in Netlify:
//   CF_API_TOKEN  — Cloudflare API token (already set as GOOGLE_SERVICE_ACCOUNT_JSON was)
//   CF_ACCOUNT_ID — optional, hardcoded below
//   CF_DB_ID      — optional, hardcoded below
//   CF_R2_BUCKET  — optional, hardcoded below
// ================================================================

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '827d870dd8e30d20f69797a9c2d6fda7';
const CF_DB_ID      = process.env.CF_DB_ID      || '45bea6a4-108d-4bfb-8baf-5fa22b2a5bfd';
const CF_R2_BUCKET  = process.env.CF_R2_BUCKET  || 'moisdes-media';
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

  if (!CF_API_TOKEN) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'CF_API_TOKEN environment variable not set. Go to Netlify → Site configuration → Environment variables → Add variable: CF_API_TOKEN' }) };
  }

  try {
    let payload;
    try { payload = JSON.parse(event.body); }
    catch(e) { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const { type } = payload;
    if (!type) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing type' }) };

    let result = {};
    if (type === 'blog')        result = await handleBlog(payload);
    else if (type === 'poster')  result = await handlePoster(payload);
    else if (type === 'event')   result = await handleEvent(payload);
    else if (type === 'video')   result = await handleVideo(payload);
    else if (type === 'pdf')     result = await handlePdf(payload);
    else throw new Error('Unknown type: ' + type);

    if (payload.newTags?.length)       await saveTaxonomy('tags',       payload.newTags);
    if (payload.newCategories?.length) await saveTaxonomy('categories', payload.newCategories);
    if (payload.newParshas?.length)    await saveTaxonomy('parshas',    payload.newParshas);

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, ...result }) };
  } catch(err) {
    console.error('Submit error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};

async function handleBlog(p) {
  const r2Keys = []; let folder_url = '';
  if (p._files?.length) {
    const folder = 'blog/' + Date.now();
    for (let i=0; i<p._files.length; i++) {
      const f=p._files[i], ext=getExt(f.name), key=`${folder}/${i+1}-${sanitize(f.name)}.${ext}`;
      await r2Put(key, Buffer.from(f.data,'base64'), f.mimeType); r2Keys.push(key);
    }
    folder_url = 'r2://' + folder;
  }
  const id = await d1Run('INSERT INTO posts (date,title,body,folder_url,tags,uploaded_by) VALUES (?,?,?,?,?,?)',
    [p.date||'',p.title||'',p.body||'',folder_url,p.tags||'',1]);
  for (const k of r2Keys) await d1Run('INSERT INTO r2_files (key,table_name,record_id) VALUES (?,?,?)', [k,'posts',id]);
  return { success:true, id, folder_url };
}

async function handlePoster(p) {
  const r2Keys = []; let folder_url = '';
  if (p._files?.length) {
    const folder = 'posters/' + Date.now();
    for (let i=0; i<p._files.length; i++) {
      const f=p._files[i], ext=getExt(f.name), key=`${folder}/${i+1}.${ext}`;
      await r2Put(key, Buffer.from(f.data,'base64'), f.mimeType); r2Keys.push(key);
    }
    folder_url = 'r2://' + folder;
  }
  const id = await d1Run('INSERT INTO posters (date,parsha,folder_url,uploaded_by) VALUES (?,?,?,?)',
    [p.date||'',p.parsha||'',folder_url,1]);
  for (const k of r2Keys) await d1Run('INSERT INTO r2_files (key,table_name,record_id) VALUES (?,?,?)', [k,'posters',id]);
  return { success:true, id, folder_url };
}

async function handleEvent(p) {
  const r2Keys = []; let folder_url = p.folder_url || '';
  if (p._files?.length) {
    const folder = 'events/' + Date.now();
    for (let i=0; i<p._files.length; i++) {
      const f=p._files[i], ext=getExt(f.name), key=`${folder}/${String(i+1).padStart(2,'0')}-${sanitize(f.name)}.${ext}`;
      await r2Put(key, Buffer.from(f.data,'base64'), f.mimeType); r2Keys.push(key);
    }
    folder_url = 'r2://' + folder;
  }
  const id = await d1Run('INSERT INTO events (date,title,location,category,description,tags,folder_url,uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
    [p.date||'',p.title||'',p.location||'',p.category||'',p.description||'',p.tags||'',folder_url,1]);
  for (const k of r2Keys) await d1Run('INSERT INTO r2_files (key,table_name,record_id) VALUES (?,?,?)', [k,'events',id]);
  return { success:true, id, folder_url };
}

async function handleVideo(p) {
  const r2Keys = []; let video_url = p.video_url || p.videoLink || '';
  if (p._files?.length && !video_url) {
    const f=p._files[0], ext=getExt(f.name), key='video/'+Date.now()+'.'+ext;
    await r2Put(key, Buffer.from(f.data,'base64'), f.mimeType);
    video_url = 'r2://'+key; r2Keys.push(key);
  }
  const id = await d1Run('INSERT INTO videos (date,title,location,category,description,tags,video_url,uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
    [p.date||'',p.title||'',p.location||'',p.category||'',p.description||'',p.tags||'',video_url,1]);
  for (const k of r2Keys) await d1Run('INSERT INTO r2_files (key,table_name,record_id) VALUES (?,?,?)', [k,'videos',id]);
  return { success:true, id, video_url };
}

async function handlePdf(p) {
  const r2Keys = []; let pdf_url = p.pdf_url || '';
  if (p._files?.length) {
    const f=p._files[0], key='pdfs/'+Date.now()+'-'+sanitize(f.name||'\.pdf')+'.pdf';
    await r2Put(key, Buffer.from(f.data,'base64'), 'application/pdf');
    pdf_url = 'r2://'+key; r2Keys.push(key);
  }
  const id = await d1Run('INSERT INTO pdfs (date,title,category,language,parsha,year,tags,pdf_url,thumb_url,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [p.date||'',p.title||'',p.category||'',p.language||'',p.parsha||'',p.year||'',p.tags||'',pdf_url,'',1]);
  for (const k of r2Keys) await d1Run('INSERT INTO r2_files (key,table_name,record_id) VALUES (?,?,?)', [k,'pdfs',id]);
  return { success:true, id, pdf_url };
}

async function saveTaxonomy(table, items) {
  for (const name of items) {
    if (!name?.trim()) continue;
    try { await d1Run(`INSERT OR IGNORE INTO ${table} (name) VALUES (?)`, [name.trim()]); } catch(e) {}
  }
}

async function d1Run(sql, params=[]) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error('D1 error: ' + (data.errors?.[0]?.message || JSON.stringify(data)));
  return data.result?.[0]?.meta?.last_row_id || 0;
}

async function r2Put(key, buffer, contentType) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${CF_R2_BUCKET}/objects/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': contentType || 'application/octet-stream' },
    body: buffer,
  });
  if (!res.ok) throw new Error(`R2 upload failed (${res.status}): ${(await res.text()).slice(0,200)}`);
  return key;
}

function getExt(name) { return (name||'file').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || 'bin'; }
function sanitize(name) { return (name||'file').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,50); }
