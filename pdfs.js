// ================================================================
// MOISDES — PDFS (גליונות) PAGE
// pdfs.js
// ================================================================

(async function () {
  const api = window.MOISDES.api;
  const util = window.MOISDES.util;
  const hebrew = window.MOISDES.hebrew;
  const grid = document.getElementById('pdfs-grid');
  const filtersEl = document.getElementById('pdfs-filters');

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  }

  function buildSelect(id, label, values) {
    const wrap = document.createElement('div');
    wrap.className = 'pdf-filter';
    const select = document.createElement('select');
    select.id = id;
    select.innerHTML = `<option value="">${util.eh(label)}</option>` +
      values.map((v) => `<option value="${util.eh(v)}">${util.eh(v)}</option>`).join('');
    wrap.appendChild(select);
    return { wrap, select };
  }

  function render(pdfs) {
    if (!pdfs.length) {
      grid.innerHTML = '<p class="state-msg">קיין רעזולטאטן</p>';
      return;
    }
    grid.innerHTML = '';
    pdfs.forEach((pdf, i) => {
      const card = document.createElement('a');
      card.href = pdf.pdf_url ? api.r2Url(pdf.pdf_url) : '#';
      card.target = '_blank';
      card.rel = 'noopener';
      card.className = 'card pdf-card';
      card.id = `pdf-${pdf.id}`;
      const metaParts = [pdf.parsha, pdf.language].filter(Boolean).join(' · ');
      card.innerHTML = `
        <div class="card-media">${pdf.thumb_url ? `<img src="${util.eh(api.r2Url(pdf.thumb_url))}" alt="">` : ''}</div>
        <div class="card-body">
          <div class="card-date">${hebrew.isoToHebrewString(pdf.date)}${i === 0 ? '<span class="badge-new">חדש</span>' : ''}</div>
          <div class="card-title pdf-title">${util.eh(pdf.title)}</div>
          ${metaParts ? `<div class="pdf-meta">${util.eh(metaParts)}</div>` : ''}
        </div>`;
      grid.appendChild(card);
    });
  }

  try {
    const { pdfs } = await api.get('/api/pdfs');
    const all = [...pdfs].sort((a, b) => util.dateDesc(a.date, b.date));
    if (!all.length) {
      grid.innerHTML = '<p class="state-msg">נאך קיין גליונות נישט פארעפנטליכט</p>';
      return;
    }

    const filters = {
      language: buildSelect('filter-language', 'אלע שפראכן', uniqueSorted(all.map((p) => p.language))),
      year: buildSelect('filter-year', 'אלע יארן', uniqueSorted(all.map((p) => p.year))),
      parsha: buildSelect('filter-parsha', 'אלע פרשיות', uniqueSorted(all.map((p) => p.parsha))),
      category: buildSelect('filter-category', 'אלע קאטעגאריעס', uniqueSorted(all.map((p) => p.category))),
    };
    Object.values(filters).forEach(({ wrap }) => filtersEl.appendChild(wrap));

    function applyFilters() {
      const active = Object.fromEntries(Object.entries(filters).map(([k, { select }]) => [k, select.value]));
      const filtered = all.filter((p) =>
        (!active.language || p.language === active.language) &&
        (!active.year || p.year === active.year) &&
        (!active.parsha || p.parsha === active.parsha) &&
        (!active.category || p.category === active.category)
      );
      render(filtered);
    }
    Object.values(filters).forEach(({ select }) => select.addEventListener('change', applyFilters));

    render(all);
  } catch (e) {
    grid.innerHTML = '<p class="state-msg">נישט געקענט לאדן</p>';
  }
})();
