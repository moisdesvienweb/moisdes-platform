// ================================================================
// MOISDES PLATFORM — POSTERS PAGE
// moisdes-posters.js
// Groups posters by parsha week, shows Hebrew date header (16px)
// ================================================================

class MoisdesPosters extends HTMLElement {
  connectedCallback() {
    this._injectFont();
    this.attachShadow({ mode: 'open' });
    this._app = new PostersApp(this.shadowRoot);
    this._app.init();
  }
  _injectFont() {
    if (!document.querySelector('#moisdes-font')) {
      const l = document.createElement('link');
      l.id = 'moisdes-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap';
      document.head.appendChild(l);
    }
  }
}

class PostersApp {
  constructor(root) {
    this.root       = root;
    this.CFG        = window.MOISDES.CFG;
    this.U          = window.MOISDES.util;
    this.allPosters = [];
    this.lightboxOpen = false;
  }

  $(s) { return this.root.querySelector(s); }

  init() {
    this.root.innerHTML = `
      <link rel="stylesheet" href="/shared-styles.css">
      <style>
        /* ── RESET & VARS ─── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host {
          display: block; width: 100%;
          font-family: 'Heebo', sans-serif; font-size: 15px;
          line-height: 1.6; direction: rtl; color: #ffffff;
          padding: 0 48px; box-sizing: border-box;
          --text:     #ffffff;
          --muted:    rgba(255,255,255,0.55);
          --subtle:   rgba(255,255,255,0.3);
          --border:   rgba(255,255,255,0.18);
          --hover-bg: rgba(255,255,255,0.06);
          --tag-bg:   rgba(255,255,255,0.1);
        }
        @media(max-width:600px){ :host { padding: 0 20px; } }

        /* ── SEARCH ─── */
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

        /* ── FILTERS / TAG BAR ─── */
        .filter-row {
          padding: 0.7rem 0; border-bottom: 1px solid var(--border);
          display: flex; flex-wrap: wrap; gap: 0.35rem;
          direction: rtl; align-items: center;
        }
        .filter-btn {
          font-size: 0.73rem; padding: 0.2rem 0.65rem;
          background: transparent; border: 1px solid var(--border);
          cursor: pointer; font-family: 'Heebo', sans-serif;
          color: var(--muted); border-radius: 99px; transition: all 0.15s;
        }
        .filter-btn:hover { border-color: var(--text); color: var(--text); }
        .filter-btn.on {
          background: rgba(255,255,255,0.15);
          color: var(--text); border-color: rgba(255,255,255,0.5);
        }

        /* ── SECTION LABEL ─── */
        .section-label {
          font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: var(--muted);
          padding: 1rem 0 0.5rem;
        }

        /* ── TAGS BAR (bottom) ─── */
        .tags-bar { padding: 0.7rem 0; border-top: 1px solid var(--border); margin-top: 2rem; }
        .tags-inner { display: flex; flex-wrap: wrap; gap: 0.35rem; overflow: hidden; max-height: 3rem; transition: max-height 0.3s; }
        .tags-inner.open { max-height: 999px; }
        .t-btn {
          font-size: 0.73rem; padding: 0.2rem 0.65rem;
          background: transparent; border: 1px solid var(--border);
          cursor: pointer; font-family: 'Heebo', sans-serif;
          color: var(--muted); border-radius: 99px; transition: all 0.15s;
        }
        .t-btn:hover, .t-btn.on { border-color: var(--text); color: var(--text); background: rgba(255,255,255,0.1); }
        .show-more {
          font-size: 0.73rem; padding: 0.2rem 0.65rem;
          background: transparent; border: 1px solid var(--border);
          cursor: pointer; font-family: 'Heebo', sans-serif;
          color: var(--subtle); border-radius: 99px; transition: all 0.15s; margin-top: 0.4rem;
        }
        .show-more:hover { color: var(--muted); }

        /* ── LOADING ─── */
        .state-msg { padding: 3rem 0; text-align: center; color: var(--muted); font-size: 0.88rem; }
        .spinner {
          width: 24px; height: 24px; border: 2px solid var(--border);
          border-top-color: rgba(255,255,255,0.7); border-radius: 50%;
          animation: spin 0.7s linear infinite; margin: 0 auto 0.75rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── POSTER GROUPS ─── */
        .parsha-group { margin-bottom:3rem; }
        .parsha-header { font-size:16px; font-weight:700; color:var(--muted); margin-bottom:1rem; direction:rtl; padding-bottom:0.5rem; border-bottom:1px solid var(--border); }
        .poster-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:0.75rem; }
        .poster-item { cursor:pointer; border-radius:2px; overflow:hidden; transition:opacity 0.15s; }
        .poster-item:hover { opacity:0.85; }
        .poster-img { width:100%; aspect-ratio:2/3; object-fit:cover; display:block; background:rgba(255,255,255,0.05); }

        /* ── LIGHTBOX ─── */
        .lb-bg { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.94); z-index:300; align-items:center; justify-content:center; }
        .lb-bg.on { display:flex; }
        .lb-img { max-width:90vw; max-height:92vh; object-fit:contain; border-radius:2px; display:block; }
        .lb-close { position:fixed; top:1rem; right:1rem; background:rgba(255,255,255,0.12); border:none; color:#fff; font-size:1.1rem; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .lb-prev,.lb-next { position:fixed; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:none; color:#fff; font-size:1.5rem; cursor:pointer; padding:0.65rem 0.5rem; border-radius:2px; transition:background 0.15s; }
        .lb-prev:hover,.lb-next:hover { background:rgba(255,255,255,0.2); }
        .lb-prev { left:0.5rem; }
        .lb-next { right:0.5rem; }
        .wrap { max-width:960px; margin:0 auto; }

      </style>

      <div class="wrap" id="main-wrap"><div class="loading-ring"></div></div>

      <!-- Lightbox -->
      <div class="lb-bg" id="lb">
        <button class="lb-close" onclick="this.getRootNode().host._app.closeLb()">✕</button>
        <button class="lb-prev" onclick="this.getRootNode().host._app.lbStep(-1)">‹</button>
        <img class="lb-img" id="lb-img" src="" alt="">
        <button class="lb-next" onclick="this.getRootNode().host._app.lbStep(1)">›</button>
      </div>
    `;

    this._load();
  }

