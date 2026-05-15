// ================================================================
// MOISDES — UPLOAD INIT FUNCTION
// netlify/functions/upload-init.js
//
// 1. Receives: filename, mimeType, folderId, fileSize
// 2. Creates a resumable upload session server-side using service account
// 3. Returns the upload URL to the browser
// Browser then uploads directly to that URL with real progress
// ================================================================

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
    const { filename, mimeType, folderId, fileSize } = JSON.parse(event.body);
    if (!filename || !mimeType || !folderId) throw new Error('Missing required fields: filename, mimeType, folderId');

    const token = await getAccessToken();

    // Create resumable upload session server-side
    const metadata = JSON.stringify({ name: filename, parents: [folderId] });
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': fileSize || 0,
      },
      body: metadata,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Drive init failed ${res.status}: ${err.error?.message || res.statusText}`);
    }

    const uploadUrl = res.headers.get('location');
    if (!uploadUrl) throw new Error('No upload URL returned from Google');

    return { statusCode: 200, headers, body: JSON.stringify({ uploadUrl }) };

  } catch(err) {
    console.error('upload-init error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function getAccessToken() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var not set');
  const key    = JSON.parse(keyJson);
  const now    = Math.floor(Date.now() / 1000);
  const scopes = 'https://www.googleapis.com/auth/drive';
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
