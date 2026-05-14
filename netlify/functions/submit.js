// ================================================================
// MOISDES PLATFORM — NETLIFY FUNCTION
// netlify/functions/submit.js
//
// Handles all form submissions:
//   type: 'blog' | 'poster' | 'event' | 'video' | 'pdf'
//
// REQUIRED ENV VAR in Netlify:
//   GOOGLE_SERVICE_ACCOUNT_JSON — full JSON content of service account key
//
// SETUP: see bottom of this file
// ================================================================

// ── SHEET CONFIG — must match shared-config.js ────────────────────
const SPREADSHEET_ID = '1Xox6zr8NeSCCwpQg0u3C1dHXtzvPoBRYa0SpG57xHqc';

const TABS = {
  blog:       'Blog Posts',
  posters:    'Posters',
  events:     'Events',
  videos:     'Videos',
  pdfs:       'PDFs',
  tags:       'Tags',
  categories: 'Categories',
  parshas:    'Parshas',
};

// Drive folder IDs — must match shared-config.js
const DRIVE_FOLDERS = {
  blog:    '1LmlA1XMIcrEldHApZixxu6e6iCt8z5Xb',
  posters: '1PyTtMHQwMCwfS0oDaA24hWOMcbXT8Q6X',
  events:  '1RMreEDQ49GhqYeir2toK42wwdGlU0qAY',
  videos:  '1URbZIxz0b08AdLhk5AaO11CeGLzQlm3L',
  pdfs:    '1XwpZfTmKhxlbd7kVb2hSbPSxx0v8JyMv',
};

// Column layouts for each sheet tab (zero-indexed)
const COLS = {
  blog: {
    // A         B        C       D     E     F
    date: 0, images: 1, title: 2, body: 4, tags: 5,
  },
  posters: {
    // A         B          C
    date: 0, parsha: 1, images: 2,
  },
  events: {
    // A         B        C          D             E            F       G
    date: 0, title: 1, location: 2, category: 3, description: 4, tags: 5, tracks: 6,
  },
  videos: {
    // A         B        C          D             E            F       G
    date: 0, title: 1, location: 2, category: 3, description: 4, tags: 5, videoLink: 6,
  },
  pdfs: {
    // A         B        C          D          E       F        G      H         I
    date: 0, title: 1, category: 2, language: 3, parsha: 4, year: 5, tags: 6, pdfLink: 7, thumbLink: 8,
  },
};

