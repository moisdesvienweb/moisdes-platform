// ================================================================
// MOISDES — קהילה לוח (COMMUNITY CALENDAR)
// calendar.js — full month-grid view, synced from the community
// Google Calendar. Click a day to see its events below the grid.
// ================================================================

(async function () {
  const api = window.MOISDES.api;
  const util = window.MOISDES.util;
  const hebrew = window.MOISDES.hebrew;
  const gridEl = document.getElementById('calendar-grid');
  const labelEl = document.getElementById('calendar-month-label');
  const prevBtn = document.getElementById('calendar-prev');
  const nextBtn = document.getElementById('calendar-next');
  const agendaEl = document.getElementById('calendar-agenda');
  const reportBtn = document.getElementById('report-simcha-btn');
  const gcalBtn = document.getElementById('gcal-add-btn');

  const slug = window.MOISDES.CFG.simchaFormSlug;
  if (slug) {
    api.get(`/api/forms/${slug}/public`).then(() => {
      reportBtn.href = `/form/${slug}`;
      reportBtn.style.display = '';
    }).catch(() => {});
  }

  api.get('/api/gcal-subscribe-url').then(({ url }) => {
    gcalBtn.href = url;
    gcalBtn.style.display = '';
  }).catch(() => {});

  const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const MONTH_NAMES = ['ינואר', 'פעברואר', 'מארץ', 'אפריל', 'מיי', 'יוני', 'יולי', 'אויגוסט', 'סעפטעמבער', 'אקטאבער', 'נאוועמבער', 'דעצעמבער'];

  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let eventsByDay = {};
  try {
    const { events } = await api.get('/api/gcal-events');
    events.forEach((ev) => {
      const day = ev.start.slice(0, 10);
      (eventsByDay[day] = eventsByDay[day] || []).push(ev);
    });
  } catch (e) {
    agendaEl.innerHTML = `<p class="state-msg">${util.eh(e.message || 'נישט געקענט לאדן דעם קאלענדאר')}</p>`;
  }

  const today = new Date();
  const todayIso = isoOf(today);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDay = todayIso;

  function renderAgenda(dayIso) {
    const list = (eventsByDay[dayIso] || []).slice().sort((a, b) => a.start.localeCompare(b.start));
    agendaEl.innerHTML = `<h3 class="parsha-heading">${util.eh(hebrew.isoToHebrewString(dayIso))}</h3>`;
    if (!list.length) {
      agendaEl.innerHTML += '<p class="state-msg">קיין געשעענישן נישט אין דעם טאג</p>';
      return;
    }
    list.forEach((ev) => {
      const time = ev.allDay ? '' : new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const row = document.createElement('div');
      row.className = 'search-result';
      row.innerHTML = `
        <div class="search-result-title">${util.eh(ev.summary)}${time ? ' · ' + time : ''}</div>
        ${ev.location ? `<div class="search-result-meta">${util.eh(ev.location)}</div>` : ''}
        ${ev.description ? `<div class="search-result-excerpt">${util.eh(ev.description)}</div>` : ''}
      `;
      agendaEl.appendChild(row);
    });
  }

  function renderGrid() {
    labelEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    gridEl.innerHTML = '';
    WEEKDAYS.forEach((w) => {
      const cell = document.createElement('div');
      cell.className = 'cal-weekday';
      cell.textContent = w;
      gridEl.appendChild(cell);
    });

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const dayCells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      dayCells.push(d);
    }
    while (dayCells.length > 35 && dayCells.slice(-7).every((d) => d.getMonth() !== viewMonth)) {
      dayCells.splice(-7, 7);
    }

    dayCells.forEach((d) => {
      const dayIso = isoOf(d);
      const otherMonth = d.getMonth() !== viewMonth;
      const cell = document.createElement('div');
      cell.className = 'cal-day' + (otherMonth ? ' other-month' : '');
      if (dayIso === todayIso) cell.classList.add('is-today');
      if (dayIso === selectedDay) cell.classList.add('is-selected');
      const dayEvents = eventsByDay[dayIso] || [];
      const hebDay = hebrew.isoToHebrew(dayIso);
      cell.innerHTML = `
        <span class="cal-daynum">${d.getDate()}</span>
        <span class="cal-hebday">${util.eh(hebrew.dayToHebrew(hebDay.day))}</span>
        ${dayEvents.length ? '<span class="cal-dot"></span>' : ''}
      `;
      cell.addEventListener('click', () => {
        selectedDay = dayIso;
        renderGrid();
        renderAgenda(dayIso);
      });
      gridEl.appendChild(cell);
    });
  }

  prevBtn.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderGrid();
  });
  nextBtn.addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderGrid();
  });

  renderGrid();
  renderAgenda(selectedDay);
})();
