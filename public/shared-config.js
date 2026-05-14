// ╔══════════════════════════════════════════════════════════════════╗
// ║              MOISDES PLATFORM — SHARED CONFIG                   ║
// ║                  shared-config.js                               ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  Used by every page. Update these values once for all pages.    ║
// ╚══════════════════════════════════════════════════════════════════╝

window.MOISDES = window.MOISDES || {};

window.MOISDES.CFG = {
  // ── Google Sheets (read-only, public API key) ──────────────────
  apikey:  'AIzaSyC63LW2ylnKy87edG1svzFoMbPJqB7iuYw',
  sheetid: '1Xox6zr8NeSCCwpQg0u3C1dHXtzvPoBRYa0SpG57xHqc',

  // ── Sheet tab names ────────────────────────────────────────────
  tabs: {
    blog:       'Blog Posts',
    posters:    'Posters',
    events:     'Events',
    videos:     'Videos',
    pdfs:       'PDFs',
    tags:       'Tags',
    categories: 'Categories',
    parshas:    'Parshas',
  },

  // ── Netlify function base URL ──────────────────────────────────
  // Leave as-is — works on any Netlify deployment
  submitBase: 'https://moisdesvienweb.netlify.app/.netlify/functions',

  // ── Google Drive parent folder IDs ────────────────────────────
  // Create a subfolder for each content type, share each with
  // the service account email, paste the folder IDs here
  driveFolders: {
    blog:    '1LmlA1XMIcrEldHApZixxu6e6iCt8z5Xb',
    posters: '1PyTtMHQwMCwfS0oDaA24hWOMcbXT8Q6X',
    events:  '1RMreEDQ49GhqYeir2toK42wwdGlU0qAY',
    videos:  '1URbZIxz0b08AdLhk5AaO11CeGLzQlm3L',
    pdfs:    '1XwpZfTmKhxlbd7kVb2hSbPSxx0v8JyMv',
  },

  // ── Logo ───────────────────────────────────────────────────────
  logo: '/logo.avif',

  // ── Site pages (used for cross-page links) ─────────────────────
  pages: {
    home:           '/',
    blog:           '/blog',
    posters:        '/posters',
    events:         '/events',
    videos:         '/video',
    pdfs:           '/pdfs',
    uploadHub:      '/upload',
    uploadBlog:     '/upload-blog',
    uploadPosters:  '/upload-posters',
    uploadEvents:   '/upload-events',
    uploadVideos:   '/upload-video',
    uploadPdfs:     '/upload-pdfs',
  },

  // ── Parsha anchor (update every ~2 years if parshas drift) ─────
  anchorDate:  '2025-10-18', // Bereishit 5786 = Oct 18 2025
  anchorIndex: 0,

  // ── Hebrew parsha list ─────────────────────────────────────────
  parshiyot: [
    'בראשית','נח','לך לך','וירא','חיי שרה','תולדות','ויצא','וישלח','וישב','מקץ','ויגש','ויחי',
    'שמות','וארא','בא','בשלח','יתרו','משפטים','תרומה','תצוה','כי תשא','ויקהל','פקודי',
    'ויקרא','צו','שמיני','תזריע','מצורע','אחרי','קדושים','אמור','בהר','בחוקותי',
    'במדבר','נשא','בהעלותך','שלח','קרח','חוקת','בלק','פינחס','מטות','מסעי',
    'דברים','ואתחנן','עקב','ראה','שופטים','כי תצא','כי תבוא','נצבים','וילך','האזינו','וזאת הברכה'
  ],
  combined: {
    'ויקהל':'ויקהל-פקודי','תזריע':'תזריע-מצורע','אחרי':'אחרי-קדושים',
    'בהר':'בהר-בחוקותי','מטות':'מטות-מסעי','נצבים':'נצבים-וילך'
  },
};

// ── SHARED UTILITIES ───────────────────────────────────────────────