// ── HANDLER ───────────────────────────────────────────────────────

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const payload = JSON.parse(event.body);
    const type    = payload.type;
    if (!type) throw new Error('Missing type field');

    const token = await getAccessToken();

    let result = {};

    if (type === 'blog') {
      result = await handleBlog(token, payload);
    } else if (type === 'poster') {
      result = await handlePoster(token, payload);
    } else if (type === 'event') {
      result = await handleEvent(token, payload);
    } else if (type === 'video') {
      result = await handleVideo(token, payload);
    } else if (type === 'pdf') {
      result = await handlePdf(token, payload);
    } else {
      throw new Error(`Unknown type: ${type}`);
    }

    // Save new tags / categories / parshas
    if (payload.newTags?.length)       await appendToCol(token, TABS.tags,       payload.newTags);
    if (payload.newCategories?.length) await appendToCol(token, TABS.categories, payload.newCategories);
    if (payload.newParshas?.length)    await appendToCol(token, TABS.parshas,    payload.newParshas);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...result }) };

  } catch(err) {
    console.error('Submit error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// ── BLOG ──────────────────────────────────────────────────────────

async function handleBlog(token, p) {
  let folderLink = '';
  if (p.images?.length) {
    const folderId = await createFolder(token, DRIVE_FOLDERS.blog, p.title || 'Blog Post');
    await uploadFiles(token, folderId, p.images);
    folderLink = `https://drive.google.com/drive/folders/${folderId}`;
  }
  const C = COLS.blog;
  const row = makeRow(Math.max(...Object.values(C)));
  row[C.date]   = p.date   || '';
  row[C.images] = folderLink;
  row[C.title]  = p.title  || '';
  row[C.body]   = p.body   || '';
  row[C.tags]   = p.tags   || '';
  await appendRow(token, TABS.blog, row);
  return { folderLink };
}

// ── POSTER ────────────────────────────────────────────────────────

async function handlePoster(token, p) {
  let folderLink = '';
  if (p.images?.length) {
    const folderId = await createFolder(token, DRIVE_FOLDERS.posters, p.parsha || p.date || 'Posters');
    await uploadFiles(token, folderId, p.images);
    folderLink = `https://drive.google.com/drive/folders/${folderId}`;
  }
  const C = COLS.posters;
  const row = makeRow(Math.max(...Object.values(C)));
  row[C.date]   = p.date   || '';
  row[C.parsha] = p.parsha || '';
  row[C.images] = folderLink;
  await appendRow(token, TABS.posters, row);
  return { folderLink };
}

// ── EVENT ─────────────────────────────────────────────────────────

async function handleEvent(token, p) {
  let folderLink = '';
  if (p.tracks?.length) {
    const folderId = await createFolder(token, DRIVE_FOLDERS.events, p.title || 'Event');
    await uploadFiles(token, folderId, p.tracks);
    folderLink = `https://drive.google.com/drive/folders/${folderId}`;
  }
  const C = COLS.events;
  const row = makeRow(Math.max(...Object.values(C)));
  row[C.date]        = p.date        || '';
  row[C.title]       = p.title       || '';
  row[C.location]    = p.location    || '';
  row[C.category]    = p.category    || '';
  row[C.description] = p.description || '';
  row[C.tags]        = p.tags        || '';
  row[C.tracks]      = folderLink;
  await appendRow(token, TABS.events, row);
  return { folderLink };
}

// ── VIDEO ─────────────────────────────────────────────────────────

async function handleVideo(token, p) {
  let videoLink = p.videoLink || '';

  // If a file was uploaded (not a link), upload to Drive
  if (p.videoFile && !videoLink) {
    const folderId = await createFolder(token, DRIVE_FOLDERS.videos, p.title || 'Video');
    const fileId   = await uploadSingleFile(token, folderId, p.videoFile);
    videoLink = `https://drive.google.com/file/d/${fileId}/view`;
  }

  const C = COLS.videos;
  const row = makeRow(Math.max(...Object.values(C)));
  row[C.date]        = p.date        || '';
  row[C.title]       = p.title       || '';
  row[C.location]    = p.location    || '';
  row[C.category]    = p.category    || '';
  row[C.description] = p.description || '';
  row[C.tags]        = p.tags        || '';
  row[C.videoLink]   = videoLink;
  await appendRow(token, TABS.videos, row);
  return { videoLink };
}

// ── PDF ───────────────────────────────────────────────────────────

async function handlePdf(token, p) {
  const results = [];

  for (const pdfEntry of (p.pdfs || [])) {
    // Upload PDF file to Drive
    const folderId = await createFolder(token, DRIVE_FOLDERS.pdfs, pdfEntry.title || 'PDF');
    const fileId   = await uploadSingleFile(token, folderId, pdfEntry.file);
    const pdfLink  = `https://drive.google.com/file/d/${fileId}/view`;

    // Generate thumbnail from first page
    // We use the Drive thumbnail endpoint — Drive auto-generates it
    const thumbLink = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

    // Also store thumbnail as a permanent image (upload to same folder)
    let storedThumb = thumbLink; // fallback to Drive's auto-thumb
    try {
      const thumbRes = await fetch(thumbLink);
      if (thumbRes.ok) {
        const thumbBuf   = await thumbRes.arrayBuffer();
        const thumbB64   = Buffer.from(thumbBuf).toString('base64');
        const thumbFileId = await uploadSingleFile(token, folderId, {
          name: `${pdfEntry.title || 'thumb'}_cover.jpg`,
          mimeType: 'image/jpeg',
          data: thumbB64,
        });
        storedThumb = `https://drive.google.com/uc?id=${thumbFileId}`;
      }
    } catch(e) { /* use fallback */ }

    const C = COLS.pdfs;
    const row = makeRow(Math.max(...Object.values(C)));
    row[C.date]     = p.date          || '';
    row[C.title]    = pdfEntry.title  || '';
    row[C.category] = pdfEntry.category || '';
    row[C.language] = pdfEntry.language || '';
    row[C.parsha]   = pdfEntry.parsha   || '';
    row[C.year]     = pdfEntry.year     || '';
    row[C.tags]     = pdfEntry.tags     || '';
    row[C.pdfLink]  = pdfLink;
    row[C.thumbLink]= storedThumb;
    await appendRow(token, TABS.pdfs, row);
    results.push({ pdfLink, thumbLink: storedThumb });
  }
  return { pdfs: results };
}

// ── GOOGLE AUTH ───────────────────────────────────────────────────

async function getAccessToken() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var not set — see setup instructions in this file');
  const key    = JSON.parse(keyJson);
  const now    = Math.floor(Date.now() / 1000);
  const scopes = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim  = b64url(JSON.stringify({ iss: key.client_email, scope: scopes, aud: 'https://oauth2.googleapis.com/token', exp: now+3600, iat: now }));
  const unsigned  = `${header}.${claim}`;
  const signature = await signRS256(unsigned, key.private_key);
  const jwt       = `${unsigned}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

function b64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

async function signRS256(data, pem) {
  const { createSign } = await import('crypto');
  const s = createSign('RSA-SHA256');
  s.update(data); s.end();
  return b64url(s.sign(pem));
}

// ── DRIVE HELPERS ─────────────────────────────────────────────────

async function createFolder(token, parentId, name) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  const d = await res.json();
  if (!d.id) throw new Error('Folder create failed: ' + JSON.stringify(d));
  await setPublic(token, d.id);
  return d.id;
}

async function setPublic(token, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

async function uploadSingleFile(token, folderId, file) {
  const boundary = 'moisdes_boundary';
  const metadata = JSON.stringify({ name: file.name, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
    Buffer.from(file.data),
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(`Upload failed (${file.name}): ${e.error?.message}`); }
  const d = await res.json();
  await setPublic(token, d.id);
  return d.id;
}

async function uploadFiles(token, folderId, files) {
  for (const file of files) await uploadSingleFile(token, folderId, file);
}

// ── SHEETS HELPERS ────────────────────────────────────────────────

async function appendRow(token, tab, row) {
  const range = encodeURIComponent(`'${tab}'`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(`Sheet append failed: ${e.error?.message}`); }
}

async function getCol(token, tab, col) {
  const range = encodeURIComponent(`'${tab}'!${col}:${col}`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d   = await res.json();
  return (d.values || []).flat().map(v => String(v).trim()).filter(Boolean);
}

async function appendToCol(token, tab, newItems) {
  const existing = (await getCol(token, tab, 'A')).map(v => v.toLowerCase());
  const toAdd    = newItems.filter(v => v && !existing.includes(v.toLowerCase()));
  if (!toAdd.length) return;
  const range = encodeURIComponent(`'${tab}'!A:A`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=RAW`;
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: toAdd.map(v => [v]) }),
  });
}

