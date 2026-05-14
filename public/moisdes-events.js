// ================================================================
// MOISDES PLATFORM — EVENTS / RECORDINGS PAGE
// moisdes-events.js
// ================================================================

class MoisdesEvents extends HTMLElement {
  connectedCallback() {
    this._injectFont();
    this.attachShadow({ mode: 'open' });
    this._app = new EventsApp(this.shadowRoot);
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

class EventsApp {
  constructor(root) {
    this.root     = root;
    this.CFG      = window.MOISDES.CFG;
    this.U        = window.MOISDES.util;
    this.allEvents = [];
    this.filtered  = [];
    this.activeTag = '';
    this.activeCat = '';
    this.search    = '';
    this.audio     = new Audio();
    this.curEvent  = null;
    this.curTrack  = -1;
    this.tracks    = [];
    this.shuffle   = false;
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

        /* ── STICKY PLAYER ─── */
        .player-bar { position:sticky; top:0; z-index:100; background:rgba(10,10,20,0.97); border-bottom:1px solid var(--border); padding:0.75rem 0; display:none; }
        .player-bar.on { display:block; }
        .player-top { display:flex; align-items:center; gap:0.85rem; margin-bottom:0.5rem; }
        .player-logo { width:40px; height:40px; object-fit:contain; border-radius:2px; flex-shrink:0; }
        .player-titles { flex:1; min-width:0; }
        .player-event-name { font-size:0.82rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .player-track-name { font-size:0.72rem; color:var(--muted); }
        .player-btns { display:flex; align-items:center; gap:0.4rem; }
        .p-btn { background:none; border:none; color:var(--text); font-size:1.1rem; cursor:pointer; padding:0.25rem; border-radius:50%; transition:background 0.12s; font-family:inherit; }
        .p-btn:hover { background:rgba(255,255,255,0.1); }
        .p-btn.play { font-size:1.3rem; }
        .p-btn.active { color:rgba(255,220,80,0.9); }
        .seek-row { display:flex; align-items:center; gap:0.5rem; }
        .seek { flex:1; -webkit-appearance:none; height:2px; background:var(--border); border-radius:99px; outline:none; cursor:pointer; }
        .seek::-webkit-slider-thumb { -webkit-appearance:none; width:10px; height:10px; border-radius:50%; background:#fff; cursor:pointer; }
        .time { font-size:0.62rem; color:var(--muted); white-space:nowrap; }

        /* ── EVENT ROWS ─── */
        .event-card { background:transparent; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.15s; }
        .event-card:hover { background:var(--hover-bg); }
        .event-card:last-child { border-bottom:none; }
        .event-card-body { display:flex; gap:0.75rem; padding:1.1rem 0; align-items:flex-start; }
        .event-card-left { flex:1; min-width:0; }
        .event-card-date { font-size:0.72rem; color:var(--muted); margin-bottom:0.25rem; }
        .event-card-title { font-size:1rem; font-weight:700; margin-bottom:0.25rem; line-height:1.35; }
        .event-card-meta { font-size:0.75rem; color:var(--muted); }
        .event-card-desc { font-size:0.8rem; color:var(--subtle); margin-top:0.3rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.5; }

        /* ── MODAL ─── */
        .modal-bg { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.82); z-index:200; align-items:center; justify-content:center; padding:1rem; }
        .modal-bg.on { display:flex; }
        .modal { background:#0e0e1c; border:1px solid var(--border); border-radius:2px; width:100%; max-width:500px; max-height:82vh; overflow-y:auto; }
        .modal-head { padding:1rem 1.25rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
        .modal-title { font-size:1rem; font-weight:700; }
        .modal-close { background:none; border:none; color:var(--muted); font-size:1.2rem; cursor:pointer; font-family:inherit; }
        .modal-body { padding:1rem 1.25rem; }
        .modal-meta { font-size:0.78rem; color:var(--muted); margin-bottom:0.75rem; }
        .modal-desc { font-size:0.82rem; color:rgba(255,255,255,0.65); margin-bottom:1rem; line-height:1.6; }
        .track-list { display:flex; flex-direction:column; }
        .t-item { display:flex; align-items:center; gap:0.75rem; padding:0.55rem 0; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.12s; font-size:0.82rem; }
        .t-item:hover { background:var(--hover-bg); }
        .t-item.on { font-weight:700; }
        .t-item:last-child { border-bottom:none; }
        .t-num { color:var(--subtle); font-size:0.68rem; width:1.4rem; text-align:center; flex-shrink:0; }
        .play-btn { background:transparent; border:1px solid var(--border); color:var(--text); width:100%; padding:0.65rem; border-radius:2px; font-family:'Heebo',sans-serif; font-size:0.85rem; font-weight:700; cursor:pointer; margin-top:0.75rem; transition:all 0.15s; }
        .play-btn:hover { border-color:rgba(255,255,255,0.5); background:var(--hover-bg); }
        .wrap { max-width:960px; margin:0 auto; }

      </style>

      <!-- Sticky player -->
      <div class="player-bar" id="player-bar">
        <div class="player-inner">
          <div class="player-top">
            <img class="player-logo" id="p-logo" src="${this.CFG.logo}" alt="">
            <div class="player-titles">
              <div class="player-event-name" id="p-event">—</div>
              <div class="player-track-name" id="p-track">—</div>
            </div>
            <div class="player-btns">
              <button class="p-btn" id="p-prev" title="קודם">«</button>
              <button class="p-btn play" id="p-play">▶</button>
              <button class="p-btn" id="p-next" title="ווייטער">»</button>
              <button class="p-btn" id="p-shuf" title="שאפל">⇌</button>
            </div>
          </div>
          <div class="seek-row">
            <span class="time" id="p-cur">0:00</span>
            <input type="range" class="seek" id="p-seek" value="0" min="0" max="100" step="0.1">
            <span class="time" id="p-dur">0:00</span>
          </div>
        </div>
      </div>

      <!-- Main -->
      <div class="wrap">
        <!-- Search + filters -->
        <div class="search-wrap">
          <input class="search-input" type="text" placeholder="זוך הקלטות..." id="search-input">
        </div>
        <div class="filter-row" id="cat-filters"></div>

        <!-- Recent events (past 2 months) -->
        <div id="events-grid"></div>
      </div>

      <!-- Event detail modal -->
      <div class="modal-bg" id="modal">
        <div class="modal">
          <div class="modal-head">
            <div class="modal-title" id="m-title"></div>
            <button class="modal-close" onclick="this.getRootNode().host._app.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-meta" id="m-meta"></div>
            <div class="modal-desc" id="m-desc"></div>
            <div class="track-list" id="m-tracks"></div>
            <button class="play-btn" id="m-play-all">▶ שפיל אלץ</button>
          </div>
        </div>
      </div>

      <!-- Tags bar -->
      <div style="max-width:960px;margin:0 auto;padding:0 1rem;">
        <div class="tags-bar">
          <div class="tags-inner" id="tags-inner"></div>
          <button class="show-more" id="show-more" onclick="this.getRootNode().host._app.toggleTags()">מער טאגן ↓</button>
        </div>
      </div>
    `;

    this._wirePlayer();
    this._wireSearch();
    this._load();
  }

  async _load() {
    const [rows, tagRows, catRows] = await Promise.all([
      this.U.sheetRows(this.CFG.tabs.events),
      this.U.sheetRows(this.CFG.tabs.tags),
      this.U.sheetRows(this.CFG.tabs.categories),
    ]);

    this.allEvents = rows.map(r => ({
      date: r[0]||'', title: r[1]||'', location: r[2]||'',
      category: r[3]||'', description: r[4]||'', tags: r[5]||'',
      tracksFolder: r[6]||'',
    })).sort((a,b) => this.U.dateDesc(a.date, b.date));

    const cats = [...new Set(this.allEvents.map(e => e.category).filter(Boolean))];
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
    this.root.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('on', b.textContent.trim() === (cat || 'אלץ')));
    this._applyFilters();
  }

  _wireSearch() {
    this.$('#search-input').addEventListener('input', e => {
      this.search = e.target.value.trim().toLowerCase();
      this._applyFilters();
    });
  }

  _applyFilters() {
    const U = this.U;
    let list = this.allEvents;
    if (this.activeCat) list = list.filter(e => e.category === this.activeCat);
    if (this.activeTag)  list = list.filter(e => e.tags.toLowerCase().includes(this.activeTag.toLowerCase()));
    if (this.search)     list = list.filter(e =>
      [e.title,e.location,e.category,e.description,e.tags].join(' ').toLowerCase().includes(this.search));

    const eightWeeksAgo = Date.now() - 8*7*86400000;
    const recent = list.filter(e => { const d = U.parseDate(e.date); return d && d.getTime() > eightWeeksAgo; });
    const all    = list;

    this.$('#events-grid').innerHTML = all.map(e => this._cardHtml(e, U.weeksAgo(e.date, 8))).join('');
  }

  _cardHtml(e, showBadge) {
    const U = this.U;
    const safeE = JSON.stringify(JSON.stringify(e));
    return `
      <div class="event-card" onclick="this.getRootNode().host._app.openEvent(${safeE.slice(1,-1)})">
        <div class="event-card-body">
          <div class="event-card-left">
            <div class="event-card-date">${U.readableDate(e.date)}${showBadge ? ' <span style="display:inline-block;background:rgba(255,200,80,0.9);color:#000;font-size:0.6rem;font-weight:900;padding:0.1rem 0.4rem;border-radius:99px;vertical-align:middle;margin-right:0.35rem">חדש</span>' : ''}</div>
            <div class="event-card-title">${U.eh(e.title)}</div>
            <div class="event-card-meta">${[U.eh(e.location), U.eh(e.category)].filter(Boolean).join(' · ')}</div>
            ${e.description ? `<div class="event-card-desc">${U.eh(e.description)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }


  async openEvent(eventJson) {
    const e = JSON.parse(eventJson);
    const U = this.U;
    this.curEvent = e;

    this.$('#m-title').textContent = e.title;
    this.$('#m-meta').textContent  = [U.readableDate(e.date), e.location, e.category].filter(Boolean).join(' · ');
    this.$('#m-desc').textContent  = e.description || '';

    // Load tracks from Drive folder
    this.tracks = [];
    if (e.tracksFolder) {
      const folderId = U.driveFolderId(e.tracksFolder);
      if (folderId) {
        try {
          const files = await U.driveFiles(folderId);
          this.tracks = files.filter(f => f.mimeType.startsWith('audio/'));
        } catch(err) {}
      }
    }

    this.$('#m-tracks').innerHTML = this.tracks.map((t,i) => `
      <div class="t-item" id="track-${i}" onclick="this.getRootNode().host._app.playTrack(${i})">
        <span class="t-num">${i+1}</span>
        <span>${U.eh(t.name)}</span>
      </div>
    `).join('');

    this.$('#m-play-all').onclick = () => { this.playTrack(0); };
    this.$('#modal').classList.add('on');
  }

  closeModal() { this.$('#modal').classList.remove('on'); }

  playTrack(idx) {
    if (!this.tracks.length) return;
    this.curTrack = idx;
    const t = this.tracks[idx];
    const url = `https://www.googleapis.com/drive/v3/files/${t.id}?alt=media&key=${this.CFG.apikey}`;
    this.audio.src = url;
    this.audio.play();
    this.$('#player-bar').classList.add('on');
    this.$('#p-event').textContent = this.curEvent?.title || '';
    this.$('#p-track').textContent = t.name;
    this.$('#p-play').textContent  = '⏸';
    this.root.querySelectorAll('.t-item').forEach((el,i) => el.classList.toggle('on', i===idx));
    this.closeModal();
  }

  _wirePlayer() {
    const audio = this.audio;
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      this.$('#p-seek').value = (audio.currentTime / audio.duration) * 100;
      this.$('#p-cur').textContent = this._fmt(audio.currentTime);
      this.$('#p-dur').textContent = this._fmt(audio.duration);
    });
    audio.addEventListener('ended', () => this._nextTrack());

    this.$('#p-play').addEventListener('click', () => {
      if (audio.paused) { audio.play(); this.$('#p-play').textContent='⏸'; }
      else              { audio.pause(); this.$('#p-play').textContent='▶'; }
    });
    this.$('#p-prev').addEventListener('click', () => this._prevTrack());
    this.$('#p-next').addEventListener('click', () => this._nextTrack());
    this.$('#p-shuf').addEventListener('click', () => {
      this.shuffle = !this.shuffle;
      this.$('#p-shuf').classList.toggle('active', this.shuffle);
    });
    this.$('#p-seek').addEventListener('input', e => {
      audio.currentTime = (e.target.value / 100) * audio.duration;
    });
  }

  _nextTrack() {
    if (!this.tracks.length) return;
    const next = this.shuffle
      ? Math.floor(Math.random() * this.tracks.length)
      : (this.curTrack + 1) % this.tracks.length;
    this.playTrack(next);
  }
  _prevTrack() {
    if (!this.tracks.length) return;
    this.playTrack((this.curTrack - 1 + this.tracks.length) % this.tracks.length);
  }

  _fmt(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${String(sec).padStart(2,'0')}`;
  }

  _renderTags(tags) {
    const U = this.U;
    this.$('#tags-inner').innerHTML = tags.map(t =>
      `<button class="t-btn" onclick="this.getRootNode().host._app.setTag('${U.ea(t)}')">${U.eh(t)}</button>`
    ).join('');
  }

  setTag(tag) {
    this.activeTag = this.activeTag === tag ? '' : tag;
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

customElements.define('moisdes-events', MoisdesEvents);
