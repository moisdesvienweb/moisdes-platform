// ================================================================
// MOISDES PLATFORM — ALL UPLOAD PAGES (fully self-contained)
// moisdes-uploads.js
// No dependency on shared-upload.js — everything is inlined.
// ================================================================

window.MOISDES = window.MOISDES || {};

// ── DATE PICKER ───────────────────────────────────────────────────

window.MOISDES.DatePicker = class {
  constructor(container, onChange) {
    this.container = container;
    this.onChange  = onChange || (() => {});
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="date-selects">
        <select id="dp-year"><option value="">שנה</option></select>
        <select id="dp-parsha"><option value="">פרשה</option></select>
        <select id="dp-dow">
          <option value="">טאג</option>
          <option value="0">זונטאג</option>
          <option value="1">מאנטאג</option>
          <option value="2">דינסטאג</option>
          <option value="3">מיטוואך</option>
          <option value="4">דאנערשטאג</option>
          <option value="5">ערב שבת</option>
          <option value="6">מוצאי שבת</option>
        </select>
      </div>
      <input type="date" id="dp-date">
      <div class="date-note" id="dp-note"></div>
    `;

    const q = s => this.container.querySelector(s);
    this.selYear   = q('#dp-year');
    this.selParsha = q('#dp-parsha');
    this.selDow    = q('#dp-dow');
    this.inputDate = q('#dp-date');
    this.noteEl    = q('#dp-note');

    this.selYear.addEventListener('change',   () => this._fromDropdowns());
    this.selParsha.addEventListener('change', () => this._fromDropdowns());
    this.selDow.addEventListener('change',    () => this._fromDropdowns());
    this.inputDate.addEventListener('change', () => this._fromManual());

    // Populate once CFG is ready
    const populate = () => {
      if (window.MOISDES && window.MOISDES.CFG && window.MOISDES.CFG.parshiyot) {
        this.selYear.innerHTML   = '<option value="">שנה</option>' + this._yearOptions();
        this.selParsha.innerHTML = '<option value="">פרשה</option>' + this._parshaOptions();
      } else {
        setTimeout(populate, 50);
      }
    };
    populate();
  }

  _yearOptions() {
    const U = window.MOISDES.util;
    const cur = U.currentHebrewYear();
    let html = '';
    for (let y = cur; y >= 5742; y--) {
      html += `<option value="${y}">${U.yearToHebrew(y)}</option>`;
    }
    return html;
  }

  _parshaOptions() {
    const CFG = window.MOISDES.CFG;
    const secondPair = new Set(['פקודי','מצורע','קדושים','בחוקותי','מסעי','וילך']);
    return CFG.parshiyot.filter(p => !secondPair.has(p)).map(p => {
      const d = CFG.combined[p] || p;
      return `<option value="${d}">${d}</option>`;
    }).join('');
  }

  _fromDropdowns() {
    const y = this.selYear.value;
    const p = this.selParsha.value;
    const d = this.selDow.value;
    if (!y || !p || d === '') return;
    const date = window.MOISDES.util.hebrewToDate(parseInt(y), p, parseInt(d));
    if (!date) { this.noteEl.textContent = 'דאטום נישט געפונען'; return; }
    const iso = date.toISOString().split('T')[0];
    this.inputDate.value = iso;
    this._updateNote(date);
    this.onChange(iso);
  }

  _fromManual() {
    const val = this.inputDate.value;
    if (!val) { this.noteEl.textContent = ''; this.onChange(''); return; }
    this.selYear.value = ''; this.selParsha.value = ''; this.selDow.value = '';
    const d = new Date(val + 'T12:00:00Z');
    this._updateNote(d);
    this.onChange(val);
  }

  _updateNote(d) {
    this.noteEl.textContent = d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  getValue()      { return this.inputDate.value; }
  getFormatted()  {
    const v = this.inputDate.value;
    if (!v) return '';
    const [y,m,d] = v.split('-');
    return `${m}/${d}/${y}`;
  }
  getParsha() {
    return this.selParsha.value ||
      (this.inputDate.value ? window.MOISDES.util.dateToParsha(this.inputDate.value) : '');
  }
  reset() {
    this.selYear.value = ''; this.selParsha.value = '';
    this.selDow.value = ''; this.inputDate.value = '';
    this.noteEl.textContent = '';
  }
};

// ── TAGS WIDGET ───────────────────────────────────────────────────

window.MOISDES.TagsWidget = class {
  constructor(container, tabName, opts = {}) {
    this.container = container;
    this.tabName   = tabName;
    this.allowNew  = opts.allowNew !== false;
    this.selected  = [];
    this.allTags   = [];
    this.newTags   = [];
    this.filtered  = [];
    this.render();
    this.load();
  }

  render() {
    this.container.innerHTML = `
      <div class="tags-dropdown-wrap">
        <div class="tags-area" id="tw-area">
          <div class="selected-pills" id="tw-pills"></div>
          <input class="tag-input" id="tw-input" placeholder="זוך אדער שרייב א נייעם טאג...">
        </div>
        <div class="tags-dropdown" id="tw-dd"></div>
      </div>
      <div class="field-hint">דריק Enter צו צוצולייגן</div>
    `;
    const q = s => this.container.querySelector(s);
    this.areaEl  = q('#tw-area');
    this.pillsEl = q('#tw-pills');
    this.inputEl = q('#tw-input');
    this.ddEl    = q('#tw-dd');
    this.container._widget = this;

    this.areaEl.addEventListener('click', () => this.inputEl.focus());
    this.inputEl.addEventListener('input',   e => this._onInput(e.target.value));
    this.inputEl.addEventListener('keydown', e => this._onKey(e));
    this.inputEl.addEventListener('focus',   () => this._showDD());
    this.inputEl.addEventListener('blur',    () => setTimeout(() => this._hideDD(), 160));
  }

  async load() {
    try {
      const rows = await window.MOISDES.util.sheetRange(this.tabName, 'A:A');
      this.allTags = [...new Set(rows.flat().filter(Boolean))].sort((a,b) => a.localeCompare(b,'he'));
    } catch(e) { this.allTags = []; }
  }

  _onInput(val) {
    const q = val.trim().toLowerCase();
    this.filtered = q
      ? this.allTags.filter(t => t.toLowerCase().includes(q) && !this.selected.includes(t))
      : this.allTags.filter(t => !this.selected.includes(t));
    this._renderDD(val.trim());
  }

  _showDD() {
    this.filtered = this.allTags.filter(t => !this.selected.includes(t));
    this._renderDD('');
    this.ddEl.style.display = 'block';
  }

  _hideDD() { this.ddEl.style.display = 'none'; }

  _renderDD(raw) {
    const U = window.MOISDES.util;
    let html = this.filtered.map(t =>
      `<div class="dd-opt" onmousedown="event.preventDefault();this.closest('.tags-dropdown-wrap').parentElement._widget.add('${U.ea(t)}')">${U.eh(t)}</div>`
    ).join('');
    const typed = raw.trim();
    const exists = this.allTags.some(t => t.toLowerCase() === typed.toLowerCase());
    const alreadySel = this.selected.some(t => t.toLowerCase() === typed.toLowerCase());
    if (this.allowNew && typed && !exists && !alreadySel) {
      html += `<div class="dd-opt new-opt" onmousedown="event.preventDefault();this.closest('.tags-dropdown-wrap').parentElement._widget.addNew('${U.ea(typed)}')">+ הוסף: "${U.eh(typed)}"</div>`;
    }
    if (!html) html = `<div class="dd-empty">קיין רעזולטאטן</div>`;
    this.ddEl.innerHTML = html;
    this.container._widget = this;
  }

  _onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = this.inputEl.value.trim();
      if (!val) return;
      const match = this.allTags.find(t => t.toLowerCase() === val.toLowerCase());
      if (match) this.add(match); else if (this.allowNew) this.addNew(val);
    }
    if (e.key === 'Escape') this._hideDD();
  }

  add(tag) {
    if (!this.selected.includes(tag)) { this.selected.push(tag); this._renderPills(); }
    this.inputEl.value = ''; this._onInput('');
  }

  addNew(tag) {
    if (!tag) return;
    if (!this.allTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      this.allTags.push(tag); this.allTags.sort((a,b) => a.localeCompare(b,'he'));
      this.newTags.push(tag);
    }
    this.add(tag);
  }

  remove(tag) { this.selected = this.selected.filter(t => t !== tag); this._renderPills(); }

  _renderPills() {
    const U = window.MOISDES.util;
    this.pillsEl.innerHTML = this.selected.map(t =>
      `<span class="sel-pill">${U.eh(t)}<button class="sel-pill-x" onmousedown="event.preventDefault();this.closest('.tags-dropdown-wrap').parentElement._widget.remove('${U.ea(t)}')">✕</button></span>`
    ).join('');
    this.container._widget = this;
  }

  getValue()    { return this.selected.join(', '); }
  getNewTags()  { return this.newTags; }
  reset()       { this.selected = []; this.newTags = []; this._renderPills(); }
};

// ── FILE WIDGET ───────────────────────────────────────────────────

window.MOISDES.FileWidget = class {
  constructor(container, opts = {}) {
    this.container   = container;
    this.accept      = opts.accept || 'image/*';
    this.multiple    = opts.multiple !== false;
    this.reorderable = opts.reorderable || false;
    this.named       = opts.named || false;
    this.showThumb   = opts.showThumb !== false;
    this.files       = [];
    this.dragSrc     = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="upload-zone" id="fw-zone">
        <div class="upload-zone-icon">↑</div>
        <div class="upload-zone-text">קליק אדער שלעפ פֿײלן אהער</div>
        <div class="upload-zone-sub">${this._acceptLabel()}</div>
      </div>
      <div class="file-list" id="fw-list"></div>
    `;
    this.zoneEl = this.container.querySelector('#fw-zone');
    this.listEl = this.container.querySelector('#fw-list');
    this.container._fw = this;

    // Create input on document.body — only reliable way inside Shadow DOM
    this.zoneEl.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type     = 'file';
      inp.accept   = this.accept;
      inp.multiple = this.multiple;
      inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
      document.body.appendChild(inp);
      inp.addEventListener('change', e => {
        this.addFiles(e.target.files);
        document.body.removeChild(inp);
      });
      inp.addEventListener('blur', () => {
        setTimeout(() => { if (document.body.contains(inp)) document.body.removeChild(inp); }, 1000);
      });
      inp.click();
    });

    this.zoneEl.addEventListener('dragover',  e => { e.preventDefault(); this.zoneEl.classList.add('drag-over'); });
    this.zoneEl.addEventListener('dragleave', () => this.zoneEl.classList.remove('drag-over'));
    this.zoneEl.addEventListener('drop',      e => { e.preventDefault(); this.zoneEl.classList.remove('drag-over'); this.addFiles(e.dataTransfer.files); });
  }

  _acceptLabel() {
    if (this.accept.includes('audio')) return 'MP3, WAV, M4A';
    if (this.accept.includes('video')) return 'MP4, MOV, MKV';
    if (this.accept.includes('pdf'))   return 'PDF';
    return 'PNG, JPG, GIF, WEBP';
  }

  addFiles(fileList) {
    for (const f of fileList) {
      const id   = Date.now() + Math.random();
      const name = f.name.replace(/\.[^.]+$/, '');
      const entry = { id, file: f, name, preview: null };
      this.files.push(entry);
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => { entry.preview = ev.target.result; this._renderList(); };
        reader.readAsDataURL(f);
      } else {
        this._renderList();
      }
    }
  }

  removeFile(id) { this.files = this.files.filter(f => f.id !== id); this._renderList(); }

  _renderList() {
    const U = window.MOISDES.util;
    this.listEl.innerHTML = this.files.map((f, i) => `
      <div class="file-item" data-id="${f.id}"
        ${this.reorderable ? 'draggable="true"' : ''}>
        ${this.reorderable ? '<span class="file-item-drag">≡</span>' : ''}
        ${f.preview && this.showThumb
          ? `<img class="file-item-thumb" src="${f.preview}" alt="">`
          : `<div class="file-item-icon">${this._icon(f.file.type)}</div>`}
        ${this.named
          ? `<input class="file-item-name-input" value="${U.eh(f.name)}" placeholder="שרייב א נאמען...">`
          : `<span style="flex:1;font-size:0.8rem;color:rgba(255,255,255,0.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.eh(f.file.name)}</span>`}
        <button class="file-item-remove" data-remove="${f.id}">✕</button>
      </div>
    `).join('');

    // Wire remove buttons
    this.listEl.querySelectorAll('[data-remove]').forEach(btn => {
      if (btn && btn.addEventListener) {
        btn.addEventListener('click', () => this.removeFile(parseFloat(btn.dataset.remove)));
      }
    });

    // Wire rename inputs
    if (this.named) {
      this.listEl.querySelectorAll('.file-item-name-input').forEach((inp, i) => {
        inp.addEventListener('change', e => { if (this.files[i]) this.files[i].name = e.target.value; });
      });
    }

    // Wire drag reorder
    if (this.reorderable) {
      this.listEl.querySelectorAll('.file-item').forEach(el => {
        el.addEventListener('dragstart', () => { this.dragSrc = parseFloat(el.dataset.id); });
        el.addEventListener('dragover',  e => e.preventDefault());
        el.addEventListener('drop',      e => {
          e.preventDefault();
          const dstId = parseFloat(el.dataset.id);
          const si = this.files.findIndex(f => f.id === this.dragSrc);
          const di = this.files.findIndex(f => f.id === dstId);
          if (si < 0 || di < 0) return;
          const [moved] = this.files.splice(si, 1);
          this.files.splice(di, 0, moved);
          this._renderList();
        });
      });
    }
  }

  _icon(type) {
    if (type.includes('audio')) return '♫';
    if (type.includes('video')) return '▶';
    if (type.includes('pdf'))   return '▤';
    return '▫';
  }

  async getBase64Files() {
    return Promise.all(this.files.map(f => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload  = ev => res({ name: f.name || f.file.name, mimeType: f.file.type, data: ev.target.result.split(',')[1] });
      reader.onerror = rej;
      reader.readAsDataURL(f.file);
    })));
  }

  hasFiles()  { return this.files.length > 0; }
  getFiles()  { return this.files; }
  reset()     { this.files = []; this._renderList(); }
};


// ── BASE UPLOAD CLASS ─────────────────────────────────────────────

class BaseUpload extends HTMLElement {
  connectedCallback() {
    this._injectFont();
    this.attachShadow({ mode: 'open' });
    // Wait for MOISDES.CFG to be ready before building
    const tryBuild = () => {
      if (window.MOISDES && window.MOISDES.CFG && window.MOISDES.util) {
        this._build();
      } else {
        setTimeout(tryBuild, 30);
      }
    };
    tryBuild();
  }

  _injectFont() {
    if (!document.querySelector('#moisdes-font')) {
      const l = document.createElement('link');
      l.id = 'moisdes-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap';
      document.head.appendChild(l);
    }
  }

  $(s) { return this.shadowRoot.querySelector(s); }

  _wrapHtml(inner) {
    return `
      <link rel="stylesheet" href="/shared-styles.css">
      <style>
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :host {
          display:block; width:100%;
          font-family:'Heebo',sans-serif; font-size:15px;
          line-height:1.6; direction:rtl; color:#ffffff;
          padding:0 48px;
          --text:#ffffff; --muted:rgba(255,255,255,0.55);
          --subtle:rgba(255,255,255,0.3); --border:rgba(255,255,255,0.18);
          --hover-bg:rgba(255,255,255,0.06);
          --error:#ff6b6b; --success:#69db7c;
        }
        @media(max-width:600px){ :host { padding:0 20px; } }
        .upload-wrap { max-width:640px; margin:0 auto; padding:2rem 0 4rem; }
        .upload-title { font-size:1.4rem; font-weight:900; margin-bottom:0.25rem; direction:ltr; text-align:left; }
        .upload-subtitle { font-size:0.8rem; color:var(--muted); margin-bottom:2rem; direction:ltr; text-align:left; }
        .field { margin-bottom:1.4rem; }
        .field-label { display:block; font-size:0.72rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:0.4rem; }
        .field-label .req { color:var(--error); margin-right:2px; }
        input[type=text],input[type=date],input[type=url],textarea,select {
          width:100%; background:rgba(255,255,255,0.05); border:1px solid var(--border);
          color:var(--text); font-family:'Heebo',sans-serif; font-size:0.9rem;
          padding:0.65rem 0.85rem; outline:none; border-radius:2px;
          transition:border 0.15s; direction:rtl; -webkit-appearance:none; appearance:none;
        }
        input:focus,textarea:focus,select:focus { border-color:rgba(255,255,255,0.5); }
        input::placeholder,textarea::placeholder { color:var(--subtle); }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(1); cursor:pointer; }
        textarea { resize:vertical; min-height:100px; }
        select {
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.4)'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:left 0.75rem center; padding-left:2rem;
        }
        select option { background:#0e0e1c; }
        .date-selects { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.6rem; margin-bottom:0.5rem; }
        .date-note { font-size:0.75rem; color:var(--muted); margin-top:0.35rem; min-height:1.1em; direction:ltr; }
        .divider { border:none; border-top:1px solid var(--border); margin:1.5rem 0; }
        /* Tags */
        .tags-dropdown-wrap { position:relative; }
        .tags-area { border:1px solid var(--border); border-radius:2px; background:rgba(255,255,255,0.05); padding:0.6rem 0.85rem; min-height:48px; cursor:text; }
        .tags-area:focus-within { border-color:rgba(255,255,255,0.5); }
        .selected-pills { display:flex; flex-wrap:wrap; gap:0.3rem; margin-bottom:0.35rem; }
        .sel-pill { display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.1); border:1px solid var(--border); color:var(--text); font-size:0.7rem; padding:0.12rem 0.5rem; border-radius:99px; }
        .sel-pill-x { background:none; border:none; color:inherit; font-size:0.75rem; cursor:pointer; padding:0; opacity:0.6; }
        .sel-pill-x:hover { opacity:1; }
        .tag-input { width:100%; background:transparent; border:none; color:var(--text); font-family:'Heebo',sans-serif; font-size:0.85rem; outline:none; direction:rtl; padding:0; }
        .tag-input::placeholder { color:var(--subtle); }
        .tags-dropdown { position:absolute; top:100%; right:0; left:0; z-index:300; background:#0e0e1c; border:1px solid var(--border); border-radius:2px; max-height:180px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.6); display:none; }
        .dd-opt { padding:0.45rem 0.85rem; font-size:0.82rem; cursor:pointer; direction:rtl; transition:background 0.1s; }
        .dd-opt:hover { background:rgba(255,255,255,0.08); }
        .dd-opt.new-opt { color:var(--subtle); font-style:italic; }
        .dd-empty { padding:0.45rem 0.85rem; font-size:0.78rem; color:var(--subtle); }
        .field-hint { font-size:0.67rem; color:var(--subtle); margin-top:0.3rem; }
        /* Upload zone */
        .upload-zone { border:1px dashed var(--border); border-radius:2px; padding:1.75rem 1rem; text-align:center; cursor:pointer; background:rgba(255,255,255,0.03); transition:border-color 0.15s,background 0.15s; user-select:none; }
        .upload-zone:hover,.upload-zone.drag-over { border-color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.06); }
        .upload-zone-icon { font-size:1.4rem; color:var(--muted); margin-bottom:0.35rem; }
        .upload-zone-text { font-size:0.82rem; color:var(--muted); }
        .upload-zone-sub { font-size:0.68rem; color:var(--subtle); margin-top:0.2rem; }
        /* File list */
        .file-list { margin-top:0.75rem; display:flex; flex-direction:column; gap:0.4rem; }
        .file-item { display:flex; align-items:center; gap:0.6rem; border-bottom:1px solid var(--border); padding:0.5rem 0; }
        .file-item-thumb { width:36px; height:36px; object-fit:cover; border-radius:2px; flex-shrink:0; }
        .file-item-icon { width:36px; height:36px; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:1.1rem; flex-shrink:0; }
        .file-item-name-input { flex:1; background:transparent; border:none; border-bottom:1px solid var(--border); color:var(--text); font-family:'Heebo',sans-serif; font-size:0.8rem; outline:none; padding:0.1rem 0; direction:rtl; }
        .file-item-name-input:focus { border-bottom-color:rgba(255,255,255,0.5); }
        .file-item-remove { background:none; border:none; color:var(--muted); font-size:0.9rem; padding:0.2rem; cursor:pointer; flex-shrink:0; }
        .file-item-remove:hover { color:var(--error); }
        .file-item-drag { color:var(--subtle); cursor:grab; flex-shrink:0; }
        /* Progress bar */
        .prog-wrap { display:none; margin-top:1.25rem; }
        .prog-wrap.on { display:block; }
        .prog-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; }
        .prog-label { font-size:0.75rem; color:var(--muted); }
        .prog-pct { font-size:0.75rem; font-weight:700; color:var(--text); }
        .prog-track { height:6px; background:rgba(255,255,255,0.1); border-radius:99px; overflow:hidden; }
        .prog-bar { height:100%; background:linear-gradient(90deg,#22c55e,#4ade80); border-radius:99px; transition:width 0.3s ease; width:0%; box-shadow:0 0 8px rgba(74,222,128,0.4); }
        .prog-sub { font-size:0.68rem; color:var(--subtle); margin-top:0.3rem; }
        /* Submit */
        .submit-btn { width:100%; padding:0.85rem; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.35); color:var(--text); font-family:'Heebo',sans-serif; font-size:0.95rem; font-weight:700; border-radius:2px; transition:all 0.15s; letter-spacing:0.04em; cursor:pointer; }
        .submit-btn:hover:not(:disabled) { background:rgba(255,255,255,0.2); border-color:rgba(255,255,255,0.6); }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .status-msg { margin-top:1rem; padding:0.7rem 1rem; border-radius:2px; font-size:0.82rem; direction:rtl; display:none; }
        .status-msg.on { display:block; }
        .status-msg.err { background:rgba(255,107,107,0.14); border:1px solid rgba(255,107,107,0.3); color:var(--error); }
        .status-msg.ok  { background:rgba(105,219,124,0.14); border:1px solid rgba(105,219,124,0.3); color:var(--success); }
        .status-msg.ld  { background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--muted); }
      </style>
      <div class="upload-wrap">${inner}</div>
    `;
  }

  _dateField(id='date') {
    return `
      <div class="field">
        <label class="field-label">דאטום <span class="req">*</span></label>
        <div id="${id}-picker"></div>
      </div>
    `;
  }

  _tagsField(label='טאגן', id='tags') {
    return `
      <div class="field">
        <label class="field-label">${label}</label>
        <div id="${id}-widget"></div>
      </div>
    `;
  }

  _submitRow(label='שיק אריין') {
    return `
      <div class="prog-wrap" id="prog-wrap">
        <div class="prog-header" style="direction:ltr">
          <span class="prog-label" id="prog-label">Uploading...</span>
          <span class="prog-pct" id="prog-pct">0%</span>
        </div>
        <div class="prog-track"><div class="prog-bar" id="prog-bar"></div></div>
        <div class="prog-sub" id="prog-sub"></div>
      </div>
      <button class="submit-btn" id="submit-btn">${label}</button>
      <div class="status-msg" id="status"></div>
    `;
  }

  _initDatePicker(id='date-picker') {
    return new window.MOISDES.DatePicker(this.$(`#${id}`), () => {});
  }

  _initTagsWidget(id='tags-widget', tab=null) {
    tab = tab || window.MOISDES.CFG.tabs.tags;
    return new window.MOISDES.TagsWidget(this.$(`#${id}`), tab, { allowNew: true });
  }

  _initFileWidget(id='files-widget', opts={}) {
    const container = this.$(`#${id}`);
    const fw = new window.MOISDES.FileWidget(container, opts);
    container._fw = fw;
    return fw;
  }

  _setProgress(pct, label, sub='') {
    const wrap = this.$('#prog-wrap');
    if (!wrap) return;
    wrap.classList.add('on');
    const bar = this.$('#prog-bar');
    const pctEl = this.$('#prog-pct');
    // Animate smoothly to target percentage
    const current = parseFloat(bar.style.width) || 0;
    if (pct > current) bar.style.width = pct + '%';
    pctEl.textContent   = Math.round(pct) + '%';
    this.$('#prog-label').textContent = label;
    this.$('#prog-sub').textContent   = sub;
  }

  _showStatus(type, msg) {
    const el = this.$('#status');
    el.className = `status-msg ${type} on`;
    el.textContent = msg;
    if (type === 'ok') setTimeout(() => el.classList.remove('on'), 6000);
  }

  // ── GET ACCESS TOKEN from our tiny Netlify function ──────────────
  async _getToken() {
    const res  = await fetch(`${window.MOISDES.CFG.submitBase}/token`);
    const text = await res.text();
    let d;
    try { d = JSON.parse(text); } catch(e) {
      throw new Error('Token function returned non-JSON. Make sure GOOGLE_SERVICE_ACCOUNT_JSON is set in Netlify environment variables. Response: ' + text.slice(0,80));
    }
    if (d.error) throw new Error('Token error: ' + d.error);
    return d.token;
  }

  // ── CREATE DRIVE FOLDER ────────────────────────────────────────
  async _createFolder(token, parentId, name) {
    console.log('[Upload] Creating folder in parentId:', parentId, 'name:', name);
    const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
    });
    const folderText = await res.text();
    let d;
    try { d = JSON.parse(folderText); } catch(e) {
      throw new Error('Drive folder API returned non-JSON. Check that the Drive folder ID in shared-config.js is correct and shared with the service account. Response: ' + folderText.slice(0,120));
    }
    if (!d.id) {
      const reason = d.error?.errors?.[0]?.reason || d.error?.message || JSON.stringify(d);
      throw new Error(`Drive 403 — ${reason}. Make sure: (1) the folder ID in shared-config.js is correct, (2) the folder is shared with the service account email as Editor, (3) Google Drive API is enabled in Google Cloud Console.`);
    }
    // Make public
    await fetch(`https://www.googleapis.com/drive/v3/files/${d.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    return d.id;
  }

  // ── UPLOAD SINGLE FILE DIRECTLY TO DRIVE with real progress ───
  async _uploadFile(token, folderId, file, onProgress) {
    // Use XHR multipart upload for real progress tracking
    // (resumable upload init is blocked by CORS from browsers)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const boundary  = 'moisdes_' + Date.now();
          const metadata  = JSON.stringify({ name: file.name, parents: [folderId] });
          const fileData  = ev.target.result; // ArrayBuffer

          // Build multipart/related body with proper CRLF line endings
          const CRLF    = '\r\n';
          const encoder = new TextEncoder();
          const part1   = encoder.encode(
            '--' + boundary + CRLF +
            'Content-Type: application/json; charset=UTF-8' + CRLF + CRLF +
            metadata + CRLF +
            '--' + boundary + CRLF +
            'Content-Type: ' + file.mimeType + CRLF + CRLF
          );
          const part2   = encoder.encode(CRLF + '--' + boundary + '--');
          const body    = new Uint8Array(part1.byteLength + fileData.byteLength + part2.byteLength);
          body.set(part1, 0);
          body.set(new Uint8Array(fileData), part1.byteLength);
          body.set(part2, part1.byteLength + fileData.byteLength);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

          xhr.upload.onprogress = e => {
            if (e.lengthComputable && onProgress) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              // Make file public
              await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'reader', type: 'anyone' }),
              });
              resolve(data.id);
            } else {
              reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText.slice(0,100)}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(body);
        } catch(err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file.blob);
    });
  }

  // ── WRITE ROW TO SHEETS ────────────────────────────────────────
  async _appendRow(token, tab, row) {
    const CFG   = window.MOISDES.CFG;
    const range = encodeURIComponent(`'${tab}'`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.sheetid}/values/${range}:append?valueInputOption=RAW`;
    const res   = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error('Sheets error: ' + (e.error?.message || res.status)); }
  }

  // ── APPEND TO A COLUMN (tags, categories, parshas) ────────────
  async _appendToCol(token, tab, items) {
    if (!items || !items.length) return;
    const CFG   = window.MOISDES.CFG;
    const range = encodeURIComponent(`'${tab}'!A:A`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.sheetid}/values/${range}:append?valueInputOption=RAW`;
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: items.map(v => [v]) }),
    });
  }

  // ── MAIN SUBMIT ────────────────────────────────────────────────
  async _submit(type, payloadFn) {
    const btn = this.$('#submit-btn');
    btn.disabled = true;
    this._showStatus('ld', 'Uploading...');
    this._setProgress(5, 'Preparing data...', '');

    let payload;
    try { payload = await payloadFn(); }
    catch(e) { this._showStatus('err', `⚠ ${e.message}`); btn.disabled = false; return; }

    try {
      // Step 1: get token (fast — just signs a JWT)
      this._setProgress(10, '10% — Connecting to Google...', 'Getting access token');
      const token = await this._getToken();

      this._setProgress(20, '20% — Preparing...', '');
      const CFG  = window.MOISDES.CFG;
      const TABS = CFG.tabs;
      let folderLink = '';

      // Step 2: upload files if any
      const files = payload._files || [];
      if (files.length) {
        this._setProgress(25, `25% — מאכט אָרדנער...`, '');
        const parentId = CFG.driveFolders[type] || CFG.driveFolders.blog;
        const folderId = await this._createFolder(token, parentId, payload._folderName || payload.title || 'Upload');
        folderLink = `https://drive.google.com/drive/folders/${folderId}`;

        for (let i = 0; i < files.length; i++) {
          const f   = files[i];
          const pct = 25 + Math.round(((i) / files.length) * 55);
          this._setProgress(pct, `${pct}% — Uploading file ${i+1} of ${files.length}...`, f.name);
          await this._uploadFile(token, folderId, f, (filePct) => {
            const overall = 25 + Math.round(((i + filePct/100) / files.length) * 55);
            this._setProgress(overall, `${overall}% — Uploading ${i+1} of ${files.length}...`, f.name);
          });
        }
      }

      // Step 3: write row to sheet
      this._setProgress(82, '82% — Saving to sheet...', '');
      const row = this._buildRow(type, payload, folderLink);
      await this._appendRow(token, TABS[type] || TABS.blog, row);

      // Step 4: save new tags/categories/parshas
      this._setProgress(92, '92% — Saving tags...', '');
      await this._appendToCol(token, TABS.tags,       payload.newTags       || []);
      await this._appendToCol(token, TABS.categories, payload.newCategories || []);
      await this._appendToCol(token, TABS.parshas,    payload.newParshas    || []);

      this._setProgress(100, '100% — Done!', '');
      this._showStatus('ok', '✓ Submitted successfully!');
      this._reset();

    } catch(e) {
      console.error('[Upload]', e);
      this._showStatus('err', `⚠ Error: ${e.message}`);
      btn.disabled = false;
    }
  }

  // ── BUILD SHEET ROW ────────────────────────────────────────────
  _buildRow(type, payload, folderLink) {
    if (type === 'blog') {
      const r = new Array(6).fill('');
      r[0]=payload.date; r[1]=folderLink; r[2]=payload.title; r[4]=payload.body; r[5]=payload.tags;
      return r;
    }
    if (type === 'poster') {
      return [payload.date, payload.parsha||'', folderLink];
    }
    if (type === 'event') {
      const r = new Array(7).fill('');
      r[0]=payload.date; r[1]=payload.title; r[2]=payload.location||'';
      r[3]=payload.category||''; r[4]=payload.description||''; r[5]=payload.tags||''; r[6]=folderLink;
      return r;
    }
    if (type === 'video') {
      const r = new Array(7).fill('');
      r[0]=payload.date; r[1]=payload.title; r[2]=payload.location||'';
      r[3]=payload.category||''; r[4]=payload.description||''; r[5]=payload.tags||'';
      r[6]=payload.videoLink||folderLink;
      return r;
    }
    return [];
  }

  _reset() {
    this.$('#submit-btn').disabled = false;
    this.$('#prog-wrap').classList.remove('on');
  }
}


