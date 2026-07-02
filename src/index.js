// ================================================================
// MOISDES — CLOUDFLARE WORKER API
// src/index.js
// Handles: auth, uploads, CRUD, R2, D1
// ================================================================

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response('', { headers: CORS });

    const url  = new URL(request.url);
    const path = url.pathname;

    try {
      // ── AUTH ──────────────────────────────────────────────────
      if (path === '/api/auth/login')         return login(request, env);
      if (path === '/api/auth/logout')        return logout(request, env);
      if (path === '/api/auth/me')            return me(request, env);

      // ── CONTENT (public reads) ─────────────────────────────
      if (path === '/api/posts'    && request.method === 'GET') return listContent('posts',   request, env);
      if (path === '/api/posters'  && request.method === 'GET') return listContent('posters', request, env);
      if (path === '/api/events'   && request.method === 'GET') return listContent('events',  request, env);
      if (path === '/api/videos'   && request.method === 'GET') return listContent('videos',  request, env);
      if (path === '/api/pdfs'     && request.method === 'GET') return listContent('pdfs',    request, env);
      if (path === '/api/tags')                                  return listTags(request, env);
      if (path === '/api/categories')                            return listCategories(request, env);
      if (path === '/api/parshas')                               return listParshas(request, env);

      // ── UPLOAD (auth required) ─────────────────────────────
      if (path === '/api/upload/r2-sign'  && request.method === 'POST') return r2Sign(request, env);
      if (path === '/api/upload/r2-put'   && request.method === 'POST') return r2Put(request, env);
      if (path === '/api/upload/post'     && request.method === 'POST') return uploadContent('posts',   request, env);
      if (path === '/api/upload/poster'   && request.method === 'POST') return uploadContent('posters', request, env);
      if (path === '/api/upload/event'    && request.method === 'POST') return uploadContent('events',  request, env);
      if (path === '/api/upload/video'    && request.method === 'POST') return uploadContent('videos',  request, env);
      if (path === '/api/upload/pdf'      && request.method === 'POST') return uploadContent('pdfs',    request, env);

      // ── EDIT / DELETE (auth required) ─────────────────────
      if (path.match(/^\/api\/(posts|posters|events|videos|pdfs)\/\d+$/) && request.method === 'PUT')    return editContent(request, env);
      if (path.match(/^\/api\/(posts|posters|events|videos|pdfs)\/\d+$/) && request.method === 'DELETE') return deleteContent(request, env);

      // ── TRASH ─────────────────────────────────────────────
      if (path === '/api/trash'                           && request.method === 'GET')    return listTrash(request, env);
      if (path.match(/^\/api\/trash\/restore\/\d+$/)     && request.method === 'POST')   return restoreTrash(request, env);
      if (path.match(/^\/api\/trash\/permanent\/\d+$/)   && request.method === 'DELETE') return permanentDelete(request, env);

      // ── ADMIN ─────────────────────────────────────────────
      if (path === '/api/admin/users'                          && request.method === 'GET')    return listUsers(request, env);
      if (path === '/api/admin/users'                          && request.method === 'POST')   return createUser(request, env);
      if (path.match(/^\/api\/admin\/users\/\d+$/)             && request.method === 'PUT')    return updateUser(request, env);
      if (path.match(/^\/api\/admin\/users\/\d+$/)             && request.method === 'DELETE') return deleteUser(request, env);
      if (path.match(/^\/api\/admin\/users\/\d+\/permissions$/) && request.method === 'PUT')   return updatePermissions(request, env);

      // ── SUBSCRIBERS ───────────────────────────────────────
      if (path === '/api/subscribe' && request.method === 'POST') return subscribe(request, env);

      // One-time setup endpoint — creates superadmin if no users exist
      if (path === '/api/setup' && request.method === 'GET') return setup(request, env);

      return json({ error: 'Not found' }, 404);
    } catch(e) {
      console.error(e);
      return json({ error: e.message }, 500);
    }
  }
};

// ── AUTH ──────────────────────────────────────────────────────────

