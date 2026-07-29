// ================================================================
// MOISDES — EVENTS PAGE
// events.js
// ================================================================

(async function () {
  const api = window.MOISDES.api;
  const util = window.MOISDES.util;
  const hebrew = window.MOISDES.hebrew;
  const list = document.getElementById('events-list');
  const bannerEl = document.getElementById('tag-filter-banner');

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

      const card = document.createElement('article');
      card.className = 'event-card';
      card.id = `event-${ev.id}`;

      const coverUrl = ev.thumb_url ? api.r2Url(ev.thumb_url) : (imageKeys[0] ? api.r2Url(imageKeys[0]) : null);
      if (coverUrl) {
        const cover = document.createElement('div');
        cover.className = 'event-cover';
        cover.style.backgroundImage = `url('${coverUrl}')`;
        card.appendChild(cover);
      }

      const body = document.createElement('div');
      body.innerHTML = `
        <div class="event-meta">${hebrew.isoToHebrewString(ev.date)}${ev.location ? ' · ' + util.eh(ev.location) : ''}${ev.category ? ' · ' + util.eh(ev.category) : ''}</div>
        <h2 class="event-title">${util.eh(ev.title)}</h2>
        <div class="event-desc">${util.eh(ev.description || '')}</div>
      `;
      card.appendChild(body);

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
        card.appendChild(player);
        play(0);
      }

      // Skip the image already shown as the cover (only relevant when
      // there's no dedicated thumbnail and the first photo doubled as one).
      const remainingImages = ev.thumb_url ? imageKeys : imageKeys.slice(1);
      if (remainingImages.length) {
        const stack = document.createElement('div');
        stack.className = 'stack';
        stack.style.marginTop = '1rem';
        remainingImages.forEach((key) => {
          const img = document.createElement('img');
          img.src = api.r2Url(key);
          img.alt = '';
          stack.appendChild(img);
        });
        card.appendChild(stack);
      }

      const tagsEl = document.createElement('div');
      tagsEl.className = 'event-tags';
      (ev.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
        tagsEl.appendChild(tagPill(t));
      });
      if (tagsEl.children.length) card.appendChild(tagsEl);

      if (window.MOISDES.shareButton) {
        const shareUrl = `${location.origin}/events#event-${ev.id}`;
        card.appendChild(window.MOISDES.shareButton(shareUrl, ev.title));
      }

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