  async _load() {
    const rows = await this.U.sheetRows(this.CFG.tabs.posters);

    // Each row: [date, parsha, folderLink]
    // Group by parsha (or by date-week if no parsha)
    const groups = {};
    for (const r of rows) {
      const date        = r[0] || '';
      const parsha      = r[1] || (date ? this.U.dateToParsha(date) : '');
      const folderLink  = r[2] || '';
      const key         = parsha || date;
      if (!groups[key]) groups[key] = { parsha, date, folders: [] };
      if (folderLink) groups[key].folders.push(folderLink);
    }

    // Sort groups newest first
    const sorted = Object.values(groups).sort((a,b) => this.U.dateDesc(a.date,b.date));

    this.allImages = []; // flat list for lightbox
    let html = '';

    for (const g of sorted) {
      // Build Hebrew header: parsha + year
      const d = this.U.parseDate(g.date);
      const hy = d ? (d.getUTCMonth() >= 8 ? d.getUTCFullYear()+3761 : d.getUTCFullYear()+3760) : '';
      const label = [g.parsha, hy ? this.U.yearToHebrew(hy) : ''].filter(Boolean).join(' · ');

      // Load images from all folders for this group
      const groupImages = [];
      for (const folder of g.folders) {
        const fid = this.U.driveFolderId(folder);
        if (!fid) continue;
        try {
          const files = await this.U.driveFiles(fid);
          const imgs  = files.filter(f => f.mimeType.startsWith('image/'));
          imgs.forEach(f => {
            groupImages.push(`https://drive.google.com/uc?id=${f.id}`);
            this.allImages.push(`https://drive.google.com/uc?id=${f.id}`);
          });
        } catch(e) {}
      }

      if (!groupImages.length) continue;
      const startIdx = this.allImages.length - groupImages.length;

      html += `
        <div class="parsha-group">
          <div class="parsha-header">${this.U.eh(label)}</div>
          <div class="poster-grid">
            ${groupImages.map((src,i) => `
              <div class="poster-item" onclick="this.getRootNode().host._app.openLb(${startIdx+i})">
                <img class="poster-img" src="${this.U.eh(src)}" alt="" loading="lazy">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    this.$('#main-wrap').innerHTML = html || '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:3rem">קיין פאסטערס נישט</div>';
    this.lbIdx = 0;
  }

  openLb(idx) {
    this.lbIdx = idx;
    this.$('#lb-img').src = this.allImages[idx] || '';
    this.$('#lb').classList.add('on');
  }

  closeLb() { this.$('#lb').classList.remove('on'); }

  lbStep(dir) {
    this.lbIdx = (this.lbIdx + dir + this.allImages.length) % this.allImages.length;
    this.$('#lb-img').src = this.allImages[this.lbIdx];
  }
}

customElements.define('moisdes-posters', MoisdesPosters);