async function login(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return json({ error: 'Email and password required' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND active = 1').bind(email).first();
  if (!user) return json({ error: 'Invalid credentials' }, 401);

  const valid = await verifyPassword(password, user.password);
  if (!valid) return json({ error: 'Invalid credentials' }, 401);

  // Create session token
  const token     = await makeToken({ userId: user.id, role: user.role }, env);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
    .bind(user.id, token, expiresAt).run();

  // Get permissions
  const perms = await env.DB.prepare('SELECT page FROM permissions WHERE user_id = ?').bind(user.id).all();

  return json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    permissions: perms.results.map(p => p.page),
  });
}

async function logout(request, env) {
  const token = getToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ success: true });
}

async function me(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);
  const perms = await env.DB.prepare('SELECT page FROM permissions WHERE user_id = ?').bind(user.id).all();
  return json({ user, permissions: perms.results.map(p => p.page) });
}

// ── R2 DIRECT PUT ────────────────────────────────────────────────

async function r2Put(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);

  const url      = new URL(request.url);
  const key      = url.searchParams.get('key');
  const mimeType = url.searchParams.get('mime') || 'application/octet-stream';
  if (!key) return json({ error: 'Missing key' }, 400);

  try {
    const body = await request.arrayBuffer();
    if (!body || body.byteLength === 0) return json({ error: 'Empty file received' }, 400);
    await env.R2.put(key, body, { httpMetadata: { contentType: mimeType } });
    return json({ success: true, key, url: `r2://${key}`, size: body.byteLength });
  } catch(e) {
    return json({ error: 'R2 write failed: ' + e.message }, 500);
  }
}


// ── CONTENT READS ─────────────────────────────────────────────────

