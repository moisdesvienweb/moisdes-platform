// ================================================================
// MOISDES PLATFORM — HOME PAGE
// moisdes-home.js
// Slideshow: recent blog posts + recent PDFs + newest event + posters
// Then: 10 most recent blog posts grid
// ================================================================

class MoisdesHome extends HTMLElement {
  connectedCallback() {
    this._injectFont();
    this.attachShadow({ mode: 'open' });
    this._app = new HomeApp(this.shadowRoot);
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

class HomeApp {
  constructor(root) {
    this.root   = root;
    this.CFG    = window.MOISDES.CFG;
    this.U      = window.MOISDES.util;
    this.slides = [];
    this.cur    = 0;
    this.timer  = null;
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

        /* ── SLIDESHOWS ─── */
        .slideshow-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:2.5rem; }
        @media(max-width:600px){ .slideshow-grid { grid-template-columns:1fr; } }
        .slideshow { border-radius:2px; overflow:hidden; border:1px solid var(--border); background:transparent; }
        .slide { display:none; cursor:pointer; }
        .slide.active { display:block; }
        .slide-img { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; background:rgba(255,255,255,0.05); }
        .slide-cap { padding:0.75rem 0.85rem; border-top:1px solid var(--border); }
        .slide-cap-label { font-size:0.62rem; color:var(--subtle); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.2rem; }
        .slide-cap-title { font-size:0.9rem; font-weight:700; line-height:1.3; }
        .slide-cap-date { font-size:0.7rem; color:var(--muted); margin-top:0.2rem; }
        .slide-dots { display:flex; justify-content:center; gap:0.35rem; padding:0.5rem 0; }
        .slide-dot { width:5px; height:5px; border-radius:50%; background:var(--border); border:none; cursor:pointer; transition:background 0.15s; }
        .slide-dot.on { background:rgba(255,255,255,0.6); }

        /* ── RECENT POSTS GRID ─── */
        .posts-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1rem; }
        .post-card { border:1px solid var(--border); border-radius:2px; overflow:hidden; cursor:pointer; transition:all 0.15s; background:transparent; }
        .post-card:hover { background:var(--hover-bg); }
        .post-card-img { width:100%; aspect-ratio:16/9; object-fit:cover; background:rgba(255,255,255,0.05); }
        .post-card-body { padding:0.7rem 0.85rem; border-top:1px solid var(--border); }
        .post-card-date { font-size:0.65rem; color:var(--muted); margin-bottom:0.25rem; }
        .post-card-title { font-size:0.88rem; font-weight:700; line-height:1.3; }
        .home-wrap { max-width:960px; margin:0 auto; }

      </style>
      <div class="home-wrap">
        <div id="slides-section"><div class="loading-ring"></div></div>
        <div class="recent-label">פאסטן</div>
        <div id="posts-grid" class="posts-grid"><div class="loading-ring"></div></div>
      </div>
    `;
    this._loadAll();
  }

  async _loadAll() {
    const [blogRows, pdfRows, eventRows, posterRows] = await Promise.all([
      this.U.sheetRows(this.CFG.tabs.blog),
      this.U.sheetRows(this.CFG.tabs.pdfs),
      this.U.sheetRows(this.CFG.tabs.events),
      this.U.sheetRows(this.CFG.tabs.posters),
    ]);

    // Build slides
    const blogSlides = blogRows
      .filter(r => r[2] && r[1])
      .sort((a,b) => this.U.dateDesc(a[0],b[0]))
      .slice(0,5)
      .map(r => ({
        type: 'blog', date: r[0], title: r[2],
        img: this._folderThumb(r[1]),
        link: `${this.CFG.pages.blog}#post-${encodeURIComponent(r[2])}`,
        label: 'בלאג',
      }));

    const pdfSlides = pdfRows
      .filter(r => r[8]) // has thumb
      .sort((a,b) => this.U.dateDesc(a[0],b[0]))
      .slice(0,5)
      .map(r => ({
        type: 'pdf', date: r[0], title: r[1],
        img: r[8],
        link: this.CFG.pages.pdfs,
        label: 'שריפטן',
      }));

    const eventSlide = eventRows
      .sort((a,b) => this.U.dateDesc(a[0],b[0]))
      .slice(0,1)
      .map(r => ({
        type: 'event', date: r[0], title: r[1],
        img: this.CFG.logo,
        link: this.CFG.pages.events,
        label: 'הקלטות',
      }));

    // Poster slide — most recent parsha group
    const posterByParsha = {};
    posterRows.forEach(r => {
      const key = r[1] || r[0]; // parsha or date
      if (!posterByParsha[key]) posterByParsha[key] = r;
    });
    const latestPoster = Object.values(posterByParsha)
      .sort((a,b) => this.U.dateDesc(a[0],b[0]))[0];
    const posterSlide = latestPoster ? [{
      type: 'poster', date: latestPoster[0], title: latestPoster[1] || this.U.dateToParsha(latestPoster[0]),
      img: this._folderThumb(latestPoster[2]),
      link: this.CFG.pages.posters,
      label: 'פאסטערס',
    }] : [];

    // Two slideshows side by side: blog+pdfs | event+posters
    this._renderSlideshows(
      [...blogSlides, ...pdfSlides],
      [...eventSlide, ...posterSlide]
    );

    // Recent blog posts grid
    this._renderPostsGrid(blogRows);
  }

  _renderSlideshows(leftSlides, rightSlides) {
    const U = this.U;
    const slideHtml = (slides, id) => {
      if (!slides.length) return '<div style="padding:1rem;color:rgba(255,255,255,0.3);font-size:0.8rem">אין אינהאלט</div>';
      return `
        ${slides.map((s,i) => `
          <div class="slide${i===0?' active':''}" onclick="window.location='${s.link}'">
            <img class="slide-img" src="${U.eh(s.img)}" alt="" onerror="this.src='${this.CFG.logo}'">
            <div class="slide-cap">
              <div class="slide-cap-label">${U.eh(s.label)}</div>
              <div class="slide-cap-title">${U.eh(s.title)}</div>
              <div class="slide-cap-date">${U.readableDate(s.date)}</div>
            </div>
          </div>`).join('')}
        <div class="slide-dots">
          ${slides.map((_,i) => `<button class="slide-dot${i===0?' on':''}" data-i="${i}" data-ss="${id}"></button>`).join('')}
        </div>
      `;
    };

    this.$('#slides-section').innerHTML = `
      <div class="slideshow-grid">
        <div class="slideshow" id="ss-0">${slideHtml(leftSlides,'0')}</div>
        <div class="slideshow" id="ss-1">${slideHtml(rightSlides,'1')}</div>
      </div>
    `;

    // Wire dots
    this.root.querySelectorAll('.slide-dot').forEach(btn => {
      btn.addEventListener('click', e => {
        const ss = this.$(`#ss-${btn.dataset.ss}`);
        ss.querySelectorAll('.slide').forEach((s,i) => s.classList.toggle('active', i===+btn.dataset.i));
        ss.querySelectorAll('.slide-dot').forEach((d,i) => d.classList.toggle('on', i===+btn.dataset.i));
      });
    });

    // Auto-advance
    const advance = (ssId, slides) => {
      if (!slides.length) return;
      let i = 0;
      setInterval(() => {
        i = (i+1) % slides.length;
        const ss = this.$(`#ss-${ssId}`);
        if (!ss) return;
        ss.querySelectorAll('.slide').forEach((s,j) => s.classList.toggle('active', j===i));
        ss.querySelectorAll('.slide-dot').forEach((d,j) => d.classList.toggle('on', j===i));
      }, 3000);
    };
    advance('0', leftSlides);
    advance('1', rightSlides);
  }

  _renderPostsGrid(rows) {
    const U    = this.U;
    const CFG  = this.CFG;
    const recent = rows.sort((a,b)=>U.dateDesc(a[0],b[0])).slice(0,10);

    if (!recent.length) {
      this.$('#posts-grid').innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:0.8rem">אין פאסטן</div>';
      return;
    }

    this.$('#posts-grid').innerHTML = recent.map(r => `
      <div class="post-card" onclick="window.location='${CFG.pages.blog}#post-${encodeURIComponent(r[2])}'">
        <img class="post-card-img" src="${U.eh(this._folderThumb(r[1]))}" alt="" onerror="this.style.display='none'">
        <div class="post-card-body">
          <div class="post-card-date">${U.readableDate(r[0])}</div>
          <div class="post-card-title">${U.eh(r[2])}</div>
        </div>
      </div>
    `).join('');
  }

  _folderThumb(folderLink) {
    if (!folderLink) return this.CFG.logo;
    const id = this.U.driveFolderId(folderLink);
    if (!id) return this.CFG.logo;
    // Returns first image in folder via Drive API
    return `https://drive.google.com/drive/folders/${id}`;
  }
}

customElements.define('moisdes-home', MoisdesHome);
