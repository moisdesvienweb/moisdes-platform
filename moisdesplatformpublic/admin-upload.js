// ================================================================
// MOISDES ADMIN — Upload panel (also powers the Browse & Edit modal)
// admin-upload.js
// ================================================================

window.MOISDES = window.MOISDES || {};

window.MOISDES.adminUpload = (function () {
  const api = window.MOISDES.api;
  const AF = window.MOISDES.adminFields;
  const CFG = window.MOISDES.CFG;

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function fieldGroup(labelText, inputEl) {
    const g = el('div', 'field-group');
    g.appendChild(el('label', '', labelText));
    g.appendChild(inputEl);
    return g;
  }
  function textInput(placeholder, value) {
    const i = el('input');
    i.type = 'text';
    if (placeholder) i.placeholder = placeholder;
    if (value) i.value = value;
    return i;
  }
  function textarea(placeholder, value) {
    const t = el('textarea');
    if (placeholder) t.placeholder = placeholder;
    if (value) t.value = value;
    return t;
  }
  function statusEl() { return el('div', 'status-msg'); }
  function setStatus(node, message, ok) {
    node.textContent = message;
    node.className = 'status-msg' + (ok === true ? ' ok' : ok === false ? ' err' : '');
  }

  function parshaSelect(value) {
    const s = el('select');
    (CFG.parshiyot || []).forEach((p) => {
      const name = CFG.combined[p] || p;
      const o = el('option', '', name);
      o.value = name;
      if (name === value) o.selected = true;
      s.appendChild(o);
    });
    return s;
  }

  // ── FORM BUILDER — shared by "Upload" (create) and "Browse & Edit" (edit) ──
  //
  // opts: { existing, onSaved }
  //   existing: the record being edited (omit for create mode)
  //   onSaved:  called after a successful save (edit mode only)

  function buildForm(type, container, opts = {}) {
    const existing = opts.existing || null;
    const isEdit = !!existing;

    container.innerHTML = '';
    const form = el('form');
    const status = statusEl();

    const datePickerWrap = el('div');
    form.appendChild(fieldGroup('Date', datePickerWrap));
    const datePicker = AF.createDatePicker(datePickerWrap, existing ? existing.date : '');

    let getExtra;
    let gallery;
    let tagInput, categoryInput;

    if (type === 'posts') {
      const title = textInput('Title', existing?.title);
      form.appendChild(fieldGroup('Title', title));
      const body = textarea('Post text...', existing?.body);
      form.appendChild(fieldGroup('Text', body));

      const catWrap = el('div');
      form.appendChild(fieldGroup('Category', catWrap));
      categoryInput = AF.createCategoryInput(catWrap, existing?.category);

      const tagWrap = el('div');
      form.appendChild(fieldGroup('Tags', tagWrap));
      tagInput = AF.createTagInput(tagWrap, existing?.tags);

      const galleryWrap = el('div');
      form.appendChild(fieldGroup('Images', galleryWrap));
      gallery = AF.createGalleryUploader(galleryWrap, { accept: 'image/*', existingFolder: existing?.folder_url });

      getExtra = () => ({ title: title.value, body: body.value, category: categoryInput.getValue(), tags: tagInput.getValue() });

    } else if (type === 'posters') {
      const parshaWrap = el('div');
      const select = parshaSelect(existing?.parsha);
      parshaWrap.appendChild(select);
      form.appendChild(fieldGroup('Parsha', parshaWrap));

      const galleryWrap = el('div');
      form.appendChild(fieldGroup('Images', galleryWrap));
      gallery = AF.createGalleryUploader(galleryWrap, { accept: 'image/*', existingFolder: existing?.folder_url });

      getExtra = () => ({ parsha: select.value });

    } else if (type === 'events') {
      const title = textInput('Title', existing?.title);
      form.appendChild(fieldGroup('Title', title));
      const location = textInput('Location', existing?.location);
      form.appendChild(fieldGroup('Location', location));

      const catWrap = el('div');
      form.appendChild(fieldGroup('Category', catWrap));
      categoryInput = AF.createCategoryInput(catWrap, existing?.category);

      const description = textarea('Description', existing?.description);
      form.appendChild(fieldGroup('Description', description));

      const tagWrap = el('div');
      form.appendChild(fieldGroup('Tags', tagWrap));
      tagInput = AF.createTagInput(tagWrap, existing?.tags);

      const galleryWrap = el('div');
      form.appendChild(fieldGroup('Photos & audio', galleryWrap));
      gallery = AF.createGalleryUploader(galleryWrap, { existingFolder: existing?.folder_url });

      getExtra = () => ({ title: title.value, location: location.value, category: categoryInput.getValue(), description: description.value, tags: tagInput.getValue() });

    } else if (type === 'videos') {
      const title = textInput('Title', existing?.title);
      form.appendChild(fieldGroup('Title', title));
      const location = textInput('Location', existing?.location);
      form.appendChild(fieldGroup('Location', location));

      const catWrap = el('div');
      form.appendChild(fieldGroup('Category', catWrap));
      categoryInput = AF.createCategoryInput(catWrap, existing?.category);

      const description = textarea('Description', existing?.description);
      form.appendChild(fieldGroup('Description', description));

      const videoUrl = textInput('https://youtube.com/watch?v=...', existing?.video_url);
      form.appendChild(fieldGroup('YouTube URL', videoUrl));

      const tagWrap = el('div');
      form.appendChild(fieldGroup('Tags', tagWrap));
      tagInput = AF.createTagInput(tagWrap, existing?.tags);

      const galleryWrap = el('div');
      form.appendChild(fieldGroup('Extra images (optional)', galleryWrap));
      gallery = AF.createGalleryUploader(galleryWrap, { accept: 'image/*', existingFolder: existing?.folder_url });

      getExtra = () => ({ title: title.value, location: location.value, category: categoryInput.getValue(), description: description.value, video_url: videoUrl.value, tags: tagInput.getValue() });

    } else if (type === 'pdfs') {
      const title = textInput('Title', existing?.title);
      form.appendChild(fieldGroup('Title', title));

      const catWrap = el('div');
      form.appendChild(fieldGroup('Category', catWrap));
      categoryInput = AF.createCategoryInput(catWrap, existing?.category);

      const language = textInput('e.g. Yiddish / Hebrew / English', existing?.language);
      form.appendChild(fieldGroup('Language', language));

      const parshaWrap = el('div');
      const select = parshaSelect(existing?.parsha);
      parshaWrap.appendChild(select);
      form.appendChild(fieldGroup('Parsha', parshaWrap));

      const year = textInput('Issue year / number', existing?.year);
      form.appendChild(fieldGroup('Year', year));

      const pdfNote = existing?.pdf_url ? el('div', 'state-msg', `Current file: ${existing.pdf_url.split('/').pop()}`) : null;
      if (pdfNote) form.appendChild(pdfNote);
      const pdfFileWrap = el('div');
      const pdfFileInput = el('input');
      pdfFileInput.type = 'file';
      pdfFileInput.accept = 'application/pdf';
      pdfFileWrap.appendChild(pdfFileInput);
      form.appendChild(fieldGroup(isEdit ? 'Replace PDF file (optional)' : 'PDF file', pdfFileWrap));

      const thumbNote = existing?.thumb_url ? el('div', 'state-msg', `Current thumbnail: ${existing.thumb_url.split('/').pop()}`) : null;
      if (thumbNote) form.appendChild(thumbNote);
      const thumbWrap = el('div');
      const thumbInput = el('input');
      thumbInput.type = 'file';
      thumbInput.accept = 'image/*';
      thumbWrap.appendChild(thumbInput);
      form.appendChild(fieldGroup(isEdit ? 'Replace thumbnail (optional)' : 'Cover thumbnail', thumbWrap));

      getExtra = () => ({ title: title.value, category: categoryInput.getValue(), language: language.value, parsha: select.value, year: year.value });

      form._pdfFileInput = pdfFileInput;
      form._thumbInput = thumbInput;
    }

    const submitBtn = el('button', 'btn btn-primary', isEdit ? 'Save changes' : 'Publish');
    submitBtn.type = 'submit';
    form.appendChild(submitBtn);
    form.appendChild(status);
    container.appendChild(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      setStatus(status, 'Saving…');

      try {
        const date = datePicker.getIso();
        if (!date) throw new Error('Please choose a date.');
        const payload = { date, ...getExtra() };

        if (type === 'pdfs') {
          const pdfFile = form._pdfFileInput.files[0];
          const thumbFile = form._thumbInput.files[0];
          if (!isEdit && !pdfFile) throw new Error('Please choose a PDF file.');
          if (pdfFile) {
            const pdfKey = `pdfs/${Date.now()}-${AF.sanitizeFilename(pdfFile.name)}`;
            await api.uploadFile(pdfKey, pdfFile);
            payload.pdf_url = pdfKey;
          } else if (isEdit) {
            payload.pdf_url = existing.pdf_url || '';
          }
          if (thumbFile) {
            const thumbKey = `pdfs/${Date.now()}-thumb-${AF.sanitizeFilename(thumbFile.name)}`;
            await api.uploadFile(thumbKey, thumbFile);
            payload.thumb_url = thumbKey;
          } else if (isEdit) {
            payload.thumb_url = existing.thumb_url || '';
          }
        } else if (gallery) {
          const prefix = existing?.folder_url || `${type}/${Date.now()}`;
          const folder = await gallery.upload(prefix);
          payload.folder_url = folder || existing?.folder_url || '';
        }

        if (isEdit) {
          await api.put(`/api/${type}/${existing.id}`, payload);
          setStatus(status, 'Saved.', true);
          if (opts.onSaved) opts.onSaved();
        } else {
          await api.post(`/api/${type}`, payload);
          setStatus(status, 'Published successfully.', true);
          buildForm(type, container); // fresh form for the next entry
        }
      } catch (err) {
        setStatus(status, err.message || 'Something went wrong.', false);
        submitBtn.disabled = false;
      }
    });
  }

  return { buildForm };
})();