// ════════════════════════════════════════════════════════════════
// BLOG UPLOAD
// ════════════════════════════════════════════════════════════════

class MoisdesUploadBlog extends BaseUpload {
  _build() {
    this.shadowRoot.innerHTML = this._wrapHtml(`
      <div class="upload-title">Upload an image post</div>
      <div class="upload-subtitle">Fields with * are required</div>
      ${this._dateField()}
      <div class="field">
        <label class="field-label">קעפל <span class="req">*</span></label>
        <input type="text" id="field-title" placeholder="פאסט קעפל...">
      </div>
      <div class="field">
        <label class="field-label">פולע באשרייבונג</label>
        <textarea id="field-body" rows="8" placeholder="שרייב דעם טעקסט..."></textarea>
      </div>
      ${this._tagsField()}
      <hr class="divider">
      <div class="field">
        <label class="field-label">בילדער</label>
        <div id="files-widget"></div>
      </div>
      ${this._submitRow('Submit Post')}
    `);
    this._dp = this._initDatePicker();
    this._tw = this._initTagsWidget();
    this._fw = this._initFileWidget('files-widget', { accept: 'image/*', multiple: true, showThumb: true });
    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  async _doSubmit() {
    await this._submit('blog', async () => {
      const date  = this._dp.getFormatted();
      const title = this.$('#field-title').value.trim();
      if (!date)  throw new Error('Please enter a date');
      if (!title) throw new Error('Please enter a title');
      const _files = this._fw.getFiles().map(f => ({ name: f.name||f.file.name, mimeType: f.file.type, size: f.file.size, blob: f.file }));
      return { date, title, body: this.$('#field-body').value.trim(), tags: this._tw.getValue(), newTags: this._tw.getNewTags(), _files, _folderName: title };
    });
  }

  _reset() {
    super._reset();
    this._dp.reset();
    this.$('#field-title').value = '';
    this.$('#field-body').value  = '';
    this._tw.reset();
    this._fw.reset();
  }
}


// ════════════════════════════════════════════════════════════════
// POSTERS UPLOAD
// ════════════════════════════════════════════════════════════════

class MoisdesUploadPosters extends BaseUpload {
  _build() {
    this.shadowRoot.innerHTML = this._wrapHtml(`
      <div class="upload-title">Upload Posters</div>
      <div class="upload-subtitle">Select the week's date</div>
      ${this._dateField()}
      <hr class="divider">
      <div class="field">
        <label class="field-label">בילדער <span class="req">*</span></label>
        <div id="files-widget"></div>
      </div>
      ${this._submitRow('Upload Posters')}
    `);
    this._dp = this._initDatePicker();
    this._fw = this._initFileWidget('files-widget', { accept: 'image/*', multiple: true, showThumb: true });
    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  async _doSubmit() {
    await this._submit('poster', async () => {
      const date = this._dp.getFormatted();
      if (!date)                throw new Error('Please enter a date');
      if (!this._fw.hasFiles()) throw new Error('Please upload images');
      const parsha = this._dp.getParsha();
      const _files = this._fw.getFiles().map(f => ({ name: f.name||f.file.name, mimeType: f.file.type, size: f.file.size, blob: f.file }));
      return { date, parsha, _files, _folderName: parsha || date };
    });
  }

  _reset() { super._reset(); this._dp.reset(); this._fw.reset(); }
}


// ════════════════════════════════════════════════════════════════
// EVENTS UPLOAD
// ════════════════════════════════════════════════════════════════

class MoisdesUploadEvents extends BaseUpload {
  _build() {
    this.shadowRoot.innerHTML = this._wrapHtml(`
      <div class="upload-title">Upload Event Recording</div>
      <div class="upload-subtitle">Fields with * are required</div>
      ${this._dateField()}
      <div class="field">
        <label class="field-label">טיטל <span class="req">*</span></label>
        <input type="text" id="field-title" placeholder="נאמען פון דעם אירוע...">
      </div>
      <div class="field">
        <label class="field-label">אָרט</label>
        <input type="text" id="field-location" placeholder="וואו...">
      </div>
      <div class="field">
        <label class="field-label">קאטעגאריע</label>
        <div id="cat-widget"></div>
      </div>
      <div class="field">
        <label class="field-label">באשרייבונג</label>
        <textarea id="field-desc" rows="4" placeholder="(אפציאנאל)..."></textarea>
      </div>
      ${this._tagsField()}
      <hr class="divider">
      <div class="field">
        <label class="field-label">טראַקס</label>
        <div class="field-hint" style="margin-bottom:0.5rem">שלעפ צו ארדענירן · קליק צו נעמען</div>
        <div id="files-widget"></div>
      </div>
      ${this._submitRow('Upload Event')}
    `);
    this._dp = this._initDatePicker();
    this._tw = this._initTagsWidget('tags-widget', window.MOISDES.CFG.tabs.tags);
    this._cw = new window.MOISDES.TagsWidget(this.$('#cat-widget'), window.MOISDES.CFG.tabs.categories, { allowNew: true });
    this._fw = this._initFileWidget('files-widget', { accept: 'audio/*', multiple: true, reorderable: true, named: true, showThumb: false });
    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  async _doSubmit() {
    await this._submit('event', async () => {
      const date  = this._dp.getFormatted();
      const title = this.$('#field-title').value.trim();
      if (!date)  throw new Error('Please enter a date');
      if (!title) throw new Error('Please enter a title');
      const _files = this._fw.getFiles().map(f => ({ name: f.name||f.file.name, mimeType: f.file.type, size: f.file.size, blob: f.file }));
      return {
        date, title,
        location:      this.$('#field-location').value.trim(),
        category:      this._cw.getValue(),
        description:   this.$('#field-desc').value.trim(),
        tags:          this._tw.getValue(),
        newTags:       [...this._tw.getNewTags()],
        newCategories: [...this._cw.getNewTags()],
        _files, _folderName: title,
      };
    });
  }

  _reset() {
    super._reset();
    this._dp.reset();
    ['#field-title','#field-location','#field-desc'].forEach(s => this.$(s).value = '');
    this._tw.reset(); this._cw.reset(); this._fw.reset();
  }
}


// ════════════════════════════════════════════════════════════════
// VIDEOS UPLOAD
// ════════════════════════════════════════════════════════════════

class MoisdesUploadVideos extends BaseUpload {
  _build() {
    this.shadowRoot.innerHTML = this._wrapHtml(`
      <div class="upload-title">Upload Video</div>
      <div class="upload-subtitle">Fields with * are required</div>
      ${this._dateField()}
      <div class="field">
        <label class="field-label">טיטל <span class="req">*</span></label>
        <input type="text" id="field-title" placeholder="ווידיאָ טיטל...">
      </div>
      <div class="field">
        <label class="field-label">אָרט</label>
        <input type="text" id="field-location" placeholder="וואו...">
      </div>
      <div class="field">
        <label class="field-label">קאטעגאריע</label>
        <div id="cat-widget"></div>
      </div>
      <div class="field">
        <label class="field-label">באשרייבונג</label>
        <textarea id="field-desc" rows="4" placeholder="(אפציאנאל)..."></textarea>
      </div>
      ${this._tagsField()}
      <hr class="divider">
      <div class="field">
        <label class="field-label">ווידיאָ לינק (YouTube, Drive, Dropbox)</label>
        <input type="url" id="field-link" placeholder="https://...">
      </div>
      <div class="field">
        <label class="field-label">אדער: לייג אַרויף א ווידיאָ פֿײל</label>
        <div id="files-widget"></div>
      </div>
      ${this._submitRow('Upload Video')}
    `);
    this._dp = this._initDatePicker();
    this._tw = this._initTagsWidget('tags-widget', window.MOISDES.CFG.tabs.tags);
    this._cw = new window.MOISDES.TagsWidget(this.$('#cat-widget'), window.MOISDES.CFG.tabs.categories, { allowNew: true });
    this._fw = this._initFileWidget('files-widget', { accept: 'video/*', multiple: false, showThumb: false });
    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  async _doSubmit() {
    await this._submit('video', async () => {
      const date  = this._dp.getFormatted();
      const title = this.$('#field-title').value.trim();
      const link  = this.$('#field-link').value.trim();
      if (!date)  throw new Error('Please enter a date');
      if (!title) throw new Error('Please enter a title');
      const _files = (!link && this._fw.hasFiles())
        ? this._fw.getFiles().map(f => ({ name: f.name||f.file.name, mimeType: f.file.type, size: f.file.size, blob: f.file }))
        : [];
      return {
        date, title,
        location:      this.$('#field-location').value.trim(),
        category:      this._cw.getValue(),
        description:   this.$('#field-desc').value.trim(),
        tags:          this._tw.getValue(),
        newTags:       [...this._tw.getNewTags()],
        newCategories: [...this._cw.getNewTags()],
        videoLink:     link,
        _files, _folderName: title,
      };
    });
  }

  _reset() {
    super._reset();
    this._dp.reset();
    ['#field-title','#field-location','#field-desc','#field-link'].forEach(s => this.$(s).value = '');
    this._tw.reset(); this._cw.reset(); this._fw.reset();
  }
}


// ════════════════════════════════════════════════════════════════
// PDFs UPLOAD
// ════════════════════════════════════════════════════════════════

class MoisdesUploadPdfs extends BaseUpload {
  _build() {
    this.shadowRoot.innerHTML = this._wrapHtml(`
      <div class="upload-title">Upload PDFs</div>
      <div class="upload-subtitle">You can upload multiple PDFs. Each gets its own metadata.</div>
      ${this._dateField()}
      <hr class="divider">
      <div class="field">
        <label class="field-label">PDF פֿײלן <span class="req">*</span></label>
        <div id="files-widget"></div>
      </div>
      <div id="pdf-meta-list"></div>
      ${this._submitRow('Upload PDFs')}
    `);
    this._dp = this._initDatePicker();
    this._fw = this._initFileWidget('files-widget', { accept: '.pdf,application/pdf', multiple: true, showThumb: false });
    this._pdfWidgets = [];

    // Re-render metadata fields when files change
    const origAdd = this._fw.addFiles.bind(this._fw);
    this._fw.addFiles = (files) => { origAdd(files); this._renderPdfMeta(); };
    const origRemove = this._fw.removeFile.bind(this._fw);
    this._fw.removeFile = (id) => { origRemove(id); this._renderPdfMeta(); };

    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  _renderPdfMeta() {
    const U     = window.MOISDES.util;
    const CFG   = window.MOISDES.CFG;
    const files = this._fw.getFiles();
    const listEl = this.$('#pdf-meta-list');
    if (!files.length) { listEl.innerHTML = ''; this._pdfWidgets = []; return; }

    listEl.innerHTML = files.map((f, i) => `
      <div style="border:1px solid rgba(255,255,255,0.18);border-radius:2px;padding:1rem;margin-bottom:0.85rem">
        <div style="font-size:0.78rem;font-weight:700;margin-bottom:0.85rem;color:rgba(255,255,255,0.7)">${U.eh(f.file.name)}</div>
        <div class="field">
          <label class="field-label">טיטל <span class="req">*</span></label>
          <input type="text" class="pdf-title" data-i="${i}" placeholder="טיטל...">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
          <div class="field"><label class="field-label">קאטעגאריע</label><div class="pdf-cat" data-i="${i}"></div></div>
          <div class="field">
            <label class="field-label">שפּראך</label>
            <select class="pdf-lang" data-i="${i}">
              <option value="">—</option>
              <option value="ייִדיש">ייִדיש</option>
              <option value="לשון הקודש">לשון הקודש</option>
              <option value="English">English</option>
            </select>
          </div>
          <div class="field"><label class="field-label">פּרשה / אנלאַס</label><div class="pdf-parsha" data-i="${i}"></div></div>
          <div class="field"><label class="field-label">יאָר</label><input type="text" class="pdf-year" data-i="${i}" placeholder="ז.ב. תשפ״ה"></div>
        </div>
        <div class="field" style="margin-top:0.5rem"><label class="field-label">טאגן</label><div class="pdf-tags" data-i="${i}"></div></div>
      </div>
    `).join('');

    this._pdfWidgets = files.map((f, i) => ({
      cat:    new window.MOISDES.TagsWidget(listEl.querySelector(`.pdf-cat[data-i="${i}"]`),    CFG.tabs.categories, { allowNew: true }),
      parsha: new window.MOISDES.TagsWidget(listEl.querySelector(`.pdf-parsha[data-i="${i}"]`), CFG.tabs.parshas,    { allowNew: true }),
      tags:   new window.MOISDES.TagsWidget(listEl.querySelector(`.pdf-tags[data-i="${i}"]`),   CFG.tabs.tags,       { allowNew: true }),
    }));
  }

  async _doSubmit() {
    await this._submit('pdf', async () => {
      const date = this._dp.getFormatted();
      if (!date) throw new Error('Please enter a date');
      const files = this._fw.getFiles();
      if (!files.length) throw new Error('Please upload PDF files');

      const metaList = this.$('#pdf-meta-list');
      const newTags = [], newCategories = [], newParshas = [];

      this._setProgress(10, 'Processing PDFs...');

      const pdfs = await Promise.all(files.map(async (f, i) => {
        const titleEl = metaList.querySelector(`.pdf-title[data-i="${i}"]`);
        const langEl  = metaList.querySelector(`.pdf-lang[data-i="${i}"]`);
        const yearEl  = metaList.querySelector(`.pdf-year[data-i="${i}"]`);
        const w = this._pdfWidgets[i];
        const data = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = ev => res(ev.target.result.split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(f.file);
        });
        if (w) { newTags.push(...w.tags.getNewTags()); newCategories.push(...w.cat.getNewTags()); newParshas.push(...w.parsha.getNewTags()); }
        return {
          title:    titleEl?.value.trim() || f.file.name,
          category: w?.cat.getValue()    || '',
          language: langEl?.value        || '',
          parsha:   w?.parsha.getValue() || '',
          year:     yearEl?.value.trim() || '',
          tags:     w?.tags.getValue()   || '',
          file: { name: f.file.name, mimeType: 'application/pdf', data },
        };
      }));

      return { date, pdfs, newTags, newCategories, newParshas };
    });
  }

