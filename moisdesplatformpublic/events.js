// ================================================================
// MOISDES — EVENTS PAGE
// events.js
// ================================================================

(async function () {
  const api = window.MOISDES.api;
  const util = window.MOISDES.util;
  const hebrew = window.MOISDES.hebrew;
  const list = document.getElementById('events-list');

  const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a'];
  function isAudio(key) { return AUDIO_EXT.includes(key.split('.').pop().toLowerCase()); }

  try {
    const { events } = await api.get('/api/events');
    if (!events.length) {
      list.innerHTML = '<p class="state-msg">נאך קיין מעמדים נישט פארעפנטליכט</p>';
      return;
    }
    const sorted = [...events].sort((a, b) => util.dateDesc(a.date, b.date));
    list.innerHTML = '';

    for (const ev of sorted) {
      const keys = await api.listFolder(ev.folder_url).catch(() => []);
      const audioKeys = keys.filter(isAudio);
      const imageKeys = keys.filter((k) => !isAudio(k));

      const card = document.createElement('article');
      card.className = 'event-card';
      card.id = `event-${ev.id}`;
      card.innerHTML = `
        <div class="event-meta">${hebrew.isoToHebrewString(ev.date)}${ev.location ? ' · ' + util.eh(ev.location) : ''}${ev.category ? ' · ' + util.eh(ev.category) : ''}</div>
        <h2 class="event-title">${util.eh(ev.title)}</h2>
        <div class="event-desc">${util.eh(ev.description || '')}</div>
      `;

      for (const key of audioKeys) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = api.r2Url(key);
        card.appendChild(audio);
      }

      if (imageKeys.length) {
        const grid = document.createElement('div');
        grid.className = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4,1fr)';
        grid.style.marginTop = '1rem';
        imageKeys.forEach((key) => {
          const thumb = document.createElement('div');
          thumb.className = 'card-media';
          thumb.innerHTML = `<img src="${util.eh(api.r2Url(key))}" alt="">`;
          grid.appendChild(thumb);
        });
        card.appendChild(grid);
      }

      const tagsEl = document.createElement('div');
      tagsEl.className = 'event-tags';
      (ev.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.textContent = t;
        tagsEl.appendChild(pill);
      });
      if (tagsEl.children.length) card.appendChild(tagsEl);

      list.appendChild(card);
    }

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
  } catch (e) {
    list.innerHTML = '<p class="state-msg">נישט געקענט לאדן</p>';
  }
})();
