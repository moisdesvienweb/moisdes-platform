// ================================================================
// MOISDES PLATFORM — VIDEOS PAGE
// moisdes-videos.js
// ================================================================

class MoisdesVideos extends HTMLElement {
  connectedCallback() {
    this._injectFont();
    this.attachShadow({ mode: 'open' });
    this._app = new VideosApp(this.shadowRoot);
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

class VideosApp {
  constructor(root) {
    this.root      = root;
    this.CFG       = window.MOISDES.CFG;
    this.U         = window.MOISDES.util;
    this.allVideos = [];
    this.activeCat = '';
    this.activeTag = '';
    this.search    = '';
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

        /* ── VIDEO ROWS ─── */
        .video-card { background:transparent; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.15s; }
        .video-card:hover { background:var(--hover-bg); }
        .video-card:last-child { border-bottom:none; }
        .video-row { display:flex; gap:0.85rem; padding:1.1rem 0; align-items:flex-start; }
        .video-thumb-wrap { position:relative; width:130px; flex-shrink:0; border-radius:2px; overflow:hidden; background:#000; aspect-ratio:16/9; }
        .video-thumb { width:100%; height:100%; object-fit:cover; display:block; opacity:0.85; }
        .play-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
        .play-circle { width:30px; height:30px; border-radius:50%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; font-size:0.8rem; color:#fff; border:1.5px solid rgba(255,255,255,0.45); }
        .video-info { flex:1; min-width:0; }
        .v-date { font-size:0.72rem; color:var(--muted); margin-bottom:0.25rem; }
        .v-title { font-size:1rem; font-weight:700; line-height:1.35; margin-bottom:0.25rem; }
        .v-meta { font-size:0.75rem; color:var(--muted); }
        .v-desc { font-size:0.8rem; color:var(--subtle); margin-top:0.3rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.5; }

        /* ── MODAL ─── */
        .modal-bg { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.88); z-index:200; align-items:center; justify-content:center; padding:1rem; }
        .modal-bg.on { display:flex; }
        .modal { background:#0e0e1c; border:1px solid var(--border); border-radius:2px; width:100%; max-width:680px; }
        .modal-head { display:flex; justify-content:space-between; align-items:center; padding:0.85rem 1.1rem; border-bottom:1px solid var(--border); }
        .modal-title { font-size:0.95rem; font-weight:700; }
        .modal-close { background:none; border:none; color:var(--muted); font-size:1.1rem; cursor:pointer; font-family:inherit; }
        .video-player-wrap { position:relative; padding-bottom:56.25%; height:0; }
        .video-player-wrap iframe,.video-player-wrap video { position:absolute; top:0; left:0; width:100%; height:100%; border:none; }
        .modal-info { padding:0.85rem 1.1rem; }
        .modal-meta { font-size:0.75rem; color:var(--muted); margin-bottom:0.5rem; }
        .modal-desc { font-size:0.82rem; color:rgba(255,255,255,0.65); line-height:1.6; }
        .wrap { max-width:960px; margin:0 auto; }

      </style>

      <div class="wrap">
        <div class="search-wrap">
          <input class="search-input" type="text" placeholder="זוך ווידיאוס..." id="search-input">
        </div>
        <div class="filter-row" id="cat-filters"></div>
        <div id="videos-grid"></div>
        <div class="tags-bar">
          <div class="tags-inner" id="tags-inner"></div>
          <button class="show-more" id="show-more" onclick="this.getRootNode().host._app.toggleTags()">מער טאגן ↓</button>
        </div>
      </div>

      <div class="modal-bg" id="modal">
        <div class="modal">
          <div class="modal-head">
            <div class="modal-title" id="m-title"></div>
            <button class="modal-close" onclick="this.getRootNode().host._app.closeModal()">✕</button>
          </div>
          <div class="video-player-wrap" id="m-player"></div>
          <div class="modal-info">
            <div class="modal-meta" id="m-meta"></div>
            <div class="modal-desc" id="m-desc"></div>
          </div>
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
    const [rows, tagRows, catRows] = await Promise.all([
      this.U.sheetRows(this.CFG.tabs.videos),
      this.U.sheetRows(this.CFG.tabs.tags),
      this.U.sheetRows(this.CFG.tabs.categories),
    ]);

    this.allVideos = rows.map(r => ({
      date: r[0]||'', title: r[1]||'', location: r[2]||'',
      category: r[3]||'', description: r[4]||'', tags: r[5]||'',
      videoLink: r[6]||'',
    })).sort((a,b) => this.U.dateDesc(a.date, b.date));

    const cats = [...new Set(this.allVideos.map(v => v.category).filter(Boolean))];
    this._renderCats(cats);
    this._renderTags([...new Set(tagRows.flat().filter(Boolean))]);
    this._applyFilters();
  }

  _renderCats(cats) {
    const U = this.U;
    this.$('#cat-filters').innerHTML =
      `<button class="filter-btn on" onclick="this.getRootNode().host._app.setCat('')">אלץ</button>` +
      cats.map(c => `<button class="filter-btn" onclick="this.getRootNode().host._app.setCat('${U.ea(c)}')">${U.eh(c)}</button>`).join('');
  }

  setCat(cat) {
    this.activeCat = cat;
    this.root.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('on', b.textContent.trim()===(cat||'אלץ')));
    this._applyFilters();
  }

  _applyFilters() {
    let list = this.allVideos;
    if (this.activeCat) list = list.filter(v => v.category===this.activeCat);
    if (this.activeTag)  list = list.filter(v => v.tags.toLowerCase().includes(this.activeTag.toLowerCase()));
    if (this.search)     list = list.filter(v =>
      [v.title,v.location,v.category,v.description,v.tags].join(' ').toLowerCase().includes(this.search));

    const eightWeeksAgo = Date.now() - 8*7*86400000;
    const recent = list.filter(v => { const d = this.U.parseDate(v.date); return d && d.getTime() > eightWeeksAgo; });

    this.$('#videos-grid').innerHTML = list.map(v => this._cardHtml(v, this.U.weeksAgo(v.date, 8))).join('');
  }

  _cardHtml(v, showBadge) {
    const U     = this.U;
    const thumb = this._thumb(v.videoLink);
    const safeV = JSON.stringify(JSON.stringify(v));
    return `
      <div class="video-card" onclick="this.getRootNode().host._app.openVideo(${safeV.slice(1,-1)})">
        <div class="video-row">
          <div class="video-thumb-wrap">
            <img class="video-thumb" src="${U.eh(thumb)}" alt="" onerror="this.style.display='none'">
            <div class="play-overlay"><div class="play-circle">&#9658;</div></div>
          </div>
          <div class="video-info">
            <div class="v-date">${U.readableDate(v.date)}${showBadge ? ' <span style="display:inline-block;background:rgba(255,200,80,0.9);color:#000;font-size:0.6rem;font-weight:900;padding:0.1rem 0.4rem;border-radius:99px;vertical-align:middle;margin-right:0.35rem">חדש</span>' : ''}</div>
            <div class="v-title">${U.eh(v.title)}</div>
            <div class="v-meta">${[U.eh(v.location), U.eh(v.category)].filter(Boolean).join(' · ')}</div>
            ${v.description ? `<div class="v-desc">${U.eh(v.description)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }


  _thumb(link) {
    if (!link) return this.CFG.logo;
    // YouTube thumbnail
    const yt = link.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return `https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg`;
    // Drive file
    const df = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (df) return `https://drive.google.com/thumbnail?id=${df[1]}`;
    return this.CFG.logo;
  }

  _embedUrl(link) {
    if (!link) return null;
    // YouTube → embedded (no branding shown)
    const yt = link.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&autoplay=1`;
    // Drive file
    const df = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (df) return `https://drive.google.com/file/d/${df[1]}/preview`;
    // Dropbox → force download=0
    if (link.includes('dropbox.com')) return link.replace('dl=0','dl=0').replace('www.dropbox','dl.dropbox') + '#';
    return link;
  }

  openVideo(videoJson) {
    const v   = JSON.parse(videoJson);
    const U   = this.U;
    const url = this._embedUrl(v.videoLink);

    this.$('#m-title').textContent = v.title;
    this.$('#m-meta').textContent  = [U.readableDate(v.date), v.location, v.category].filter(Boolean).join(' · ');
    this.$('#m-desc').textContent  = v.description || '';

    if (url) {
      this.$('#m-player').innerHTML = url.includes('drive.google') || url.includes('youtube')
        ? `<iframe src="${U.eh(url)}" allowfullscreen></iframe>`
        : `<video src="${U.eh(url)}" controls autoplay></video>`;
    } else {
      this.$('#m-player').innerHTML = '';
    }

    this.$('#modal').classList.add('on');
  }

  closeModal() {
    this.$('#modal').classList.remove('on');
    this.$('#m-player').innerHTML = ''; // stop playback
  }

  _renderTags(tags) {
    const U = this.U;
    this.$('#tags-inner').innerHTML = tags.map(t =>
      `<button class="t-btn" onclick="this.getRootNode().host._app.setTag('${U.ea(t)}')">${U.eh(t)}</button>`
    ).join('');
  }

  setTag(tag) {
    this.activeTag = this.activeTag===tag ? '' : tag;
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

customElements.define('moisdes-videos', MoisdesVideos);
