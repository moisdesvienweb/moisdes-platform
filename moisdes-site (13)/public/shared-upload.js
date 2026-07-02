// ================================================================
// MOISDES PLATFORM — SHARED UPLOAD HELPERS
// shared-upload.js
// Used by all upload pages
// ================================================================

window.MOISDES = window.MOISDES || {};

// ── DATE PICKER WIDGET ────────────────────────────────────────────
// Renders year/parsha/day dropdowns + manual date input
// Usage: new MOISDES.DatePicker(containerEl, onChange)

window.MOISDES.DatePicker = class {
  constructor(container, onChange) {
    this.container = container;
    this.onChange  = onChange || (() => {});
    this.render();
  }

  render() {
    const CFG = window.MOISDES.CFG;
    const U   = window.MOISDES.util;

    this.container.innerHTML = `
      <div class="date-selects">
        <select id="dp-year">
          <option value="">שנה</option>
          ${this._yearOptions()}
        </select>
        <select id="dp-parsha">
          <option value="">פרשה</option>
          ${this._parshaOptions()}
        </select>
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

    const q   = s => this.container.querySelector(s);
    this.selYear   = q('#dp-year');
    this.selParsha = q('#dp-parsha');
    this.selDow    = q('#dp-dow');
    this.inputDate = q('#dp-date');
    this.noteEl    = q('#dp-note');

    this.selYear.addEventListener('change',   () => this._fromDropdowns());
    this.selParsha.addEventListener('change', () => this._fromDropdowns());
    this.selDow.addEventListener('change',    () => this._fromDropdowns());
    this.inputDate.addEventListener('change', () => this._fromManual());
  }

  _yearOptions() {
    const U   = window.MOISDES.util;
    const cur = U.currentHebrewYear();
    let html  = '';
    for (let y = cur; y >= 5742; y--) {
      html += `<option value="${y}">${U.yearToHebrew(y)}</option>`;
    }
    return html;
  }

  _parshaOptions() {
    const CFG        = window.MOISDES.CFG;
    const secondPair = new Set(['פקודי','מצורע','קדושים','בחוקותי','מסעי','וילך']);
    return CFG.parshiyot.filter(p => !secondPair.has(p))
      .map(p => {
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
    this.selYear.value   = '';
    this.selParsha.value = '';
    this.selDow.value    = '';
    const d = new Date(val + 'T12:00:00Z');
    this._updateNote(d);
    this.onChange(val);
  }

  _updateNote(d) {
    this.noteEl.textContent = d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  getValue() { return this.inputDate.value; }  // YYYY-MM-DD
  getFormatted() {                              // MM/DD/YYYY
    const v = this.inputDate.value;
    if (!v) return '';
    const [y,m,d] = v.split('-');
    return `${m}/${d}/${y}`;
  }
  getParsha() {
    const v = this.selParsha.value || (this.inputDate.value ? window.MOISDES.util.dateToParsha(this.inputDate.value) : '');
    return v;
  }
  getHebrewYear() {
    return this.selYear.value || '';
  }

  reset() {
    this.selYear.value   = '';
    this.selParsha.value = '';
    this.selDow.value    = '';
    this.inputDate.value = '';
    this.noteEl.textContent = '';
  }
};


// ── TAGS WIDGET ───────────────────────────────────────────────────
// Renders a multi-select tags input with dropdown
// Usage: new MOISDES.TagsWidget(containerEl, tabName, { allowNew: true })

window.MOISDES.TagsWidget = class {
  constructor(container, tabName, opts = {}) {
    this.container  = container;
    this.tabName    = tabName;
    this.allowNew   = opts.allowNew !== false;
    this.selected   = [];
    this.allTags    = [];
    this.newTags    = [];
    this.filtered   = [];
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
    // Attach reference so inline handlers work
    this.container._widget = this;
  }

  _onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = this.inputEl.value.trim();
      if (!val) return;
      const match = this.allTags.find(t => t.toLowerCase() === val.toLowerCase());
      if (match) this.add(match);
      else if (this.allowNew) this.addNew(val);
    }
    if (e.key === 'Escape') this._hideDD();
  }

  add(tag) {
    if (!this.selected.includes(tag)) {
      this.selected.push(tag);
      this._renderPills();
    }
    this.inputEl.value = '';
    this._onInput('');
  }

  addNew(tag) {
    if (!tag) return;
    if (!this.allTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      this.allTags.push(tag);
      this.allTags.sort((a,b) => a.localeCompare(b,'he'));
      this.newTags.push(tag);
    }
    this.add(tag);
  }

  remove(tag) {
    this.selected = this.selected.filter(t => t !== tag);
    this._renderPills();
  }

  _renderPills() {
    const U = window.MOISDES.util;
    this.pillsEl.innerHTML = this.selected.map(t =>
      `<span class="sel-pill">${U.eh(t)}<button class="sel-pill-x" onmousedown="event.preventDefault();this.closest('.tags-dropdown-wrap').parentElement._widget.remove('${U.ea(t)}')">✕</button></span>`
    ).join('');
    this.container._widget = this;
  }

  getValue() { return this.selected.join(', '); }
  getNewTags() { return this.newTags; }
  reset() { this.selected = []; this.newTags = []; this._renderPills(); }
};


// ── FILE UPLOAD WIDGET ────────────────────────────────────────────
// Handles drag-drop, previews, reordering, per-file naming
// Usage: new MOISDES.FileWidget(containerEl, { accept, multiple, reorderable, named })

window.MOISDES.FileWidget = class {
  constructor(container, opts = {}) {
    this.container   = container;
    this.accept      = opts.accept || 'image/*';
    this.multiple    = opts.multiple !== false;
    this.reorderable = opts.reorderable || false;
    this.named       = opts.named || false; // allow naming each file
    this.showThumb   = opts.showThumb !== false;
    this.files       = []; // { id, file, preview, name }
    this.dragSrc     = null;
    this.render();
  }

  render() {
    const U = window.MOISDES.util;
    this.container.innerHTML = `
      <div class="upload-zone" id="fw-zone"
        ondragover="event.preventDefault();this.classList.add('drag-over')"
        ondragleave="this.classList.remove('drag-over')"
        ondrop="this.getRootNode()._fw.onDrop(event)">
        <input type="file" id="fw-input" ${this.multiple?'multiple':''} accept="${this.accept}">
        <div class="upload-zone-icon"></div>
        <div class="upload-zone-text">קליק אדער שלעפ פֿײלן אהער</div>
        <div class="upload-zone-sub">${this._acceptLabel()}</div>
      </div>
      <div class="file-list" id="fw-list"></div>
    `;
    this.zoneEl  = this.container.querySelector('#fw-zone');
    this.inputEl = this.container.querySelector('#fw-input');
    this.listEl  = this.container.querySelector('#fw-list');
    this.container._fw = this;

    this.inputEl.addEventListener('change', e => this.addFiles(e.target.files));
    this.zoneEl.addEventListener('drop', e => this.onDrop(e));
  }

  _acceptLabel() {
    if (this.accept.includes('audio')) return 'MP3, WAV, M4A';
    if (this.accept.includes('video')) return 'MP4, MOV, MKV';
    if (this.accept.includes('pdf'))   return 'PDF';
    return 'PNG, JPG, GIF, WEBP';
  }

  onDrop(e) {
    e.preventDefault();
    this.zoneEl.classList.remove('drag-over');
    this.addFiles(e.dataTransfer.files);
  }

  addFiles(fileList) {
    for (const f of fileList) {
      const id   = Date.now() + Math.random();
      const name = f.name.replace(/\.[^.]+$/, ''); // strip extension for display
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

  removeFile(id) {
    this.files = this.files.filter(f => f.id !== id);
    this._renderList();
  }

  _renderList() {
    const U = window.MOISDES.util;
    this.listEl.innerHTML = this.files.map((f, i) => `
      <div class="file-item" draggable="${this.reorderable}" data-id="${f.id}"
        ${this.reorderable ? `ondragstart="this.closest('[id=fw-list]')._fw_dragstart(this)" ondragover="event.preventDefault()" ondrop="this.closest('[id=fw-list]')._fw_drop(this)"` : ''}>
        ${this.reorderable ? '<span class="file-item-drag">≡</span>' : ''}
        ${f.preview && this.showThumb
          ? `<img class="file-item-thumb" src="${f.preview}" alt="">`
          : `<div class="file-item-icon">${this._icon(f.file.type)}</div>`}
        ${this.named
          ? `<input class="file-item-name-input" value="${U.eh(f.name)}" placeholder="שרייב א נאמען..." onchange="this.closest('[id=fw-list]')._fw_rename(${f.id}, this.value)">`
          : `<span style="flex:1;font-size:0.8rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.eh(f.file.name)}</span>`}
        <button class="file-item-remove" onmousedown="event.preventDefault();this.closest('[id=fw-list]')._fw_remove(${f.id})">✕</button>
      </div>
    `).join('');

    // Attach methods to list element
    this.listEl._fw_remove  = id => this.removeFile(id);
    this.listEl._fw_rename  = (id, name) => { const f = this.files.find(f => f.id===id); if(f) f.name=name; };
    this.listEl._fw_dragstart = el => { this.dragSrc = el; };
    this.listEl._fw_drop = el => {
      if (!this.dragSrc || this.dragSrc === el) return;
      const srcId = parseFloat(this.dragSrc.dataset.id);
      const dstId = parseFloat(el.dataset.id);
      const si = this.files.findIndex(f=>f.id===srcId);
      const di = this.files.findIndex(f=>f.id===dstId);
      if (si<0||di<0) return;
      const [moved] = this.files.splice(si,1);
      this.files.splice(di,0,moved);
      this._renderList();
    };
  }

  _icon(type) {
    if (type.includes('audio')) return '♫';
    if (type.includes('video')) return '▶';
    if (type.includes('pdf'))   return '';
    return '';
  }

  // Returns array of { name, mimeType, data (base64) }
  async getBase64Files() {
    return Promise.all(this.files.map(f => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = ev => resolve({ name: f.name || f.file.name, mimeType: f.file.type, data: ev.target.result.split(',')[1] });
      reader.onerror = reject;
      reader.readAsDataURL(f.file);
    })));
  }

  getFiles()  { return this.files; }
  hasFiles()  { return this.files.length > 0; }
  reset()     { this.files = []; this._renderList(); }
};


// ── GENERIC FORM SUBMIT ───────────────────────────────────────────
// Sends data to a Netlify function, shows progress

window.MOISDES.submitForm = async function(endpoint, payload, progBar, progText, statusEl, btnEl) {
  const show = (type, msg) => {
    statusEl.className = `status-msg ${type} on`;
    statusEl.textContent = msg;
    if (type === 'ok') setTimeout(() => statusEl.classList.remove('on'), 5000);
  };

  btnEl.disabled = true;
  show('ld', 'שיקט אריין...');

  if (progBar) {
    progBar.parentElement.parentElement.classList.add('on');
    progBar.style.width = '5%';
    progText.textContent = 'מכין...';
  }

  try {
    const res    = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (progBar) progBar.style.width = '90%';
    const result = await res.json();
    if (!res.ok || result.error) throw new Error(result.error || `Server error ${res.status}`);
    if (progBar) progBar.style.width = '100%';
    show('ok', '✓ אריינגעשיקט! יישר כח.');
    btnEl.disabled = false;
    return result;
  } catch(e) {
    show('err', `⚠ Error: ${e.message}`);
    btnEl.disabled = false;
    throw e;
  }
};
