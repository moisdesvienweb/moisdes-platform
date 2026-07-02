// ================================================================
// MOISDES PLATFORM — PDFs PAGE
// moisdes-pdfs.js
// ================================================================

class MoisdesPdfs extends HTMLElement {
  connectedCallback() {
    this._injectFont();
    this.attachShadow({ mode: 'open' });
    this._app = new PdfsApp(this.shadowRoot);
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

class PdfsApp {
  constructor(root) {
    this.root    = root;
    this.CFG     = window.MOISDES.CFG;
    this.U       = window.MOISDES.util;
    this.allPdfs = [];
    this.filters = { category:'', language:'', parsha:'', year:'' };
    this.search  = '';
    this.activeTag = '';
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

        /* ── FILTER SELECTS ─── */
        .filter-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.5rem; margin-bottom:1.5rem; }
        .filter-sel {
          background:transparent; border:1px solid var(--border); color:var(--text);
          font-family:'Heebo',sans-serif; font-size:0.8rem; padding:0.45rem 0.75rem;
          border-radius:2px; outline:none; direction:rtl; width:100%;
          -webkit-appearance:none; appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.4)'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:left 0.6rem center; padding-left:1.8rem;
          transition:border 0.15s;
        }
        .filter-sel:focus { border-color:rgba(255,255,255,0.5); }
        .filter-sel option { background:#0e0e1c; }

        /* ── PDF GRID ─── */
        .pdf-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:1rem; }
        .pdf-card { cursor:pointer; border-radius:2px; overflow:hidden; border:1px solid var(--border); background:transparent; transition:all 0.15s; }
        .pdf-card:hover { background:var(--hover-bg); }
        .pdf-thumb { width:100%; aspect-ratio:3/4; object-fit:cover; background:rgba(255,255,255,0.06); display:block; }
        .pdf-thumb-placeholder { width:100%; aspect-ratio:3/4; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; color:var(--subtle); font-size:2rem; }
        .pdf-body { padding:0.55rem 0.7rem; }
        .pdf-title { font-size:0.78rem; font-weight:700; line-height:1.3; }
        .pdf-meta { font-size:0.65rem; color:var(--muted); margin-top:0.2rem; }
        .empty { text-align:center; padding:3rem 0; color:var(--muted); font-size:0.88rem; }
        .wrap { max-width:960px; margin:0 auto; }

      </style>

      <div class="wrap">
        <div class="search-wrap">
          <input class="search-input" type="text" placeholder="זוך שריפטן..." id="search-input">
        </div>

        <div class="filter-grid">
          <select id="f-category" onchange="this.getRootNode().host._app.setFilter('category',this.value)">
            <option value="">קאטעגאריע</option>
          </select>
          <select id="f-language" onchange="this.getRootNode().host._app.setFilter('language',this.value)">
            <option value="">שפּראך</option>
          </select>
          <select id="f-parsha" onchange="this.getRootNode().host._app.setFilter('parsha',this.value)">
            <option value="">פּרשה</option>
          </select>
          <select id="f-year" onchange="this.getRootNode().host._app.setFilter('year',this.value)">
            <option value="">יאר</option>
          </select>
        </div>

        <div id="pdf-grid" class="pdf-grid"><div class="loading-ring"></div></div>

        <div class="tags-bar">
          <div class="tags-inner" id="tags-inner"></div>
          <button class="show-more" id="show-more" onclick="this.getRootNode().host._app.toggleTags()">מער טאגן ↓</button>
        </div>
      </div>
    `;

    this.$('#search-input').addEventListener('input', e => {
      this.search = e.target.value.trim().toLowerCase();
      this._applyFilters();
    });

    this._load();
  }

  async _load() {
    const [rows, tagRows] = await Promise.all([
      this.U.sheetRows(this.CFG.tabs.pdfs),
      this.U.sheetRows(this.CFG.tabs.tags),
    ]);

    this.allPdfs = rows.map(r => ({
      date: r[0]||'', title: r[1]||'', category: r[2]||'', language: r[3]||'',
      parsha: r[4]||'', year: r[5]||'', tags: r[6]||'',
      pdfLink: r[7]||'', thumbLink: r[8]||'',
    })).sort((a,b) => this.U.dateDesc(a.date, b.date));

    // Populate filter dropdowns (only values that exist)
    this._populateFilter('f-category', 'קאטעגאריע', [...new Set(this.allPdfs.map(p=>p.category).filter(Boolean))]);
    this._populateFilter('f-language', 'שפּראך',    [...new Set(this.allPdfs.map(p=>p.language).filter(Boolean))]);
    this._populateFilter('f-parsha',   'פּרשה',     [...new Set(this.allPdfs.map(p=>p.parsha).filter(Boolean))]);
    this._populateFilter('f-year',     'יאר',       [...new Set(this.allPdfs.map(p=>p.year).filter(Boolean))].sort().reverse());

    this._renderTags([...new Set(tagRows.flat().filter(Boolean))]);
    this._applyFilters();
  }

  _populateFilter(id, placeholder, opts) {
    this.$(`#${id}`).innerHTML =
      `<option value="">${placeholder}</option>` +
      opts.map(o => `<option value="${this.U.ea(o)}">${this.U.eh(o)}</option>`).join('');
  }

  setFilter(key, val) {
    this.filters[key] = val;
    this._applyFilters();
  }

  _applyFilters() {
    let list = this.allPdfs;
    if (this.filters.category) list = list.filter(p => p.category===this.filters.category);
    if (this.filters.language) list = list.filter(p => p.language===this.filters.language);
    if (this.filters.parsha)   list = list.filter(p => p.parsha===this.filters.parsha);
    if (this.filters.year)     list = list.filter(p => p.year===this.filters.year);
    if (this.activeTag)        list = list.filter(p => p.tags.toLowerCase().includes(this.activeTag.toLowerCase()));
    if (this.search)           list = list.filter(p =>
      [p.title,p.category,p.language,p.parsha,p.year,p.tags].join(' ').toLowerCase().includes(this.search));

    const U = this.U;
    if (!list.length) {
      this.$('#pdf-grid').innerHTML = '<div class="empty">קיין שריפטן נישט געפונען</div>';
      return;
    }

    this.$('#pdf-grid').innerHTML = list.map(p => {
      const thumb = p.thumbLink || '';
      return `
        <div class="pdf-card" onclick="window.open('${U.ea(p.pdfLink)}','_blank')">
          ${thumb
            ? `<img class="pdf-thumb" src="${U.eh(thumb)}" alt="" loading="lazy">`
            : `<div class="pdf-thumb-placeholder"></div>`}
          <div class="pdf-body">
            <div class="pdf-title">${U.eh(p.title)}</div>
            <div class="pdf-meta">${[p.parsha,p.year,p.language].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  _renderTags(tags) {
    const U = this.U;
    this.$('#tags-inner').innerHTML = tags.map(t =>
      `<button class="t-btn" onclick="this.getRootNode().host._app.setTag('${U.ea(t)}')">${U.eh(t)}</button>`
    ).join('');
  }

  setTag(tag) {
    this.activeTag = this.activeTag===tag?'':tag;
    this.root.querySelectorAll('.t-btn').forEach(b => b.classList.toggle('on', b.textContent===tag && this.activeTag));
    this._applyFilters();
  }

  toggleTags() {
    const inner = this.$('#tags-inner');
    const btn   = this.$('#show-more');
    inner.classList.toggle('open');
    btn.textContent = inner.classList.contains('open') ? 'פּחות ' : 'מער טאגן ↓';
  }
}

customElements.define('moisdes-pdfs', MoisdesPdfs);
