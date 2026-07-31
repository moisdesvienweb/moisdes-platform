// ================================================================
// MOISDES — EVENTS PAGE
// events.js — compact cards in the grid; clicking one opens a modal
// with the full details (description, photo gallery, audio playlist,
// address linked to Google Maps + Waze, share button).
// ================================================================

(async function () {
  const api = window.MOISDES.api;
  const util = window.MOISDES.util;
  const hebrew = window.MOISDES.hebrew;
  const list = document.getElementById('events-list');
  const bannerEl = document.getElementById('tag-filter-banner');
  const modal = document.getElementById('event-modal');
  const modalBody = document.getElementById('event-modal-body');
  const modalClose = document.getElementById('event-modal-close');

  const params = new URLSearchParams(location.search);
  const activeTag = params.get('tag');

  const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'wma', 'amr', 'caf', '3gp', '3gpp', 'weba', 'mp4'];
  function isAudio(key) { return AUDIO_EXT.includes(key.split('.').pop().toLowerCase()); }

  function tagPill(tag) {
    const a = document.createElement('a');
    a.className = 'tag-pill';
    a.textContent = tag;
    a.href = `/search/?tag=${encodeURIComponent(tag)}`;
    return a;
  }

  // ── LIGHTBOX (image gallery zoom, reused inside the modal) ────────
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  let currentGallery = [];
  let currentIndex = 0;
  function openLightbox(gallery, index) {
    currentGallery = gallery;
    currentIndex = index;
    lightboxImg.src = gallery[index];
    lightbox.classList.add('open');
  }
  function closeLightbox() { lightbox.classList.remove('open'); }
  function step(delta) {
    if (!currentGallery.length) return;
    currentIndex = (currentIndex + delta + currentGallery.length) % currentGallery.length;
    lightboxImg.src = currentGallery[currentIndex];
  }
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', () => step(-1));
  document.getElementById('lightbox-next').addEventListener('click', () => step(1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  // ── EVENT DETAIL MODAL ────────────────────────────────────────────
  function closeModal() { modal.classList.remove('open'); modalBody.innerHTML = ''; }
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lightbox.classList.contains('open')) closeLightbox();
    else if (modal.classList.contains('open')) closeModal();
  });

  function openEventModal(ev, coverUrl, audioKeys, imageKeys) {
    modalBody.innerHTML = `
      ${coverUrl ? `<div class="event-modal-cover" style="background-image:url('${util.eh(coverUrl)}')"></div>` : ''}
      <div class="event-meta">${hebrew.isoToHebrewString(ev.date)}${ev.category ? ' · ' + util.eh(ev.category) : ''}</div>
      <h2 class="event-title" style="margin-bottom:.6rem">${util.eh(ev.title)}</h2>
      <div class="detail-top-row">
        <div class="event-tags" data-tags></div>
        <div data-share></div>
      </div>
      ${ev.location ? `<div class="event-meta">${util.eh(ev.location)}</div>` : ''}
      <div class="detail-body">${util.eh(ev.description || '')}</div>
      <div data-player></div>
      <div class="stack" data-gallery style="margin-top:1rem"></div>
    `;

    if (audioKeys.length) {
      const trackName = (key) => key.split('/').pop().replace(/^\d{4}-/, '').replace(/\.[^.]+$/, '');
      const player = document.createElement('div');
      player.className = 'playlist-player';
      const nowPlaying = document.createElement('div');
      nowPlaying.className = 'track-name';
      const audioWrap = document.createElement('div');
      audioWrap.className = 'playlist-audio-wrap';
      const audio = document.createElement('audio');
      audio.controls = true;
      audioWrap.appendChild(audio);
      const trackList = document.createElement('ul');
      trackList.className = 'playlist-tracks';

      let index = 0;
      function play(i) {
        index = (i + audioKeys.length) % audioKeys.length;
        audio.src = api.r2Url(audioKeys[index]);
        nowPlaying.textContent = `${index + 1}. ${trackName(audioKeys[index])}`;
        trackList.querySelectorAll('li').forEach((li, n) => li.classList.toggle('playing', n === index));
      }
      audioKeys.forEach((key, i) => {
        const li = document.createElement('li');
        const num = document.createElement('span');
        num.className = 'track-num';
        num.textContent = i + 1;
        const name = document.createElement('span');
        name.className = 'track-label';
        name.textContent = trackName(key);
        li.appendChild(num);
        li.appendChild(name);
        li.addEventListener('click', () => play(i));
        trackList.appendChild(li);
      });
      audio.addEventListener('ended', () => { if (index < audioKeys.length - 1) play(index + 1); });

      player.appendChild(nowPlaying);
      player.appendChild(audioWrap);
      if (audioKeys.length > 1) player.appendChild(trackList);
      modalBody.querySelector('[data-player]').replaceWith(player);
      play(0);
    } else {
      modalBody.querySelector('[data-player]').remove();
    }

    const galleryEl = modalBody.querySelector('[data-gallery]');
    const remainingImages = ev.thumb_url ? imageKeys : imageKeys.slice(1);
    if (remainingImages.length) {
      const gallery = remainingImages.map((k) => api.r2Url(k));
      gallery.forEach((url, i) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.addEventListener('click', () => openLightbox(gallery, i));
        galleryEl.appendChild(img);
      });
    } else {
      galleryEl.remove();
    }

    const tagsEl = modalBody.querySelector('[data-tags]');
    (ev.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => tagsEl.appendChild(tagPill(t)));
    if (!tagsEl.children.length) tagsEl.remove();

    if (window.MOISDES.shareButton) {
      modalBody.querySelector('[data-share]').appendChild(
        window.MOISDES.shareButton(`${location.origin}/events#event-${ev.id}`, ev.title)
      );
    }

    modal.classList.add('open');
  }

  if (activeTag) {
    bannerEl.innerHTML = `<div class="tag-filter-banner">מציג רעזולטאטן פארן טאג: <strong>${util.eh(activeTag)}</strong> · <a href="/events">מעק אויס</a></div>`;
  }

  try {
    const { events } = await api.get('/api/events');
    const filtered = activeTag
      ? events.filter((e) => (e.tags || '').split(',').map((t) => t.trim()).includes(activeTag))
      : events;

    if (!filtered.length) {
      list.innerHTML = '<p class="state-msg">נאך קיין מעמדים נישט פארעפנטליכט</p>';
      return;
    }
    const sorted = [...filtered].sort((a, b) => util.dateDesc(a.date, b.date));
    list.innerHTML = '';
    list.classList.add('events-grid');

    for (const ev of sorted) {
      const keys = await api.listFolder(ev.folder_url).catch(() => []);
      const audioKeys = keys.filter(isAudio);
      const imageKeys = keys.filter((k) => !isAudio(k));
      const coverUrl = ev.thumb_url ? api.r2Url(ev.thumb_url) : (imageKeys[0] ? api.r2Url(imageKeys[0]) : null);

      const card = document.createElement('article');
      card.className = 'card event-card-compact';
      card.id = `event-${ev.id}`;
      card.innerHTML = `
        <div class="card-media">${coverUrl ? `<img src="${util.eh(coverUrl)}" alt="">` : ''}</div>
        <div class="card-body">
          <div class="card-date">${hebrew.isoToHebrewString(ev.date)}${ev.location ? ' · ' + util.eh(ev.location) : ''}</div>
          <div class="card-title">${util.eh(ev.title)}</div>
        </div>
      `;
      card.addEventListener('click', () => openEventModal(ev, coverUrl, audioKeys, imageKeys));
      list.appendChild(card);
    }

    if (location.hash) {
      const id = location.hash.slice(1);
      const target = document.getElementById(id);
      if (target) target.click();
    }
  } catch (e) {
    list.innerHTML = '<p class="state-msg">נישט געקענט לאדן</p>';
  }
})();
