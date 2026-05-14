// ================================================================
// MOISDES — TOKEN FUNCTION
// netlify/functions/token.js
//
// Returns a short-lived Google access token to the browser.
// The browser then uploads directly to Drive and Sheets.
// No file data passes through this function — it just signs a JWT.
// ================================================================

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const token = await getAccessToken();
    return { statusCode: 200, headers, body: JSON.stringify({ token }) };
  } catch(err) {
    console.error('Token error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function getAccessToken() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var not set');

  const key    = JSON.parse(keyJson);
  const now    = Math.floor(Date.now() / 1000);
  const scopes = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim   = b64url(JSON.stringify({
    iss: key.client_email,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

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
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signRS256(data, pem) {
  const { createSign } = await import('crypto');
  const s = createSign('RSA-SHA256');
  s.update(data);
  s.end();
  return b64url(s.sign(pem));
}
