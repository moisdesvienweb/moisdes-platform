// ╔══════════════════════════════════════════════════════════════╗
// ║              מאישדעס בלאג — WIX CUSTOM ELEMENT              ║
// ╠══════════════════════════════════════════════════════════════╣
// ║  THINGS YOU MAY NEED TO CHANGE:                             ║
// ║                                                              ║
// ║  1. API KEY (Google Sheets + Drive API key)                  ║
// ║     Search for: apikey                                       ║
// ║     Current:    AIzaSyBJs74DJq159sbhNcASYv-OLBnYTZpRc18     ║
// ║                                                              ║
// ║  2. SPREADSHEET ID                                           ║
// ║     Search for: sheetid                                      ║
// ║     Current:    1SzJShr4Q0WKTzATW6YPJ06QpCohSiYmmZ0e5DcEPHHU║
// ║                                                              ║
// ║  3. SHEET TAB NAME                                           ║
// ║     Search for: tab                                          ║
// ║     Current:    'Image Posts'                                ║
// ║                                                              ║
// ║  4. COLUMN NAMES (must match your sheet headers exactly)     ║
// ║     Search for: col:                                         ║
// ║     Current:    Date, Images, Title, Content, Body, Tags     ║
// ║                                                              ║
// ║  5. PARSHA ANCHOR DATE (update if parsha falls out of sync)  ║
// ║     Search for: ANCHOR_DATE                                  ║
// ║     Current:    Bereishit 5786 = Oct 18 2025                 ║
// ╚══════════════════════════════════════════════════════════════╝