  _reset() {
    super._reset();
    this._dp.reset();
    this._fw.reset();
    this.$('#pdf-meta-list').innerHTML = '';
    this._pdfWidgets = [];
  }
}


// ════════════════════════════════════════════════════════════════
// UPLOAD HUB
// ════════════════════════════════════════════════════════════════

class MoisdesUploadHub extends HTMLElement {
  connectedCallback() {
    if (!document.querySelector('#moisdes-font')) {
      const l = document.createElement('link');
      l.id = 'moisdes-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap';
      document.head.appendChild(l);
    }
    this.attachShadow({ mode: 'open' });
    const tryBuild = () => {
      if (window.MOISDES && window.MOISDES.CFG) this._build();
      else setTimeout(tryBuild, 30);
    };
    tryBuild();
  }

  _build() {
    const CFG = window.MOISDES.CFG;
    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :host { display:block; width:100%; font-family:'Heebo',sans-serif; color:#fff; padding:0 48px; --border:rgba(255,255,255,0.18); }
        @media(max-width:600px){ :host { padding:0 20px; } }
        .hub-wrap { max-width:640px; margin:0 auto; padding:2rem 0 4rem; }
        .hub-title { font-size:1.4rem; font-weight:900; margin-bottom:0.25rem; direction:ltr; text-align:left; }
        .hub-subtitle { font-size:0.8rem; color:rgba(255,255,255,0.5); margin-bottom:2.5rem; direction:ltr; text-align:left; }
        .hub-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:1rem; }
        .hub-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem; padding:1.5rem 1rem; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:2px; cursor:pointer; transition:all 0.15s; color:#fff; text-decoration:none; font-family:'Heebo',sans-serif; }
        .hub-btn:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.35); }
        .hub-label { font-size:0.88rem; font-weight:700; }
      </style>
      <div class="hub-wrap">
        <div class="hub-title">Upload</div>
        <div class="hub-subtitle">Choose what to upload</div>
        <div class="hub-grid">
          <a class="hub-btn" href="${CFG.pages.uploadBlog}"><div class="hub-label">בלאג פאסט</div></a>
          <a class="hub-btn" href="${CFG.pages.uploadPosters}"><div class="hub-label">פאסטערס</div></a>
          <a class="hub-btn" href="${CFG.pages.uploadEvents}"><div class="hub-label">הקלטות</div></a>
          <a class="hub-btn" href="${CFG.pages.uploadVideos}"><div class="hub-label">ווידיאוס</div></a>
          <a class="hub-btn" href="${CFG.pages.uploadPdfs}"><div class="hub-label">שריפטן</div></a>
        </div>
      </div>
    `;
  }
}


// ── REGISTER ──────────────────────────────────────────────────────
customElements.define('moisdes-upload-blog',    MoisdesUploadBlog);
customElements.define('moisdes-upload-posters', MoisdesUploadPosters);
customElements.define('moisdes-upload-events',  MoisdesUploadEvents);
customElements.define('moisdes-upload-videos',  MoisdesUploadVideos);
customElements.define('moisdes-upload-pdfs',    MoisdesUploadPdfs);
customElements.define('moisdes-upload-hub',     MoisdesUploadHub);
