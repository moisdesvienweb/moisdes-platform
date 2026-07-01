// ================================================================
// MOISDES PLATFORM — ALL UPLOAD PAGES
// moisdes-uploads.js
// Defines custom elements for all upload forms:
//   <moisdes-upload-blog>
//   <moisdes-upload-posters>
//   <moisdes-upload-events>
//   <moisdes-upload-videos>
//   <moisdes-upload-pdfs>
//   <moisdes-upload-hub>
// ================================================================


// ── BASE UPLOAD CLASS ─────────────────────────────────────────────
// Shared logic for all upload forms

class BaseUpload extends HTMLElement {
  connectedCallback() {
    this._injectFont();
    this.attachShadow({ mode: 'open' });
    this._build();
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
          --hover-bg:rgba(255,255,255,0.06); --tag-bg:rgba(255,255,255,0.1);
          --error:#ff6b6b; --success:#69db7c;
        }
        @media(max-width:600px){ :host { padding:0 20px; } }
        .upload-wrap { max-width:680px; margin:0 auto; padding:2rem 0 4rem; }
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
        .submit-btn {
          width:100%; padding:0.85rem;
          background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.35);
          color:var(--text); font-family:'Heebo',sans-serif; font-size:0.95rem; font-weight:700;
          border-radius:2px; transition:all 0.15s; letter-spacing:0.04em; cursor:pointer;
        }
        .submit-btn:hover:not(:disabled) { background:rgba(255,255,255,0.2); border-color:rgba(255,255,255,0.6); }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .status-msg { margin-top:1rem; padding:0.7rem 1rem; border-radius:2px; font-size:0.82rem; direction:rtl; display:none; }
        .status-msg.on { display:block; }
        .status-msg.err { background:rgba(255,107,107,0.14); border:1px solid rgba(255,107,107,0.3); color:var(--error); }
        .status-msg.ok  { background:rgba(105,219,124,0.14); border:1px solid rgba(105,219,124,0.3); color:var(--success); }
        .status-msg.ld  { background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--muted); }
        .prog-wrap { display:none; margin-top:0.75rem; }
        .prog-wrap.on { display:block; }
        .prog-track { height:3px; background:rgba(255,255,255,0.1); border-radius:99px; overflow:hidden; margin-bottom:0.35rem; }
        .prog-bar { height:100%; background:rgba(255,255,255,0.7); border-radius:99px; transition:width 0.2s; width:0%; }
        .prog-text { font-size:0.7rem; color:var(--muted); }
        .tags-area { border:1px solid var(--border); border-radius:2px; background:rgba(255,255,255,0.05); padding:0.6rem 0.85rem; min-height:48px; cursor:text; }
        .tags-area:focus-within { border-color:rgba(255,255,255,0.5); }
        .selected-pills { display:flex; flex-wrap:wrap; gap:0.3rem; margin-bottom:0.35rem; }
        .sel-pill { display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.1); border:1px solid var(--border); color:var(--text); font-size:0.7rem; padding:0.12rem 0.5rem; border-radius:99px; }
        .sel-pill-x { background:none; border:none; color:inherit; font-size:0.75rem; cursor:pointer; padding:0; opacity:0.6; }
        .sel-pill-x:hover { opacity:1; }
        .tag-input { width:100%; background:transparent; border:none; color:var(--text); font-family:'Heebo',sans-serif; font-size:0.85rem; outline:none; direction:rtl; padding:0; }
        .tag-input::placeholder { color:var(--subtle); }
        .tags-dropdown-wrap { position:relative; }
        .tags-dropdown { position:absolute; top:100%; right:0; left:0; z-index:300; background:#0e0e1c; border:1px solid var(--border); border-radius:2px; max-height:180px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.6); display:none; }
        .dd-opt { padding:0.45rem 0.85rem; font-size:0.82rem; cursor:pointer; direction:rtl; transition:background 0.1s; }
        .dd-opt:hover { background:var(--hover-bg); }
        .dd-opt.new-opt { color:var(--subtle); font-style:italic; }
        .dd-empty { padding:0.45rem 0.85rem; font-size:0.78rem; color:var(--subtle); }
        .field-hint { font-size:0.67rem; color:var(--subtle); margin-top:0.3rem; }
        .upload-zone { border:1px dashed var(--border); border-radius:2px; padding:1.5rem 1rem; text-align:center; cursor:pointer; background:rgba(255,255,255,0.05); position:relative; transition:border-color 0.15s,background 0.15s; }
        .upload-zone:hover,.upload-zone.drag-over { border-color:rgba(255,255,255,0.4); background:var(--hover-bg); }
        .upload-zone input[type=file] { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
        .upload-zone-icon { font-size:1.3rem; color:var(--muted); margin-bottom:0.35rem; }
        .upload-zone-text { font-size:0.82rem; color:var(--muted); }
        .upload-zone-sub { font-size:0.68rem; color:var(--subtle); margin-top:0.2rem; }
        .file-list { margin-top:0.75rem; display:flex; flex-direction:column; gap:0.4rem; }
        .file-item { display:flex; align-items:center; gap:0.6rem; border-bottom:1px solid var(--border); padding:0.5rem 0; }
        .file-item-thumb { width:36px; height:36px; object-fit:cover; border-radius:2px; flex-shrink:0; }
        .file-item-icon { width:36px; height:36px; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:1rem; flex-shrink:0; }
        .file-item-name-input { flex:1; background:transparent; border:none; border-bottom:1px solid var(--border); color:var(--text); font-family:'Heebo',sans-serif; font-size:0.8rem; outline:none; padding:0.1rem 0; direction:rtl; }
        .file-item-name-input:focus { border-bottom-color:rgba(255,255,255,0.5); }
        .file-item-remove { background:none; border:none; color:var(--muted); font-size:0.85rem; padding:0.2rem; cursor:pointer; flex-shrink:0; transition:color 0.15s; }
        .file-item-remove:hover { color:var(--error); }
        .file-item-drag { color:var(--subtle); font-size:0.9rem; cursor:grab; flex-shrink:0; }
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

  _tagsField(label='טעגס', id='tags') {
    return `
      <div class="field">
        <label class="field-label">${label}</label>
        <div id="${id}-widget"></div>
      </div>
    `;
  }

  _submitRow(label='סאבמיט') {
    return `
      <button class="submit-btn" id="submit-btn">${label}</button>
      <div class="status-msg" id="status"></div>
      <div class="prog-wrap" id="prog-wrap">
        <div class="prog-track"><div class="prog-bar" id="prog-bar"></div></div>
        <div class="prog-text" id="prog-text"></div>
      </div>
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

  async _submit(type, payloadFn) {
    const btn    = this.$('#submit-btn');
    const status = this.$('#status');
    const pb     = this.$('#prog-bar');
    const pt     = this.$('#prog-text');

    const show = (t, m) => {
      status.className = `status-msg ${t} on`;
      status.textContent = m;
      if (t==='ok') setTimeout(()=>status.classList.remove('on'), 6000);
    };

    let payload;
    try { payload = await payloadFn(); }
    catch(e) { show('err', `⚠ ${e.message}`); return; }

    btn.disabled = true;
    show('ld', 'סאבמיט...');
    this.$('#prog-wrap').classList.add('on');
    pb.style.width = '10%';

    try {
      const res    = await fetch(`${window.MOISDES.CFG.submitBase}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      });
      pb.style.width = '90%';
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || `Server error ${res.status}`);
      pb.style.width = '100%';
      pt.textContent = '✓';
      show('ok', '✓ אריינגעשיקט! יישר כח.');
      this._reset();
    } catch(e) {
      show('err', `⚠ Error: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  }

  _reset() {} // override in subclasses
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

    this._dp  = this._initDatePicker();
    this._tw  = this._initTagsWidget();
    this._fw  = this._initFileWidget('files-widget', { accept: 'image/*', multiple: true, showThumb: true });
    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  async _doSubmit() {
    await this._submit('blog', async () => {
      const date  = this._dp.getFormatted();
      const title = this.$('#field-title').value.trim();
      if (!date)  throw new Error('ביטע אנגעב א דאטום');
      if (!title) throw new Error('ביטע שרייב א קעפל');
      const images = await this._fw.getBase64Files();
      return { date, title, body: this.$('#field-body').value.trim(), tags: this._tw.getValue(), newTags: this._tw.getNewTags(), images };
    });
  }

  _reset() {
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
      if (!date) throw new Error('ביטע אנגעב א דאטום');
      if (!this._fw.hasFiles()) throw new Error('ביטע העלאד בילדער');
      const parsha = this._dp.getParsha();
      const images = await this._fw.getBase64Files();
      return { date, parsha, images };
    });
  }

  _reset() { this._dp.reset(); this._fw.reset(); }
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
        <input type="text" id="field-location" placeholder="וואו האט עס שטאטגעפונען...">
      </div>

      <div class="field">
        <label class="field-label">קאטעגאריע</label>
        <div id="cat-widget"></div>
      </div>

      <div class="field">
        <label class="field-label">באשרייבונג</label>
        <textarea id="field-desc" rows="4" placeholder="קורצע באשרייבונג (אפציאנאל)..."></textarea>
      </div>

      ${this._tagsField()}

      <hr class="divider">

      <div class="field">
        <label class="field-label">טראַקס</label>
        <div class="field-hint" style="margin-bottom:0.5rem">זיי קענען ארדענירט ווערן. שרייב יעדן נאמען.</div>
        <div id="files-widget"></div>
      </div>

      ${this._submitRow('Upload Event')}
    `);

    this._dp  = this._initDatePicker();
    this._tw  = this._initTagsWidget('tags-widget', window.MOISDES.CFG.tabs.tags);
    this._cw  = new window.MOISDES.TagsWidget(this.$('#cat-widget'), window.MOISDES.CFG.tabs.categories, { allowNew: true });
    this._fw  = this._initFileWidget('files-widget', { accept: 'audio/*', multiple: true, reorderable: true, named: true, showThumb: false });
    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  async _doSubmit() {
    await this._submit('event', async () => {
      const date  = this._dp.getFormatted();
      const title = this.$('#field-title').value.trim();
      if (!date)  throw new Error('ביטע אנגעב א דאטום');
      if (!title) throw new Error('ביטע שרייב א טיטל');
      const tracks = await this._fw.getBase64Files();
      return {
        date, title,
        location:    this.$('#field-location').value.trim(),
        category:    this._cw.getValue(),
        description: this.$('#field-desc').value.trim(),
        tags:        this._tw.getValue(),
        newTags:     [...this._tw.getNewTags()],
        newCategories: [...this._cw.getNewTags()],
        tracks,
      };
    });
  }

  _reset() {
    this._dp.reset();
    this.$('#field-title').value    = '';
    this.$('#field-location').value = '';
    this.$('#field-desc').value     = '';
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

    this._dp  = this._initDatePicker();
    this._tw  = this._initTagsWidget('tags-widget', window.MOISDES.CFG.tabs.tags);
    this._cw  = new window.MOISDES.TagsWidget(this.$('#cat-widget'), window.MOISDES.CFG.tabs.categories, { allowNew: true });
    this._fw  = this._initFileWidget('files-widget', { accept: 'video/*', multiple: false, showThumb: false });
    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  async _doSubmit() {
    await this._submit('video', async () => {
      const date  = this._dp.getFormatted();
      const title = this.$('#field-title').value.trim();
      const link  = this.$('#field-link').value.trim();
      if (!date)  throw new Error('ביטע אנגעב א דאטום');
      if (!title) throw new Error('ביטע שרייב א טיטל');

      let videoFile = null;
      if (!link && this._fw.hasFiles()) {
        const files = await this._fw.getBase64Files();
        videoFile = files[0] || null;
      }

      return {
        date, title,
        location:    this.$('#field-location').value.trim(),
        category:    this._cw.getValue(),
        description: this.$('#field-desc').value.trim(),
        tags:        this._tw.getValue(),
        newTags:     [...this._tw.getNewTags()],
        newCategories: [...this._cw.getNewTags()],
        videoLink:   link,
        videoFile,
      };
    });
  }

  _reset() {
    this._dp.reset();
    ['#field-title','#field-location','#field-desc','#field-link'].forEach(s => this.$(s).value='');
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
      <div class="upload-subtitle">You can upload multiple PDFs at once. Each gets its own metadata.</div>

      ${this._dateField()}

      <hr class="divider">

      <div class="field">
        <label class="field-label">PDF פֿײלן <span class="req">*</span></label>
        <div id="files-widget"></div>
      </div>

      <!-- Per-PDF metadata rendered dynamically below -->
      <div id="pdf-meta-list"></div>

      ${this._submitRow('Upload PDFs')}
    `);

    this._dp = this._initDatePicker();
    this._fw = this._initFileWidget('files-widget', {
      accept: '.pdf,application/pdf', multiple: true,
      reorderable: false, named: false, showThumb: false,
    });

    // Watch for file changes to render per-file metadata fields
    const origRender = this._fw._renderList.bind(this._fw);
    this._fw._renderList = () => { origRender(); this._renderPdfMeta(); };

    this.$('#submit-btn').addEventListener('click', () => this._doSubmit());
  }

  _renderPdfMeta() {
    const U       = window.MOISDES.util;
    const CFG     = window.MOISDES.CFG;
    const files   = this._fw.getFiles();
    const listEl  = this.$('#pdf-meta-list');

    if (!files.length) { listEl.innerHTML = ''; return; }

    listEl.innerHTML = files.map((f,i) => `
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:2px;padding:1rem;margin-bottom:0.85rem">
        <div style="font-size:0.78rem;font-weight:700;margin-bottom:0.85rem;color:rgba(255,255,255,0.7)">${U.eh(f.file.name)}</div>
        <div class="field">
          <label class="field-label">טיטל <span class="req">*</span></label>
          <input type="text" class="pdf-title" data-i="${i}" placeholder="טיטל פון דעם שריפֿט...">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
          <div class="field">
            <label class="field-label">קאטעגאריע</label>
            <div class="pdf-cat-widget" data-i="${i}"></div>
          </div>
          <div class="field">
            <label class="field-label">שפּראך</label>
            <select class="pdf-lang" data-i="${i}">
              <option value="">—</option>
              <option value="ייִדיש">ייִדיש</option>
              <option value="אנגליש">אנגליש</option>
              <option value="לשון הקודש">לשון הקודש</option>
              <option value="English">English</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">פּרשה / אנלאַס</label>
            <div class="pdf-parsha-widget" data-i="${i}"></div>
          </div>
          <div class="field">
            <label class="field-label">יאָר</label>
            <input type="text" class="pdf-year" data-i="${i}" placeholder="ז.ב. תשפ״ה">
          </div>
        </div>
        <div class="field" style="margin-top:0.5rem">
          <label class="field-label">טאגן</label>
          <div class="pdf-tags-widget" data-i="${i}"></div>
        </div>
      </div>
    `).join('');

    // Init TagsWidgets for each PDF entry
    this._pdfWidgets = files.map((f,i) => {
      const catEl    = listEl.querySelector(`.pdf-cat-widget[data-i="${i}"]`);
      const parshaEl = listEl.querySelector(`.pdf-parsha-widget[data-i="${i}"]`);
      const tagsEl   = listEl.querySelector(`.pdf-tags-widget[data-i="${i}"]`);
      return {
        cat:    new window.MOISDES.TagsWidget(catEl,    CFG.tabs.categories, { allowNew: true }),
        parsha: new window.MOISDES.TagsWidget(parshaEl, CFG.tabs.parshas,    { allowNew: true }),
        tags:   new window.MOISDES.TagsWidget(tagsEl,   CFG.tabs.tags,       { allowNew: true }),
      };
    });
  }

  async _doSubmit() {
    await this._submit('pdf', async () => {
      const date = this._dp.getFormatted();
      if (!date) throw new Error('ביטע אנגעב א דאטום');
      const files = this._fw.getFiles();
      if (!files.length) throw new Error('ביטע העלאד PDF פֿײלן');

      const metaList = this.$('#pdf-meta-list');
      const newTags       = [];
      const newCategories = [];
      const newParshas    = [];

      const pdfs = await Promise.all(files.map(async (f, i) => {
        const titleEl = metaList.querySelector(`.pdf-title[data-i="${i}"]`);
        const langEl  = metaList.querySelector(`.pdf-lang[data-i="${i}"]`);
        const yearEl  = metaList.querySelector(`.pdf-year[data-i="${i}"]`);
        const w       = this._pdfWidgets?.[i];

        const title = titleEl?.value.trim() || f.file.name;
        const reader = new FileReader();
        const data   = await new Promise((res,rej) => {
          reader.onload = ev => res(ev.target.result.split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(f.file);
        });

        if (w) {
          newTags.push(...w.tags.getNewTags());
          newCategories.push(...w.cat.getNewTags());
          newParshas.push(...w.parsha.getNewTags());
        }

        return {
          title,
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
    this._dp.reset();
    this._fw.reset();
    this.$('#pdf-meta-list').innerHTML = '';
    this._pdfWidgets = [];
  }
}


// ════════════════════════════════════════════════════════════════
// UPLOAD HUB — main upload landing page
// ════════════════════════════════════════════════════════════════

class MoisdesUploadHub extends BaseUpload {
  _build() {
    const CFG = window.MOISDES.CFG;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/shared-styles.css">
      <style>
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :host {
          display:block; width:100%;
          font-family:'Heebo',sans-serif; font-size:15px;
          color:#ffffff; padding:0 48px;
          --border:rgba(255,255,255,0.18); --hover-bg:rgba(255,255,255,0.06);
        }
        @media(max-width:600px){ :host { padding:0 20px; } }
        .hub-wrap { max-width:680px; margin:0 auto; padding:2rem 0 4rem; }
        .hub-title { font-size:1.4rem; font-weight:900; margin-bottom:0.25rem; direction:ltr; text-align:left; }
        .hub-subtitle { font-size:0.8rem; color:rgba(255,255,255,0.5); margin-bottom:2.5rem; direction:ltr; text-align:left; }
        .hub-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:1rem; }
        .hub-btn {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:0.5rem; padding:1.5rem 1rem;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15);
          border-radius:2px; cursor:pointer; transition:all 0.15s;
          color:#fff; text-decoration:none;
          font-family:Heebo,sans-serif;
        }
        .hub-btn:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.3); transform:translateY(-2px); }
        .hub-icon { font-size:1.8rem; }
        .hub-label { font-size:0.88rem; font-weight:700; }
      </style>
      <div class="hub-wrap">
        <div class="hub-title">Upload</div>
        <div class="hub-subtitle">Choose what to upload</div>
        <div class="hub-grid">
          <a class="hub-btn" href="${CFG.pages.uploadBlog}">
            <div class="hub-icon"></div><div class="hub-label">בלאג פאסט</div>
          </a>
          <a class="hub-btn" href="${CFG.pages.uploadPosters}">
            <div class="hub-icon"></div><div class="hub-label">מודעות</div>
          </a>
          <a class="hub-btn" href="${CFG.pages.uploadEvents}">
            <div class="hub-icon"></div><div class="hub-label">מעמדים</div>
          </a>
          <a class="hub-btn" href="${CFG.pages.uploadVideos}">
            <div class="hub-icon"></div><div class="hub-label">ווידיאוס</div>
          </a>
          <a class="hub-btn" href="${CFG.pages.uploadPdfs}">
            <div class="hub-icon"></div><div class="hub-label">גליונות</div>
          </a>
        </div>
      </div>
    `;
  }
}


// ── REGISTER ALL ELEMENTS ─────────────────────────────────────────
customElements.define('moisdes-upload-blog',    MoisdesUploadBlog);
customElements.define('moisdes-upload-posters', MoisdesUploadPosters);
customElements.define('moisdes-upload-events',  MoisdesUploadEvents);
customElements.define('moisdes-upload-videos',  MoisdesUploadVideos);
customElements.define('moisdes-upload-pdfs',    MoisdesUploadPdfs);
customElements.define('moisdes-upload-hub',     MoisdesUploadHub);