class MoisdesBlog extends HTMLElement {
  connectedCallback() {
    // DEBUG: visible banner confirms JS is loading — auto-removes after 5s

    // END DEBUG

    // Inject Google Fonts into the main document (not shadow DOM)
    if (!document.querySelector('#moisdes-blog-font')) {
      const link = document.createElement('link');
      link.id = 'moisdes-blog-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap';
      document.head.appendChild(link);
    }

    // Use open shadow DOM so styles are scoped but fonts/lightbox can reach outside
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        /* ── RESET ───────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host {
          display: block;
          width: 100%;
          font-family: 'Heebo', sans-serif;
          font-size: 15px;
          line-height: 1.6;
          direction: rtl;
          color: #ffffff;
          padding: 0 48px;
          box-sizing: border-box;
        }
        @media(max-width:600px){
          :host { padding: 0 20px; }
        }

        /* ── CSS VARS ────────────────────────────────── */
        :host {
          --text:     #ffffff;
          --muted:    rgba(255,255,255,0.55);
          --subtle:   rgba(255,255,255,0.3);
          --border:   rgba(255,255,255,0.18);
          --hover-bg: rgba(255,255,255,0.06);
          --tag-bg:   rgba(255,255,255,0.1);
        }

        /* ── SEARCH ──────────────────────────────────── */
        .search-wrap {
          display: flex; justify-content: center;
          padding: 0.85rem 0; border-bottom: 1px solid var(--border);
        }
        .search-input {
          width: 70%; background: transparent; border: 1px solid var(--border);
          color: var(--text); font-family: 'Heebo', sans-serif; font-size: 0.88rem;
          padding: 0.55rem 0.85rem; outline: none; border-radius: 2px;
          transition: border 0.15s; direction: rtl;
        }
        .search-input::placeholder { color: var(--subtle); }
        .search-input:focus { border-color: rgba(255,255,255,0.5); }

        /* ── TAG BAR ─────────────────────────────────── */
        .tag-bar {
          padding: 0.7rem 0; border-bottom: 1px solid var(--border);
          display: flex; flex-wrap: wrap; gap: 0.35rem;
          direction: rtl; align-items: center;
        }
        .tag-chip {
          font-size: 0.73rem; padding: 0.2rem 0.65rem;
          background: transparent; border: 1px solid var(--border);
          cursor: pointer; font-family: 'Heebo', sans-serif;
          color: var(--muted); border-radius: 99px; transition: all 0.15s;
        }
        .tag-chip:hover { border-color: var(--text); color: var(--text); }
        .tag-chip.active {
          background: rgba(255,255,255,0.15);
          color: var(--text); border-color: rgba(255,255,255,0.5);
        }
        .tag-heading { padding: 1.1rem 0 0.1rem; direction: rtl; display: none; }
        .tag-heading h2 { font-size: 0.95rem; font-weight: 500; color: var(--muted); }
        .tag-heading h2 span { color: var(--text); font-weight: 700; }

        /* ── POST LIST ───────────────────────────────── */
        #list-view { display: block; }
        .post-row {
          display: grid; grid-template-columns: 130px 1fr;
          border-bottom: 1px solid var(--border);
          cursor: pointer; transition: background 0.12s; min-height: 120px;
        }
        .post-row:hover { background: var(--hover-bg); }
        .post-row-date {
          padding: 1.25rem 0.75rem 1.25rem 0.5rem;
          border-left: 1px solid var(--border);
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          gap: 0.2rem; flex-shrink: 0; text-align: center;
        }
        .post-parsha-list  { font-size: 0.95rem; font-weight: 900; color: var(--text); line-height: 1.15; }
        .post-yiddish-day  { font-size: 0.72rem; font-weight: 500; color: var(--muted); line-height: 1.2; margin-top: 0.2rem; }
        .post-hebrew-date  { font-size: 0.62rem; color: var(--subtle); line-height: 1.4; direction: rtl; }
        .post-row-body {
          padding: 1.25rem 1.1rem 1.25rem 0.75rem; direction: rtl;
          display: flex; flex-direction: column; justify-content: center;
        }
        .post-row-main  { display: flex; gap: 0.75rem; align-items: flex-start; }
        .post-row-text  { flex: 1; min-width: 0; }
        .post-row-title { font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem; line-height: 1.4; }
        .post-row-excerpt {
          font-size: 0.8rem; color: var(--muted);
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;
        }
        .post-thumb-wrap { flex-shrink: 0; }
        .post-thumb { width: 90px; height: 70px; object-fit: cover; display: block; opacity: 0.85; background: rgba(255,255,255,0.08); }
        .post-row-tags { margin-top: 0.6rem; display: flex; gap: 0.3rem; flex-wrap: wrap; }
        .post-row-tag {
          font-size: 0.67rem; padding: 0.1rem 0.48rem;
          background: var(--tag-bg); color: var(--muted);
          border-radius: 99px; cursor: pointer; border: none;
          font-family: inherit; transition: all 0.15s;
        }
        .post-row-tag:hover { background: rgba(255,255,255,0.2); color: var(--text); }

        /* ── SINGLE POST ─────────────────────────────── */
        #post-view { display: none; direction: rtl; }
        .post-back {
          padding: 0.85rem 0; border-bottom: 1px solid var(--border);
          font-size: 0.78rem; color: var(--muted); cursor: pointer;
          display: inline-flex; align-items: center; gap: 0.35rem;
          direction: ltr; background: none;
          border-top: none; border-left: none; border-right: none;
          width: 100%; font-family: inherit; transition: color 0.15s;
        }
        .post-back:hover { color: var(--text); }
        .post-header { padding: 1.75rem 0 1.25rem; direction: rtl; }
        .post-header-parsha { font-size: 1.6rem; font-weight: 900; color: var(--text); line-height: 1.15; margin-bottom: 0.4rem; }
        .post-header-dateline { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.9rem; flex-wrap: wrap; }
        .post-header-yiddish   { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
        .post-header-sep       { color: var(--subtle); font-size: 0.75rem; }
        .post-header-hebrewfull{ font-size: 0.8rem; color: var(--muted); }
        .post-header-title { font-size: 1.45rem; font-weight: 900; line-height: 1.25; color: var(--text); direction: rtl; }
        .post-header-tags  { margin-top: 1rem; display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .post-header-tag {
          font-size: 0.7rem; padding: 0.2rem 0.65rem;
          border: 1px solid var(--border); color: var(--muted);
          cursor: pointer; border-radius: 99px; background: none;
          font-family: inherit; transition: all 0.15s;
        }
        .post-header-tag:hover { border-color: var(--text); color: var(--text); }
        .post-divider { border: none; border-top: 1px solid var(--border); margin: 0; }
        .post-body {
          padding: 1.5rem 0; font-size: 0.95rem; line-height: 1.85;
          color: rgba(255,255,255,0.88); white-space: pre-wrap;
          word-break: break-word; direction: rtl;
        }
        .post-body-text {
          padding: 1.5rem 0 0.5rem; font-size: 11px; line-height: 1.9;
          color: rgba(255,255,255,0.88); text-align: justify;
          text-align-last: right; direction: rtl;
          word-break: break-word; white-space: pre-wrap;
        }

        /* ── IMAGES ──────────────────────────────────── */
        .post-images { padding: 0.5rem 0 1.5rem; }
        .post-images-label {
          font-size: 0.68rem; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--subtle); margin-bottom: 0.75rem;
        }
        .images-stack { display: flex; justify-content: center; flex-direction: column; gap: 0.6rem; }
        .img-full {
          width: 80%; display: block; margin: 0 auto; cursor: pointer;
          transition: opacity 0.15s; background: rgba(255,255,255,0.06);
          opacity: 0.92; border-radius: 2px; max-height: 80vh; object-fit: contain;
        }
        .img-full:hover { opacity: 1; }

        /* ── SHARE ───────────────────────────────────── */
        .share-bar {
          padding: 1rem 0; border-top: 1px solid var(--border);
          display: flex; gap: 0.6rem; align-items: center;
          direction: ltr; flex-wrap: wrap;
        }
        .share-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--subtle); }
        .share-btn {
          font-size: 0.75rem; padding: 0.35rem 0.85rem;
          border: 1px solid var(--border); background: none;
          cursor: pointer; font-family: inherit; color: var(--muted); transition: all 0.15s;
        }
        .share-btn:hover { border-color: rgba(255,255,255,0.6); color: var(--text); }
        .share-btn.copied { background: rgba(255,255,255,0.15); color: var(--text); }