function makeRow(maxIdx) { return new Array(maxIdx + 1).fill(''); }


/* ================================================================
   SETUP INSTRUCTIONS
   ================================================================

   1. CREATE A GOOGLE CLOUD PROJECT
      console.cloud.google.com → New Project

   2. ENABLE APIs
      APIs & Services → Library:
        - Google Drive API → Enable
        - Google Sheets API → Enable

   3. CREATE SERVICE ACCOUNT
      APIs & Services → Credentials → Create Credentials → Service account
      Name it "Moisdes Platform" → Create → Done
      Click the service account → Keys tab → Add Key → JSON → Create
      Download the .json file

   4. CREATE YOUR GOOGLE SHEET
      One spreadsheet with these tabs (exact names):
        Blog Posts | Posters | Events | Videos | PDFs
        Tags | Categories | Parshas

      Add a header row to each content tab:
        Blog Posts:  Date | Images | Title | | Body | Tags
        Posters:     Date | Parsha | Images
        Events:      Date | Title | Location | Category | Description | Tags | Tracks
        Videos:      Date | Title | Location | Category | Description | Tags | VideoLink
        PDFs:        Date | Title | Category | Language | Parsha | Year | Tags | PDFLink | ThumbLink

      Share the sheet with the service account email (Editor)

   5. CREATE GOOGLE DRIVE FOLDERS
      Create 5 folders in Drive:
        "Moisdes Blog" | "Moisdes Posters" | "Moisdes Events"
        "Moisdes Videos" | "Moisdes PDFs"
      Share each with the service account email (Editor)
      Copy each folder ID (from the URL: /folders/THIS_PART)

   6. UPDATE CONFIG
      In this file (submit.js), replace:
        SPREADSHEET_ID → your sheet ID (from sheet URL)
        DRIVE_FOLDERS  → your 5 folder IDs

      In shared-config.js, replace the same values

   7. ADD ENV VAR TO NETLIFY
      Site settings → Environment variables → Add variable:
        Key:   GOOGLE_SERVICE_ACCOUNT_JSON
        Value: paste entire contents of the downloaded .json file

   8. UPDATE API KEY
      In shared-config.js, replace YOUR_GOOGLE_API_KEY with your
      existing API key (same one used for the blog)

   ================================================================
*/
