// ================================================================
// MOISDES — UPLOAD FINALIZE FUNCTION
// netlify/functions/upload-finalize.js
//
// Called after browser finishes uploading a file directly to Drive.
// 1. Makes the file publicly readable
// 2. Returns the public file URL
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
    const { fileId } = JSON.parse(event.body);
    if (!fileId) throw new Error('Missing fileId');

    const token = await getAccessToken();

    // Make file publicly readable
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        success: true,
        fileUrl: `https://drive.google.com/file/d/${fileId}/view`,
      }),
    };
  } catch(err) {
    console.error('finalize error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function getAccessToken() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var not set');
  const key = JSON.parse(keyJson);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim  = b64url(JSON.stringify({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', exp: now+3600, iat: now }));
  const unsigned  = `${header}.${claim}`;
  const signature = await signRS256(unsigned, key.private_key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${signature}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Auth failed');
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
