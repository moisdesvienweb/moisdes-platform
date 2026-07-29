// ================================================================
// MOISDES — VIDEO PAGE
// video.js
// ================================================================

(function () {
  window.MOISDES.util.youtubeId = function (url) {
    if (!url) return null;
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  };
})();

(async function () {
  const api = window.MOISDES.api;
  const util = window.MOISDES.util;
  const hebrew = window.MOISDES.hebrew;
  const grid = document.getElementById('video-grid');
  const bannerEl = document.getElementById('tag-filter-banner');

  const params = new URLSearchParams(location.search);
  const activeTag = params.get('tag');

  function tagPill(tag) {
    const a = document.createElement('a');
    a.className = 'tag-pill';
    a.textContent = tag;
    a.href = `/search/?tag=${encodeURIComponent(tag)}`;
    return a;
  }

  if (activeTag) {
    bannerEl.innerHTML = `<div class="tag-filter-banner">מציג רעזולטאטן פארן טאג: <strong>${util.eh(activeTag)}</strong> · <a href="/video">מעק אויס</a></div>`;
  }

  try {
    const { videos } = await api.get('/api/videos');
    const filtered = activeTag
      ? videos.filter((v) => (v.tags || '').split(',').map((t) => t.trim()).includes(activeTag))
      : videos;

    if (!filtered.length) {
      grid.innerHTML = '<p class="state-msg">נאך קיין ווידיאוס נישט פארעפנטליכט</p>';
      return;
    }
    const sorted = [...filtered].sort((a, b) => util.dateDesc(a.date, b.date));
    grid.innerHTML = '';
    grid.classList.add('video-grid');

    for (const v of sorted) {
      const ytId = util.youtubeId(v.video_url);
      // A directly-hosted file plays with a plain <video> tag — no
      // YouTube branding — and takes priority over the YouTube embed.
      const videoEmbed = v.video_file_url
        ? `<video class="video-embed-native" controls src="${util.eh(api.r2Url(v.video_file_url))}"></video>`
        : (ytId ? `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0" allowfullscreen loading="lazy"></iframe></div>` : '');
      const card = document.createElement('div');
      card.className = 'card video-card-item';
      card.id = `video-${v.id}`;
      card.innerHTML = `
        ${videoEmbed}
        <div class="event-meta">${hebrew.isoToHebrewString(v.date)}${v.location ? ' · ' + util.eh(v.location) : ''}${v.category ? ' · ' + util.eh(v.category) : ''}</div>
        <h2 class="video-title">${util.eh(v.title)}</h2>
        <div class="event-desc">${util.eh(v.description || '')}</div>
        <div class="event-tags"></div>
      `;
      const tagsEl = card.querySelector('.event-tags');
      (v.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => tagsEl.appendChild(tagPill(t)));
      if (!tagsEl.children.length) tagsEl.remove();
      if (window.MOISDES.shareButton) {
        card.appendChild(window.MOISDES.shareButton(`${location.origin}/video#video-${v.id}`, v.title));
      }
      grid.appendChild(card);
    }

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
  } catch (e) {
    grid.innerHTML = '<p class="state-msg">נישט געקענט לאדן</p>';
  }
})();