window.MOISDES.util = {

  // Hebrew year → display string e.g. תשפ"ה
  yearToHebrew(y) {
    const n=y-5000, H=['','ק','ר','ש','ת'], T=['','י','כ','ל','מ','נ','ס','ע','פ','צ'], O=['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
    let h=Math.floor(n/100),t=Math.floor((n%100)/10),o=n%10,r='';
    if(h>4){r+='ת';h-=4;} r+=H[h]||'';
    const to=t*10+o;
    if(to===15)r+='ט"ו'; else if(to===16)r+='ט"ז'; else{r+=T[t]||'';r+=O[o]||'';}
    return r.length===1?r+"'":r.slice(0,-1)+'"'+r.slice(-1);
  },

  currentHebrewYear() {
    const now=new Date(),hy=now.getFullYear()+3760;
    return now.getMonth()>=8?hy+1:hy;
  },

  // YYYY-MM-DD date → parsha name
  dateToParsha(dateStr) {
    const CFG = window.MOISDES.CFG;
    const anchor = new Date(CFG.anchorDate + 'T12:00:00Z');
    const date   = new Date(dateStr + 'T12:00:00Z');
    const msWeek = 7*86400000;
    // Find the Shabbat of that week (go to next Saturday)
    const dow = date.getUTCDay();
    const daysToShabbat = (6 - dow + 7) % 7;
    const shabbat = new Date(date.getTime() + daysToShabbat * 86400000);
    const wkDiff  = Math.round((shabbat - anchor) / msWeek);
    const idx     = ((CFG.anchorIndex + wkDiff) % CFG.parshiyot.length + CFG.parshiyot.length) % CFG.parshiyot.length;
    const p = CFG.parshiyot[idx];
    return CFG.combined[p] || p;
  },

  // Hebrew year + parsha + dow → Gregorian Date object
  hebrewToDate(hebrewYear, parshaName, dowIndex) {
    const CFG      = window.MOISDES.CFG;
    const gregYear = hebrewYear - 3760;
    const msDay    = 86400000, msWeek = 7*msDay;
    const anchor   = new Date(CFG.anchorDate + 'T12:00:00Z');
    const combinedRev = {};
    for (const [b,d] of Object.entries(CFG.combined)) combinedRev[d]=b;
    const baseName = combinedRev[parshaName] || parshaName;
    const start = new Date(`${gregYear-1}-09-01T12:00:00Z`);
    const end   = new Date(`${gregYear+1}-10-01T12:00:00Z`);
    const matches = [];
    let cur = new Date(start);
    while (cur <= end) {
      if (cur.getUTCDay()===6) {
        const wk  = Math.round((cur-anchor)/msWeek);
        const idx = ((CFG.anchorIndex+wk)%CFG.parshiyot.length+CFG.parshiyot.length)%CFG.parshiyot.length;
        const p   = CFG.parshiyot[idx];
        if (p===baseName || (CFG.combined[p]||p)===parshaName) matches.push(new Date(cur));
      }
      cur = new Date(cur.getTime()+msDay);
    }
    if (!matches.length) return null;
    const mid = new Date(`${gregYear}-01-15T12:00:00Z`);
    matches.sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid));
    const sunday = new Date(matches[0].getTime()-6*msDay);
    return new Date(sunday.getTime()+dowIndex*msDay);
  },

  // MM/DD/YYYY → Date object
  parseDate(str) {
    if (!str) return null;
    const [m,d,y] = str.split('/');
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00Z`);
  },

  // Date → MM/DD/YYYY
  fmtDate(date) {
    const m=String(date.getUTCMonth()+1).padStart(2,'0');
    const d=String(date.getUTCDate()).padStart(2,'0');
    const y=date.getUTCFullYear();
    return `${m}/${d}/${y}`;
  },

  // MM/DD/YYYY → readable English
  readableDate(str) {
    const d = this.parseDate(str);
    if (!d) return str;
    return d.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  },

  // Escape HTML
  eh(s){ return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''; },
  ea(s){ return s?String(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;'):''; },

  // Fetch a sheet range, return array of row arrays
  async sheetRange(tab, range) {
    const CFG = window.MOISDES.CFG;
    const r   = encodeURIComponent(`'${tab}'!${range}`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.sheetid}/values/${r}?key=${CFG.apikey}`;
    const res = await fetch(url);
    const d   = await res.json();
    return d.values || [];
  },

  // Fetch all rows from a tab (skipping header row 1)
  async sheetRows(tab) {
    const rows = await this.sheetRange(tab, 'A2:Z');
    return rows;
  },

  // Get all tags from Tags tab
  async getAllTags() {
    const rows = await this.sheetRange(window.MOISDES.CFG.tabs.tags, 'A:A');
    return [...new Set(rows.flat().filter(Boolean))].sort((a,b)=>a.localeCompare(b,'he'));
  },

  // Weeks ago check
  weeksAgo(dateStr, weeks) {
    const d = this.parseDate(dateStr);
    if (!d) return false;
    return (Date.now() - d.getTime()) < weeks * 7 * 86400000;
  },

  // Drive file ID from URL
  driveId(url) {
    if (!url) return null;
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  },

  // Drive folder ID from URL
  driveFolderId(url) {
    if (!url) return null;
    const m = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  },

  // List files in a Drive folder (public, API key read)
  async driveFiles(folderId) {
    const CFG = window.MOISDES.CFG;
    const q   = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&orderBy=name&key=${CFG.apikey}`;
    const res = await fetch(url);
    const d   = await res.json();
    return d.files || [];
  },

  // Hash routing helpers
  getHash() { return decodeURIComponent(location.hash.slice(1)); },
  setHash(h) { history.pushState(null,'',h?`#${encodeURIComponent(h)}`:location.pathname); },

  // Cross-page search URL
  searchUrl(query) {
    return `${window.MOISDES.CFG.pages.blog}#search-${encodeURIComponent(query)}`;
  },

  // Date comparator (newest first)
  dateDesc(a, b) {
    const da = this.parseDate(a), db = this.parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db - da;
  },
};