        /* ── LIGHTBOX (inside shadow) ────────────────── */
        .lightbox {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.94); z-index: 99999;
          align-items: center; justify-content: center; padding: 1rem;
        }
        .lightbox.open { display: flex; }
        .lb-img { max-width: 95vw; max-height: 92vh; width: auto; height: auto; object-fit: contain; display: block; }
        .lb-btn {
          position: fixed; background: rgba(255,255,255,0.12);
          border: none; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: background 0.15s;
        }
        .lb-btn:hover { background: rgba(255,255,255,0.25); }
        .lb-close { top: 1rem; right: 1rem; width: 38px; height: 38px; font-size: 1.1rem; }
        .lb-prev  { left: 1rem; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; font-size: 1.6rem; }
        .lb-next  { right: 1rem; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; font-size: 1.6rem; }
        .lb-counter {
          position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%);
          color: rgba(255,255,255,0.4); font-size: 0.78rem; font-family: 'Heebo', sans-serif;
        }

        /* ── STATES ──────────────────────────────────── */
        .state-msg { padding: 3rem 0; text-align: center; color: var(--muted); font-size: 0.88rem; }
        .spinner {
          width: 24px; height: 24px; border: 2px solid var(--border);
          border-top-color: rgba(255,255,255,0.7); border-radius: 50%;
          animation: spin 0.7s linear infinite; margin: 0 auto 0.75rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        mark { background: rgba(255,255,255,0.25); color: var(--text); border-radius: 2px; padding: 0 1px; }
      </style>

      <!-- ── BLOG HTML ─────────────────────────────── -->
      <div id="app">
        <div class="search-wrap">
          <input class="search-input" id="search-input" type="text" placeholder="זוך..." oninput="this.getRootNode().host._blog.onSearch(this.value)">
        </div>
        <div id="list-view">
          <div class="tag-bar" id="tag-bar"></div>
          <div class="tag-heading" id="tag-heading">
            <h2>קאטאגאריעס: <span id="tag-heading-name"></span></h2>
          </div>
          <div id="posts-list"></div>
        </div>
        <div id="post-view">
          <button class="post-back" onclick="this.getRootNode().host._blog.goHome()">← צוריק צום היים בלאט</button>
          <div id="post-content"></div>
        </div>
      </div>

      <!-- Lightbox lives inside shadow DOM so it can overlay the full page -->
      <div class="lightbox" id="lightbox">
        <button class="lb-btn lb-close" onclick="this.getRootNode().host._blog.closeLightbox()">✕</button>
        <button class="lb-btn lb-prev" id="lb-prev" onclick="this.getRootNode().host._blog.lbNav(-1)">‹</button>
        <button class="lb-btn lb-next" id="lb-next" onclick="this.getRootNode().host._blog.lbNav(1)">›</button>
        <img class="lb-img" id="lb-img" src="" alt="">
        <div class="lb-counter" id="lb-counter"></div>
      </div>
    `;

    // Boot the blog logic, scoped to this shadow root
    this._blog = new BlogApp(this.shadowRoot, this);
    this._blog.boot();
  }
}

// ══════════════════════════════════════════════════════════════
//  BLOG APPLICATION CLASS
//  All logic is scoped here so multiple instances don't conflict
// ══════════════════════════════════════════════════════════════
class BlogApp {
  constructor(root, host) {
    this.root = root;       // shadow root
    this.host = host;       // the custom element itself
    this.ALL_POSTS   = [];
    this.activeTag   = null;
    this.searchQuery = '';
    this.lbImages    = [];
    this.lbIndex     = 0;
    this.folderCache = {};

    // ══════════════════════════════════════════════
    //  ⬇⬇⬇  YOUR CONFIGURATION — EDIT HERE  ⬇⬇⬇
    // ══════════════════════════════════════════════
    this.CFG = {
      // ── Google API Key ─────────────────────────
      // Used for both Google Sheets API and Google Drive API
      // To change: replace the string below
      // ── UPDATE THESE to your new Google account values ──
      apikey:  'AIzaSyC63LW2ylnKy87edG1svzFoMbPJqB7iuYw',

      // ── Google Spreadsheet ID ──────────────────
      sheetid: '1Xox6zr8NeSCCwpQg0u3C1dHXtzvPoBRYa0SpG57xHqc',

      // ── Sheet Tab Name ─────────────────────────
      tab: 'Blog Posts',

      // ── Column Header Names ────────────────────
      col: {
        date:    'Date',
        images:  'Images',
        title:   'Title',
        content: 'Content',
        body:    'Body',
        tags:    'Tags',
      }
    };
    // ══════════════════════════════════════════════
    //  ⬆⬆⬆  END OF CONFIGURATION  ⬆⬆⬆
    // ══════════════════════════════════════════════

    // ── PARSHA ANCHOR ──────────────────────────────
    // If parsha names fall out of sync, update this date to the
    // MOST RECENT Parshat Bereishit Shabbat date and reset index to 0
    // Current anchor: Bereishit 5786 = Saturday, October 18, 2025
    this.ANCHOR_DATE  = new Date('2025-10-18T12:00:00Z');
    this.ANCHOR_INDEX = 0;

    this.PARSHIYOT = [
      'בראשית','נח','לך לך','וירא','חיי שרה','תולדות','ויצא','וישלח','וישב','מקץ','ויגש','ויחי',
      'שמות','וארא','בא','בשלח','יתרו','משפטים','תרומה','תצוה','כי תשא','ויקהל','פקודי',
      'ויקרא','צו','שמיני','תזריע','מצורע','אחרי','קדושים','אמור','בהר','בחוקותי',
      'במדבר','נשא','בהעלותך','שלח','קרח','חוקת','בלק','פינחס','מטות','מסעי',
      'דברים','ואתחנן','עקב','ראה','שופטים','כי תצא','כי תבוא','נצבים','וילך','האזינו','וזאת הברכה'
    ];
    this.COMBINED = {
      'ויקהל': 'ויקהל-פקודי', 'תזריע': 'תזריע-מצורע',
      'אחרי': 'אחרי-קדושים', 'בהר': 'בהר-בחוקותי',
      'מטות': 'מטות-מסעי', 'נצבים': 'נצבים-וילך'
    };
    this.YIDDISH_DAYS = ['זונטאג','מאנטאג','דינסטאג','מיטוואך','דאנערשטאג','ערב שבת','מוצאי שבת'];
  }

  // Shorthand: query inside shadow root
  $(sel) { return this.root.querySelector(sel); }

  // ── PARSHA ───────────────────────────────────────
  getParshaForDate(dateStr) {
    const d = this.parseDate(dateStr);
    if (!d) return '';
    const dow = d.getUTCDay();
    const daysUntilShabbat = dow === 6 ? 0 : 6 - dow;
    const shabbat = new Date(d);
    shabbat.setUTCDate(shabbat.getUTCDate() + daysUntilShabbat);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksDiff = Math.round((shabbat - this.ANCHOR_DATE) / msPerWeek);
    const idx = ((this.ANCHOR_INDEX + weeksDiff) % this.PARSHIYOT.length + this.PARSHIYOT.length) % this.PARSHIYOT.length;
    const parsha = this.PARSHIYOT[idx];
    return this.COMBINED[parsha] || parsha;
  }

  // ── HEBREW DATE ──────────────────────────────────
  numToHebrew(n) {
    const ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
    const tens = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
    if (n === 15) return 'ט״ו';
    if (n === 16) return 'ט״ז';
    if (n <= 9)   return ones[n];
    if (n <= 19)  return 'י' + ones[n - 10];
    if (n <= 29)  return tens[Math.floor(n/10)] + (n%10 ? ones[n%10] : '');
    if (n === 30) return 'ל';
    return tens[Math.floor(n/10)] + ones[n%10];
  }

  yearToHebrew(y) {
    const n = y - 5000;
    const hundreds = ['','ק','ר','ש','ת'];
    const tens     = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
    const ones     = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
    let h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
    let result = '';
    if (h > 4) { result += 'ת'; h -= 4; }
    result += hundreds[h] || '';
    const to = t * 10 + o;
    if (to === 15)      result += 'ט״ו';
    else if (to === 16) result += 'ט״ז';
    else { result += tens[t] || ''; result += ones[o] || ''; }
    if (result.length === 1) return result + '׳';
    return result.slice(0, -1) + '״' + result.slice(-1);
  }

  parseDate(str) {
    if (!str) return null;
    let d = new Date(str);
    if (!isNaN(d)) return d;
    const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}T12:00:00Z`);
    return isNaN(d) ? null : d;
  }

  getHebrewDateParts(dateStr) {
    const d = this.parseDate(dateStr);
    if (!d) return { yiddish: '', hebrewFull: '', parsha: '', ts: 0 };
    try {
      const fmt = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
      const partMap = {};
      fmt.formatToParts(d).forEach(p => { partMap[p.type] = p.value; });
      const dayNum   = parseInt(partMap.day);
      const monthStr = (partMap.month || '').replace(/^ב/, '');
      const yearNum  = parseInt(partMap.year);
      const hebrewFull = `${this.numToHebrew(dayNum)} ${monthStr} ${this.yearToHebrew(yearNum)}`;
      return {
        yiddish:    this.YIDDISH_DAYS[d.getDay()],
        hebrewFull,
        parsha:     this.getParshaForDate(dateStr),
        ts:         d.getTime()
      };
    } catch(e) {
      return { yiddish: '', hebrewFull: dateStr, parsha: '', ts: d ? d.getTime() : 0 };
    }
  }

  // ── GOOGLE DRIVE ─────────────────────────────────
  driveId(url) {
    if (!url) return null;
    for (const p of [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/]) {
      const m = url.match(p); if (m) return m[1];
    }
    return null;
  }
  driveFolderId(url) {
    if (!url) return null;
    const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }
  isFolder(url)              { return !!this.driveFolderId(url); }
  driveThumbnail(id, w=600)  { return `https://lh3.googleusercontent.com/d/${id}=w${w}`; }
  driveFull(id)              { return `https://lh3.googleusercontent.com/d/${id}=w1920`; }
  parseLinks(s)              { return s ? s.split(',').map(x => x.trim()).filter(Boolean) : []; }
  parseTags(s)               { return s ? s.split(',').map(x => x.trim()).filter(Boolean) : []; }

  async fetchFolderImages(folderId) {
    if (this.folderCache[folderId]) return this.folderCache[folderId];
    const q   = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&orderBy=name&pageSize=100&key=${this.CFG.apikey}`;
    try {
      const data = await fetch(url).then(r => r.json());
      const ids = (data.files || []).map(f => f.id);
      this.folderCache[folderId] = ids;
      return ids;
    } catch(e) { return []; }
  }

  async resolveImages(raw) {
    if (!raw) return [];
    const links = this.parseLinks(raw);
    if (!links.length) return [];
    if (this.isFolder(links[0])) {
      const fid = this.driveFolderId(links[0]);
      return fid ? await this.fetchFolderImages(fid) : [];
    }
    return links.map(l => this.driveId(l)).filter(Boolean);
  }

  // ── FETCH SHEET ──────────────────────────────────
  async fetchSheet() {
    const range = encodeURIComponent(`'${this.CFG.tab}'`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${this.CFG.sheetid}/values/${range}?key=${this.CFG.apikey}`;
    const res   = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(()=>({}));
      const msg = errData.error?.message || res.status;
      throw new Error(`Sheets API error ${res.status}: ${msg}. Check: (1) API key is correct and Sheets API is enabled, (2) Sheet tab name "${this.CFG.tab}" matches exactly, (3) Sheet is shared publicly or API key has access.`);
    }
    const data  = await res.json();
    const rows  = data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());
    const ci = name => headers.indexOf(name);
    const iDate    = ci(this.CFG.col.date),
          iImages  = ci(this.CFG.col.images),
          iTitle   = ci(this.CFG.col.title),
          iContent = ci(this.CFG.col.content),
          iBody    = ci(this.CFG.col.body),
          iTags    = ci(this.CFG.col.tags);

    const posts = rows.slice(1).map((row, idx) => {
      const get = i => (i >= 0 && i < row.length) ? row[i] : '';
      const dp  = this.getHebrewDateParts(get(iDate));
      const rawImages = get(iImages);
      const thumbId   = (!this.isFolder(rawImages) && rawImages)
        ? (this.driveId(this.parseLinks(rawImages)[0]) || null) : null;
      return {
        id: idx, date: get(iDate), ts: dp.ts,
        yiddish: dp.yiddish, hebrewFull: dp.hebrewFull, parsha: dp.parsha,
        images: rawImages, title: get(iTitle),
        content: get(iContent), body: get(iBody),
        tags: this.parseTags(get(iTags)),
        _thumbId: thumbId,
      };
    })
    .filter(p => p.title || p.content)
    .sort((a, b) => b.ts - a.ts);

    return posts;
  }

  async prefetchFolderThumbs() {
    const folderPosts = this.ALL_POSTS.filter(p => p.images && this.isFolder(p.images.trim()));
    if (!folderPosts.length) return;
    await Promise.all(folderPosts.map(async p => {
      try {
        const fid = this.driveFolderId(p.images.trim());
        if (fid) { const ids = await this.fetchFolderImages(fid); p._thumbId = ids[0] || null; }
      } catch(e) {}
    }));
    this.renderList();
  }

  // ── UTILS ─────────────────────────────────────────
  escHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : ''; }
  esc(s)     { return s ? String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'") : ''; }
  highlight(str, q) {
    if (!q || !str) return this.escHtml(str);
    const safe = this.escHtml(str);
    const re   = new RegExp(`(${this.escHtml(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  // ── URL HELPERS ───────────────────────────────────
  postUrl(id) {
    const base = location.href.split('#')[0];
    return `${base}#post-${id}`;
  }

  // ── SEARCH ────────────────────────────────────────
  onSearch(val) {
    this.searchQuery = val.trim().toLowerCase();
    const pv = this.$('#post-view');
    if (pv.style.display === 'block') {
      pv.style.display = 'none';
      this.$('#list-view').style.display = 'block';
    }
    this.renderList();
  }

  matchesSearch(p, q) {
    if (!q) return true;
    return (p.title||'').toLowerCase().includes(q) ||
           (p.content||'').toLowerCase().includes(q) ||
           (p.body||'').toLowerCase().includes(q) ||
           (p.parsha||'').toLowerCase().includes(q) ||
           p.tags.some(t => t.toLowerCase().includes(q));
  }

  // ── TAGS ──────────────────────────────────────────
  allTags() {
    const s = new Set();
    this.ALL_POSTS.forEach(p => p.tags.forEach(t => s.add(t)));
    return [...s].sort();
  }

  renderTagBar() {
    const bar  = this.$('#tag-bar');
    const tags = this.allTags();
    if (!tags.length) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    const self = this;
    bar.innerHTML =
      `<button class="tag-chip ${!this.activeTag?'active':''}" onclick="this.getRootNode().host._blog.setTag(null)">אלע</button>` +
      tags.map(t => `<button class="tag-chip ${this.activeTag===t?'active':''}" onclick="this.getRootNode().host._blog.setTag('${this.esc(t)}')">${this.escHtml(t)}</button>`).join('');
  }

  setTag(tag) {
    this.activeTag = tag;
    this.renderTagBar();
    const h = this.$('#tag-heading');
    if (tag) { this.$('#tag-heading-name').textContent = tag; h.style.display = 'block'; }
    else     { h.style.display = 'none'; }
    this.renderList();
    history.replaceState(null, '', tag ? `#tag-${encodeURIComponent(tag)}` : '#');
  }

  // ── RENDER LIST ───────────────────────────────────
  renderList() {
    const q = this.searchQuery;
    let posts = this.ALL_POSTS;
    if (this.activeTag) posts = posts.filter(p => p.tags.includes(this.activeTag));
    if (q)              posts = posts.filter(p => this.matchesSearch(p, q));

    const el = this.$('#posts-list');
    if (!posts.length) {
      el.innerHTML = `<div class="state-msg">${q ? `אין תוצאות עבור "${this.escHtml(q)}"` : 'לא נמצאו פוסטים.'}</div>`;
      return;
    }
    el.innerHTML = posts.map(p => {
      const thumb = p._thumbId ? this.driveThumbnail(p._thumbId, 200) : null;
      return `
      <div class="post-row" onclick="this.getRootNode().host._blog.openPost(${p.id})">
        <div class="post-row-date">
          ${p.parsha ? `<div class="post-parsha-list">${this.escHtml(p.parsha)}</div>` : ''}
          <div class="post-yiddish-day">${this.escHtml(p.yiddish)}</div>
          <div class="post-hebrew-date">${this.escHtml(p.hebrewFull)}</div>
        </div>
        <div class="post-row-body">
          <div class="post-row-main">
            <div class="post-row-text">
              <div class="post-row-title">${this.highlight(p.title, q)}</div>
              ${p.content ? `<div class="post-row-excerpt">${this.highlight(p.content.slice(0,180), q)}</div>` : ''}
              ${p.tags.length ? `<div class="post-row-tags">${p.tags.map(t =>
                `<button class="post-row-tag" onclick="event.stopPropagation();this.getRootNode().host._blog.setTag('${this.esc(t)}')">${this.highlight(t,q)}</button>`
              ).join('')}</div>` : ''}
            </div>
            ${thumb ? `<div class="post-thumb-wrap"><img class="post-thumb" src="${thumb}" alt="" loading="lazy"></div>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ── SINGLE POST ───────────────────────────────────
  openPost(id) {
    const p = this.ALL_POSTS.find(x => x.id === id);
    if (!p) return;
    history.pushState({ postId: id }, '', `#post-${id}`);
    this.showPostView(p);
  }

  async showPostView(p) {
    this.$('#list-view').style.display = 'none';
    this.$('#post-view').style.display = 'block';
    window.scrollTo(0, 0);

    const tagsHtml = p.tags.length ? `
      <div class="post-header-tags">
        ${p.tags.map(t => `<button class="post-header-tag" onclick="this.getRootNode().host._blog.goHome();setTimeout(()=>this.getRootNode().host._blog.setTag('${this.esc(t)}'),50)">${this.escHtml(t)}</button>`).join('')}
      </div>` : '';

    this.$('#post-content').innerHTML = `
      <div class="post-header">
        ${p.parsha ? `<div class="post-header-parsha">${this.escHtml(p.parsha)}</div>` : ''}
        <div class="post-header-dateline">
          <span class="post-header-yiddish">${this.escHtml(p.yiddish)}</span>
          <span class="post-header-sep">·</span>
          <span class="post-header-hebrewfull">${this.escHtml(p.hebrewFull)}</span>
        </div>
        <h1 class="post-header-title">${this.escHtml(p.title)}</h1>
        ${tagsHtml}
      </div>
      <hr class="post-divider">
      ${p.content ? `<div class="post-body">${this.escHtml(p.content)}</div>` : ''}
      ${p.body    ? `<div class="post-body-text">${this.escHtml(p.body)}</div>` : ''}
      <div id="images-slot"><div class="state-msg" style="padding:1rem 0;font-size:0.8rem">טוען תמונות...</div></div>
      <div class="share-bar">
        <span class="share-label">שיק ווייטער:</span>
        <button class="share-btn" id="copy-btn" onclick="this.getRootNode().host._blog.copyLink(${p.id})">🔗 קאפי לינק</button>
        <button class="share-btn" onclick="this.getRootNode().host._blog.shareEmail('${this.esc(p.title)}',${p.id})">✉ אימייל</button>
      </div>`;

    const fileIds = await this.resolveImages(p.images);
    this.lbImages = fileIds;
    const slot = this.$('#images-slot');
    if (!slot) return;
    if (!fileIds.length) { slot.innerHTML = ''; return; }

    slot.innerHTML = `
      <div class="post-images">
        <div class="post-images-label">בילדער (${fileIds.length})</div>
        <div class="images-stack">
          ${fileIds.map((id,i) => `
            <a href="${this.postUrl(p.id) + '-img' + i}" onclick="event.preventDefault();this.getRootNode().host._blog.openLightbox(${i})">
              <img class="img-full" src="${this.driveThumbnail(id, 1200)}" loading="lazy" alt="בילד ${i+1}">
            </a>`).join('')}
        </div>
      </div>`;
  }

  goHome() {
    this.$('#post-view').style.display = 'none';
    this.$('#list-view').style.display = 'block';
    history.pushState(null, '', this.activeTag ? `#tag-${encodeURIComponent(this.activeTag)}` : '#');
    window.scrollTo(0, 0);
  }

  // ── LIGHTBOX ──────────────────────────────────────
  openLightbox(i) {
    this.lbIndex = i;
    this.updateLb();
    this.$('#lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  closeLightbox() {
    this.$('#lightbox').classList.remove('open');
    document.body.style.overflow = '';
  }
  updateLb() {
    const img = this.$('#lb-img');
    img.src = this.driveFull(this.lbImages[this.lbIndex]);
    const multi = this.lbImages.length > 1;
    this.$('#lb-prev').style.display = multi ? 'flex' : 'none';
    this.$('#lb-next').style.display = multi ? 'flex' : 'none';
    this.$('#lb-counter').textContent = multi ? `${this.lbIndex+1} / ${this.lbImages.length}` : '';
  }
  lbNav(dir) {
    this.lbIndex = (this.lbIndex + dir + this.lbImages.length) % this.lbImages.length;
    this.updateLb();
  }

  // ── SHARING ───────────────────────────────────────
  copyLink(postId) {
    const url = this.postUrl(postId);
    navigator.clipboard.writeText(url).then(() => {
      const b = this.$('#copy-btn');
      if (!b) return;
      const prev = b.textContent;
      b.textContent = '✓ געקאפיט!'; b.classList.add('copied');
      setTimeout(() => { b.textContent = prev; b.classList.remove('copied'); }, 2000);
    }).catch(() => prompt('קאפי לינק:', url));
  }
  shareEmail(title, postId) {
    const url = this.postUrl(postId);
    window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(title+'\n\n'+url)}`);
  }

  // ── HASH ROUTING ──────────────────────────────────
  handleHash() {
    const hash = location.hash.slice(1);
    if (hash.startsWith('post-')) {
      const p = this.ALL_POSTS.find(x => x.id === parseInt(hash.replace('post-','')));
      if (p) { this.showPostView(p); return; }
    }
    if (hash.startsWith('tag-')) {
      const tag = decodeURIComponent(hash.replace('tag-',''));
      this.activeTag = tag;
      this.$('#post-view').style.display = 'none';
      this.$('#list-view').style.display = 'block';
      this.renderTagBar();
      this.$('#tag-heading-name').textContent = tag;
      this.$('#tag-heading').style.display = 'block';
      this.renderList(); return;
    }
    this.$('#post-view').style.display = 'none';
    this.$('#list-view').style.display = 'block';
    this.renderList();
  }

  // ── BOOT ──────────────────────────────────────────
  async boot() {
    const listEl = this.$('#posts-list');
    listEl.innerHTML = `<div class="state-msg"><div class="spinner"></div>טוען...</div>`;

    // Keyboard nav for lightbox
    document.addEventListener('keydown', e => {
      if (!this.$('#lightbox').classList.contains('open')) return;
      if (e.key === 'Escape')      this.closeLightbox();
      if (e.key === 'ArrowLeft')   this.lbNav(1);
      if (e.key === 'ArrowRight')  this.lbNav(-1);
    });
    this.$('#lightbox').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeLightbox();
    });

    // Back/forward browser navigation
    window.addEventListener('popstate', () => this.handleHash());

    try {
      this.ALL_POSTS = await this.fetchSheet();
      if (this.ALL_POSTS.length === 0) {
        listEl.innerHTML = `<div class="state-msg">⚠️ 0 posts found.<br>
          <small style="opacity:.5">Tab: "${this.escHtml(this.CFG.tab)}" · 
          Date col: "${this.escHtml(this.CFG.col.date)}" · 
          Title col: "${this.escHtml(this.CFG.col.title)}"</small></div>`;
        return;
      }
      this.renderTagBar();
      this.handleHash();
      this.prefetchFolderThumbs();
    } catch(e) {
      console.error('[Blog]', e);
      listEl.innerHTML = `<div class="state-msg">⚠️ שגיאה: ${this.escHtml(e.message)}</div>`;
    }
  }
}

// Register the custom element
// The tag name 'moisdes-blog' is what you use in Wix
customElements.define('moisdes-blog', MoisdesBlog);
