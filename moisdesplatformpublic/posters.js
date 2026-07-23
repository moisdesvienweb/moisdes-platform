// ================================================================
// MOISDES — POSTERS PAGE
// posters.js — grouped by Hebrew year, then by parsha.
// ================================================================

(async function () {
  const api = window.MOISDES.api;
  const util = window.MOISDES.util;
  const hebrew = window.MOISDES.hebrew;
  const list = document.getElementById('posters-list');

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  document.getElementById('lightbox-close').addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.classList.remove('open'); });

  try {
    const { posters } = await api.get('/api/posters');
    if (!posters.length) {
      list.innerHTML = '<p class="state-msg">נאך קיין מודעות נישט פארעפנטליכט</p>';
      return;
    }

    const sorted = [...posters].sort((a, b) => util.dateDesc(a.date, b.date));

    // Group by Hebrew year, then by parsha, preserving first-seen order.
    const years = new Map();
    for (const poster of sorted) {
      const hebYear = hebrew.isoToHebrew(poster.date).year;
      if (!years.has(hebYear)) years.set(hebYear, new Map());
      const parshaMap = years.get(hebYear);
      const parsha = poster.parsha || 'אנדערש';
      if (!parshaMap.has(parsha)) parshaMap.set(parsha, []);
      parshaMap.get(parsha).push(poster);
    }

    list.innerHTML = '';
    for (const [year, parshaMap] of years) {
      const yearHeading = document.createElement('h2');
      yearHeading.className = 'year-heading';
      yearHeading.textContent = hebrew.yearToHebrew(year);
      list.appendChild(yearHeading);

      for (const [parsha, items] of parshaMap) {
        const parshaHeading = document.createElement('h3');
        parshaHeading.className = 'parsha-heading';
        parshaHeading.textContent = 'פרשת ' + parsha;
        list.appendChild(parshaHeading);

        const grid = document.createElement('div');
        grid.className = 'grid';
        for (const poster of items) {
          const img = await api.firstImageUrl(poster.folder_url);
          const card = document.createElement('div');
          card.className = 'card';
          card.id = `poster-${poster.id}`;
          card.innerHTML = `<div class="card-media">${img ? `<img src="${util.eh(img)}" alt="" style="cursor:zoom-in">` : ''}</div>`;
          if (img) {
            card.querySelector('img').addEventListener('click', () => {
              lightboxImg.src = img;
              lightbox.classList.add('open');
            });
          }
          grid.appendChild(card);
        }
        list.appendChild(grid);
      }
    }

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
  } catch (e) {
    list.innerHTML = '<p class="state-msg">נישט געקענט לאדן</p>';
  }
})();
