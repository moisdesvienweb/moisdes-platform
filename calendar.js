// ================================================================
// MOISDES — קהילה לוח (COMMUNITY CALENDAR)
// calendar.js — Google-Calendar-style month grid + a continuous,
// scrollable agenda list (all events, grouped by day, positioned at
// today on load — scroll down for later events, up for earlier ones).
// The grid renders immediately with no event data so the page feels
// instant; events fill in (grid pills + agenda) once the fetch lands.
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
  const MAX_PILLS = 2;

  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const today = new Date();
  const todayIso = isoOf(today);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let eventsByDay = {};
  let eventsLoaded = false;

  agendaEl.innerHTML = '<p class="state-msg">לאדט געשעענישן...</p>';

  function hebrewMonthLabel() {
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const h1 = hebrew.isoToHebrew(`${viewYear}-${pad(viewMonth + 1)}-01`);
    const h2 = hebrew.isoToHebrew(`${viewYear}-${pad(viewMonth + 1)}-${pad(lastDay)}`);
    const label1 = `${h1.monthName} ${hebrew.yearToHebrew(h1.year)}`;
    const label2 = `${h2.monthName} ${hebrew.yearToHebrew(h2.year)}`;
    return label1 === label2 ? label1 : `${label1} — ${label2}`;
  }

  function renderGrid() {
    labelEl.innerHTML = `${MONTH_NAMES[viewMonth]} ${viewYear}<div class="calendar-month-heb">${util.eh(hebrewMonthLabel())}</div>`;
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
      const dayEvents = eventsByDay[dayIso] || [];
      const hebDay = hebrew.isoToHebrew(dayIso);

      let eventsHtml = '';
      if (dayEvents.length) {
        const shown = dayEvents.slice(0, MAX_PILLS).map((ev) => `<span class="cal-event-pill">${util.eh(ev.summary)}</span>`).join('');
        const more = dayEvents.length > MAX_PILLS ? `<span class="cal-event-more">+${dayEvents.length - MAX_PILLS}</span>` : '';
        eventsHtml = `<div class="cal-events">${shown}${more}</div>`;
      } else if (!eventsLoaded) {
        eventsHtml = '';
      }

      cell.innerHTML = `
        <div class="cal-day-top">
          <span class="cal-daynum">${d.getDate()}</span>
          <span class="cal-hebday">${util.eh(hebrew.dayToHebrew(hebDay.day))}</span>
        </div>
        ${eventsHtml}
      `;
      cell.addEventListener('click', () => {
        const heading = agendaEl.querySelector(`[data-day="${dayIso}"]`);
        if (heading) heading.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      gridEl.appendChild(cell);
    });
  }

  function renderAgenda() {
    const days = Object.keys(eventsByDay).sort();
    if (!days.length) {
      agendaEl.innerHTML = '<p class="state-msg">נאך קיין געשעענישן אין קאלענדאר</p>';
      return;
    }
    agendaEl.innerHTML = '';
    let scrollTarget = null;
    days.forEach((dayIso) => {
      const heading = document.createElement('h4');
      heading.className = 'agenda-day-heading';
      heading.dataset.day = dayIso;
      heading.textContent = hebrew.isoToHebrewString(dayIso);
      if (dayIso === todayIso) heading.classList.add('is-today');
      if (dayIso >= todayIso && !scrollTarget) scrollTarget = heading;
      agendaEl.appendChild(heading);

      eventsByDay[dayIso].slice().sort((a, b) => a.start.localeCompare(b.start)).forEach((ev) => {
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
    });
    if (scrollTarget) scrollTarget.scrollIntoView({ block: 'start' });
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

  try {
    const { events } = await api.get('/api/gcal-events');
    events.forEach((ev) => {
      (eventsByDay[ev.date] = eventsByDay[ev.date] || []).push(ev);
    });
    eventsLoaded = true;
    renderGrid();
    renderAgenda();
  } catch (e) {
    eventsLoaded = true;
    agendaEl.innerHTML = `<p class="state-msg">${util.eh(e.message || 'נישט געקענט לאדן דעם קאלענדאר')}</p>`;
  }
})();