async function listContent(table, request, env) {
  const url    = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const tag    = url.searchParams.get('tag') || '';
  const limit  = parseInt(url.searchParams.get('limit') || '200');

  let query = `SELECT * FROM ${table} WHERE deleted_at IS NULL`;
  const params = [];

  if (search) {
    query += ` AND (title LIKE ? OR tags LIKE ? OR description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (tag) {
    query += ` AND tags LIKE ?`;
    params.push(`%${tag}%`);
  }
  query += ` ORDER BY date DESC, created_at DESC LIMIT ?`;
  params.push(limit);

  const stmt = env.DB.prepare(query).bind(...params);
  const rows = await stmt.all();
  return json({ items: rows.results });
}

async function listTags(request, env) {
  const rows = await env.DB.prepare('SELECT name FROM tags ORDER BY name').all();
  return json({ tags: rows.results.map(r => r.name) });
}

async function listCategories(request, env) {
  const rows = await env.DB.prepare('SELECT name FROM categories ORDER BY name').all();
  return json({ categories: rows.results.map(r => r.name) });
}

async function listParshas(request, env) {
  const rows = await env.DB.prepare('SELECT name FROM parshas ORDER BY name').all();
  return json({ parshas: rows.results.map(r => r.name) });
}

// ── R2 SIGNED UPLOAD URL ─────────────────────────────────────────

async function r2Sign(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);

  const { filename, mimeType, folder } = await request.json();
  if (!filename || !mimeType) return json({ error: 'Missing filename or mimeType' }, 400);

  // Build R2 key
  const ext  = filename.split('.').pop();
  const key  = `${folder || 'misc'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Create presigned URL (valid for 1 hour)
  const signedUrl = await env.R2.createMultipartUpload(key);

  // Actually for R2 we just upload directly via the worker
  // Return the key so the client can POST to /api/upload/file
  return json({ key, uploadEndpoint: '/api/upload/file' });
}

// ── CONTENT UPLOAD ────────────────────────────────────────────────

async function uploadContent(table, request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);

  // Check permission
  const pageMap = { posts: 'blog', posters: 'posters', events: 'events', videos: 'video', pdfs: 'pdfs' };
  const page    = pageMap[table];
  if (user.role !== 'superadmin') {
    const perm = await env.DB.prepare('SELECT can_upload FROM permissions WHERE user_id = ? AND page = ?')
      .bind(user.id, page).first();
    if (!perm || !perm.can_upload) return json({ error: `No upload permission for ${page}` }, 403);
  }

  const body = await request.json();

  // Handle new tags/categories/parshas
  await saveNewTaxonomy(env, 'tags',       body.newTags       || []);
  await saveNewTaxonomy(env, 'categories', body.newCategories || []);
  await saveNewTaxonomy(env, 'parshas',    body.newParshas    || []);

  // Insert record based on table
  let id;
  if (table === 'posts') {
    const r = await env.DB.prepare(
      'INSERT INTO posts (date, title, body, folder_url, tags, uploaded_by) VALUES (?,?,?,?,?,?)'
    ).bind(body.date||'', body.title||'', body.body||'', body.folder_url||'', body.tags||'', user.id).run();
    id = r.meta.last_row_id;
  } else if (table === 'posters') {
    const r = await env.DB.prepare(
      'INSERT INTO posters (date, parsha, folder_url, uploaded_by) VALUES (?,?,?,?)'
    ).bind(body.date||'', body.parsha||'', body.folder_url||'', user.id).run();
    id = r.meta.last_row_id;
  } else if (table === 'events') {
    const r = await env.DB.prepare(
      'INSERT INTO events (date, title, location, category, description, tags, folder_url, uploaded_by) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(body.date||'', body.title||'', body.location||'', body.category||'', body.description||'', body.tags||'', body.folder_url||'', user.id).run();
    id = r.meta.last_row_id;
  } else if (table === 'videos') {
    const r = await env.DB.prepare(
      'INSERT INTO videos (date, title, location, category, description, tags, video_url, uploaded_by) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(body.date||'', body.title||'', body.location||'', body.category||'', body.description||'', body.tags||'', body.video_url||'', user.id).run();
    id = r.meta.last_row_id;
  } else if (table === 'pdfs') {
    const r = await env.DB.prepare(
      'INSERT INTO pdfs (date, title, category, language, parsha, year, tags, pdf_url, thumb_url, uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).bind(body.date||'', body.title||'', body.category||'', body.language||'', body.parsha||'', body.year||'', body.tags||'', body.pdf_url||'', body.thumb_url||'', user.id).run();
    id = r.meta.last_row_id;
  }

  // Track R2 files if any
  if (body.r2_keys && body.r2_keys.length) {
    for (const key of body.r2_keys) {
      await env.DB.prepare('INSERT INTO r2_files (key, table_name, record_id) VALUES (?,?,?)')
        .bind(key, table, id).run();
    }
  }

  return json({ success: true, id });
}

// ── EDIT ──────────────────────────────────────────────────────────

async function editContent(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);

  const parts2  = request.url.split('/');
  const editId   = parts2[parts2.length - 1];
  const editTable = parts2[parts2.length - 2];
  const pageMap2 = { posts: 'blog', posters: 'posters', events: 'events', videos: 'video', pdfs: 'pdfs' };
  const editPage = pageMap2[editTable];
  if (user.role !== 'superadmin') {
    const perm = await env.DB.prepare('SELECT can_edit FROM permissions WHERE user_id = ? AND page = ?')
      .bind(user.id, editPage).first();
    if (!perm || !perm.can_edit) return json({ error: `No edit permission for ${editPage}` }, 403);
  }

  const parts  = request.url.split('/');
  const id     = parts.pop();
  const table  = parts.pop();
  const body   = await request.json();

  // Build dynamic update
  const allowed = {
    posts:   ['date','title','body','folder_url','tags'],
    posters: ['date','parsha','folder_url'],
    events:  ['date','title','location','category','description','tags','folder_url'],
    videos:  ['date','title','location','category','description','tags','video_url'],
    pdfs:    ['date','title','category','language','parsha','year','tags','pdf_url','thumb_url'],
  };

  const fields = allowed[table] || [];
  const sets   = fields.filter(f => body[f] !== undefined).map(f => `${f} = ?`);
  const vals   = fields.filter(f => body[f] !== undefined).map(f => body[f]);

  if (!sets.length) return json({ error: 'Nothing to update' }, 400);
  sets.push('updated_at = ?');
  vals.push(new Date().toISOString(), id);

  await env.DB.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();

  await saveNewTaxonomy(env, 'tags',       body.newTags       || []);
  await saveNewTaxonomy(env, 'categories', body.newCategories || []);
  await saveNewTaxonomy(env, 'parshas',    body.newParshas    || []);

  return json({ success: true });
}

// ── DELETE (soft) ─────────────────────────────────────────────────

async function deleteContent(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);
  if (user.role !== 'superadmin' && user.role !== 'admin') return json({ error: 'Admins only' }, 403);

  const parts = request.url.split('/');
  const id    = parts.pop();
  const table = parts.pop();

  const deletedAt = new Date().toISOString();
  await env.DB.prepare(`UPDATE ${table} SET deleted_at = ? WHERE id = ?`).bind(deletedAt, id).run();

  return json({ success: true });
}

// ── TRASH ─────────────────────────────────────────────────────────

async function listTrash(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);
  if (user.role !== 'superadmin' && user.role !== 'admin') return json({ error: 'Admins only' }, 403);

  // 30-day window
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const tables = ['posts','posters','events','videos','pdfs'];
  const items  = [];

  for (const table of tables) {
    const rows = await env.DB.prepare(
      `SELECT *, '${table}' as _table FROM ${table} WHERE deleted_at IS NOT NULL AND deleted_at > ? ORDER BY deleted_at DESC`
    ).bind(cutoff).all();
    items.push(...rows.results);
  }

  items.sort((a,b) => b.deleted_at.localeCompare(a.deleted_at));
  return json({ items });
}

async function restoreTrash(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);
  if (user.role !== 'superadmin' && user.role !== 'admin') return json({ error: 'Admins only' }, 403);

  const body  = await request.json();
  const { table, id } = body;
  await env.DB.prepare(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`).bind(id).run();
  return json({ success: true });
}

async function permanentDelete(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);
  if (user.role !== 'superadmin') return json({ error: 'Superadmin only' }, 403);

  const body  = await request.json();
  const { table, id } = body;

  // Delete R2 files
  const files = await env.DB.prepare('SELECT key FROM r2_files WHERE table_name = ? AND record_id = ?')
    .bind(table, id).all();
  for (const f of files.results) {
    await env.R2.delete(f.key).catch(() => {});
  }
  await env.DB.prepare('DELETE FROM r2_files WHERE table_name = ? AND record_id = ?').bind(table, id).run();
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();

  return json({ success: true });
}

// ── ADMIN — USERS ─────────────────────────────────────────────────

async function listUsers(request, env) {
  const user = await requireAuth(request, env);
  if (user.error) return json(user, 401);
  if (user.role !== 'superadmin') return json({ error: 'Superadmin only' }, 403);

  const users = await env.DB.prepare('SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at DESC').all();
  const perms = await env.DB.prepare('SELECT user_id, page FROM permissions').all();

  const permMap = {};
  perms.results.forEach(p => {
    if (!permMap[p.user_id]) permMap[p.user_id] = [];
    permMap[p.user_id].push(p.page);
  });

  return json({ users: users.results.map(u => ({ ...u, permissions: permMap[u.id] || [] })) });
}

async function createUser(request, env) {
  const actor = await requireAuth(request, env);
  if (actor.error) return json(actor, 401);
  if (actor.role !== 'superadmin') return json({ error: 'Superadmin only' }, 403);

  const { email, password, name, role, permissions } = await request.json();
  if (!email || !password) return json({ error: 'Email and password required' }, 400);

  const hash = await hashPassword(password);
  const r    = await env.DB.prepare('INSERT INTO users (email, password, name, role) VALUES (?,?,?,?)')
    .bind(email, hash, name||'', role||'user').run();
  const userId = r.meta.last_row_id;

  if (permissions && permissions.length) {
    for (const perm of permissions) {
      const { page, can_upload = 1, can_edit = 1 } = typeof perm === 'string' ? { page: perm } : perm;
      await env.DB.prepare('INSERT INTO permissions (user_id, page, can_upload, can_edit) VALUES (?,?,?,?)')
        .bind(userId, page, can_upload ? 1 : 0, can_edit ? 1 : 0).run();
    }
  }

  return json({ success: true, id: userId });
}

async function updateUser(request, env) {
  const actor = await requireAuth(request, env);
  if (actor.error) return json(actor, 401);
  if (actor.role !== 'superadmin') return json({ error: 'Superadmin only' }, 403);

  const id   = request.url.split('/').pop();
  const body = await request.json();
  const sets = [], vals = [];

  if (body.name  !== undefined) { sets.push('name = ?');   vals.push(body.name); }
  if (body.role  !== undefined) { sets.push('role = ?');   vals.push(body.role); }
  if (body.active !== undefined) { sets.push('active = ?'); vals.push(body.active ? 1 : 0); }
  if (body.password) {
    sets.push('password = ?');
    vals.push(await hashPassword(body.password));
  }

  if (sets.length) {
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString(), id);
    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  }

  return json({ success: true });
}

async function deleteUser(request, env) {
  const actor = await requireAuth(request, env);
  if (actor.error) return json(actor, 401);
  if (actor.role !== 'superadmin') return json({ error: 'Superadmin only' }, 403);

  const id = request.url.split('/').pop();
  await env.DB.prepare('UPDATE users SET active = 0 WHERE id = ?').bind(id).run();
  return json({ success: true });
}

async function updatePermissions(request, env) {
  const actor = await requireAuth(request, env);
  if (actor.error) return json(actor, 401);
  if (actor.role !== 'superadmin') return json({ error: 'Superadmin only' }, 403);

  const parts  = request.url.split('/');
  parts.pop(); // 'permissions'
  const userId = parts.pop();
  const { permissions } = await request.json();

  await env.DB.prepare('DELETE FROM permissions WHERE user_id = ?').bind(userId).run();
  for (const perm of (permissions || [])) {
    const { page, can_upload = 1, can_edit = 1 } = perm;
    await env.DB.prepare('INSERT INTO permissions (user_id, page, can_upload, can_edit) VALUES (?,?,?,?)')
      .bind(userId, page, can_upload ? 1 : 0, can_edit ? 1 : 0).run();
  }

  return json({ success: true });
}

// ── SETUP (one-time) ─────────────────────────────────────────────

async function setup(request, env) {
  try {
    const existing = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    if (existing && existing.count > 0) {
      return json({ error: 'Setup already complete. Users exist.' }, 400);
    }
    const hash = await hashPassword('buchinger12');
    await env.DB.prepare('INSERT INTO users (email, password, name, role) VALUES (?,?,?,?)')
      .bind('tulib.vien@gmail.com', hash, 'Admin', 'superadmin').run();
    return json({ success: true, message: 'Superadmin created. Email: tulib.vien@gmail.com' });
  } catch(e) {
    return json({ error: e.message }, 500);
  }
}


// ── SUBSCRIBERS ───────────────────────────────────────────────────

async function subscribe(request, env) {
  const { email } = await request.json();
  if (!email || !email.includes('@')) return json({ error: 'Invalid email' }, 400);
  await env.DB.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').bind(email).run();
  return json({ success: true });
}

// ── HELPERS ───────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function getToken(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.replace('Bearer ', '').trim() || null;
}

async function requireAuth(request, env) {
  const token = getToken(request);
  if (!token) return { error: 'No token' };

  const session = await env.DB.prepare(
    'SELECT s.user_id, s.expires_at, u.email, u.name, u.role, u.active FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).bind(token).first();

  if (!session) return { error: 'Invalid token' };
  if (!session.active) return { error: 'Account disabled' };
  if (new Date(session.expires_at) < new Date()) return { error: 'Token expired' };

  return { id: session.user_id, email: session.email, name: session.name, role: session.role };
}

async function makeToken(payload, env) {
  // Simple secure random token
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function hashPassword(password) {
  // Use PBKDF2 via Web Crypto (available in Cloudflare Workers)
  const enc  = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key, 256
  );
  const saltHex = Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('');
  const hashHex = Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  if (stored.startsWith('pbkdf2:')) {
    const [, saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(h=>parseInt(h,16)));
    const enc  = new TextEncoder();
    const key  = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
      key, 256
    );
    const testHex = Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
    return testHex === hashHex;
  }
  // Legacy bcrypt hash from seed — just check known credentials for first login
  return false;
}

async function saveNewTaxonomy(env, table, items) {
  for (const name of items) {
    if (name && name.trim()) {
      await env.DB.prepare(`INSERT OR IGNORE INTO ${table} (name) VALUES (?)`).bind(name.trim()).run();
    }
  }
}
