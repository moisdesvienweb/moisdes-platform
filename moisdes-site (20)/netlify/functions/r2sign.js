// ================================================================
// MOISDES — R2 PRESIGN FUNCTION
// netlify/functions/r2sign.js
//
// Returns a presigned URL for direct browser → R2 upload
// ================================================================

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '827d870dd8e30d20f69797a9c2d6fda7';
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

  try {
    const { key, mimeType } = JSON.parse(event.body);
    if (!key) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing key' }) };

    // Generate presigned URL using Cloudflare R2 S3-compatible API
    // We use HMAC-SHA256 signing
    const url = await generatePresignedUrl(key, mimeType || 'application/octet-stream');
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ url, key }) };

  } catch(err) {
    console.error('r2sign error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};

async function generatePresignedUrl(key, contentType) {
  const { createHmac, createHash } = await import('crypto');

  const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY not set in Netlify environment variables');
  }

  const endpoint = `${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const bucket   = CF_R2_BUCKET;
  const region   = 'auto';
  const service  = 's3';
  const expires  = 3600; // 1 hour

  const now     = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
  const timeStr = now.toISOString().replace(/[:-]/g,'').slice(0,15) + 'Z';

  const credential      = `${accessKeyId}/${dateStr}/${region}/${service}/aws4_request`;
  const signedHeaders   = 'host';

  const queryParams = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${timeStr}`,
    `X-Amz-Expires=${expires}`,
    `X-Amz-SignedHeaders=${signedHeaders}`,
  ].join('&');

  const canonicalRequest = [
    'PUT',
    `/${encodeURIComponent(key).replace(/%2F/g,'/')}`,
    queryParams,
    `host:${endpoint}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hash = s => createHash('sha256').update(s).digest('hex');
  const hmac = (k, d) => createHmac('sha256', k).update(d).digest();

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timeStr,
    `${dateStr}/${region}/${service}/aws4_request`,
    hash(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStr), region), service),
    'aws4_request'
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return `https://${endpoint}/${bucket}/${encodeURIComponent(key).replace(/%2F/g,'/')}?${queryParams}&X-Amz-Signature=${signature}`;
}
