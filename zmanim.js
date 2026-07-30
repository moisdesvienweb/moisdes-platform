// ================================================================
// MOISDES — ZMANIM ENGINE
// zmanim.js
// Sunrise/sunset via the standard NOAA-based solar position formulas
// (the same approach used by most zmanim calendars/libraries — accurate
// to roughly a minute). Sof Zman Shema/Tfilah are given in both the
// Magen Avraham (day = alos 72 to tzeis 72, earlier) and Gra (day =
// sunrise to sunset, later) opinions, per the site's standing convention.
// ================================================================

window.MOISDES = window.MOISDES || {};

window.MOISDES.zmanim = (function () {
  const rad = Math.PI / 180;
  const dayMs = 1000 * 60 * 60 * 24;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const e = rad * 23.4397; // obliquity of the Earth

  const sin = Math.sin, cos = Math.cos, tan = Math.tan, asin = Math.asin, acos = Math.acos, atan2 = Math.atan2;

  function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
  function fromJulian(j) { return new Date((j + 0.5 - J1970) * dayMs); }
  function toDays(date) { return toJulian(date) - J2000; }

  function rightAscension(l, b) { return atan2(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
  function declination(l, b) { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }
  function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
  function eclipticLongitude(M) {
    const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M));
    const P = rad * 102.9372;
    return M + C + P + Math.PI;
  }
  function julianCycle(d, lw) { return Math.round(d - 0.0009 - lw / (2 * Math.PI)); }
  function approxTransit(Ht, lw, n) { return 0.0009 + (Ht + lw) / (2 * Math.PI) + n; }
  function solarTransitJ(ds, M, L) { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }
  function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }
  function getSetJ(h, lw, phi, dec, n, M, L) {
    const w = hourAngle(h, phi, dec);
    const a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
  }

  // Returns { sunrise, sunset, solarNoon } as JS Date objects for the
  // given calendar date (local calendar day) at (lat, lon).
  function getSunTimes(date, lat, lon) {
    const lw = rad * -lon, phi = rad * lat;
    const d = toDays(date), n = julianCycle(d, lw), ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L, 0);
    const Jnoon = solarTransitJ(ds, M, L);
    const h0 = (-0.833) * rad;
    const Jset = getSetJ(h0, lw, phi, dec, n, M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset), solarNoon: fromJulian(Jnoon) };
  }

  function addMinutes(date, mins) { return new Date(date.getTime() + mins * 60000); }

  // Local calendar date as "YYYY-MM-DD" — deliberately NOT
  // date.toISOString().slice(0,10), which converts to UTC and rolls to
  // the next calendar day during evening hours in negative-UTC-offset
  // timezones (most of the US), well before local midnight.
  function localIso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // Full zmanim set for one calendar date, fixed-72-minute method for
  // alos/tzeis (matches Tzeis 60/72 below), Gra day = sunrise-sunset.
  function computeZmanim(date, lat, lon) {
    const { sunrise, sunset, solarNoon } = getSunTimes(date, lat, lon);
    const alos = addMinutes(sunrise, -72);
    const tzeis72 = addMinutes(sunset, 72);
    const shaaGra = (sunset - sunrise) / 12;
    const shaaMA = (tzeis72 - alos) / 12;
    return {
      sunrise,
      sunset,
      chatzos: solarNoon,
      sofZmanShemaEarly: new Date(alos.getTime() + 3 * shaaMA),
      sofZmanShemaLate: new Date(sunrise.getTime() + 3 * shaaGra),
      sofZmanTfilahEarly: new Date(alos.getTime() + 4 * shaaMA),
      sofZmanTfilahLate: new Date(sunrise.getTime() + 4 * shaaGra),
      tzeis60: addMinutes(sunset, 60),
      tzeis72,
    };
  }

  function fmtTime(d) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  // Current Hebrew calendar date the halachic way: the day rolls over at
  // shkia+72 (not midnight), and shows an "אור ליום" prefix from that
  // rollover until the next sunrise.
  function currentHebrewDateDisplay(lat, lon) {
    const hebrew = window.MOISDES.hebrew;
    const now = new Date();
    const todayIso = localIso(now);
    const tToday = getSunTimes(now, lat, lon);
    const rollover = addMinutes(tToday.sunset, 72);

    if (now < rollover) {
      return { text: hebrew.isoToHebrewString(todayIso), ohrLyom: false, effectiveIso: todayIso };
    }
    const tomorrow = new Date(now.getTime() + dayMs);
    const tomorrowIso = localIso(tomorrow);
    const tTomorrow = getSunTimes(tomorrow, lat, lon);
    const stillBeforeSunrise = now < tTomorrow.sunrise;
    const label = hebrew.isoToHebrewString(tomorrowIso);
    return { text: stillBeforeSunrise ? `אור ליום ${label}` : label, ohrLyom: stillBeforeSunrise, effectiveIso: tomorrowIso };
  }

  const BROOKLYN = { lat: 40.6782, lon: -73.9442, label: 'Brooklyn, NY' };

  // Geolocates with a Brooklyn fallback; always calls back with a small
  // "which location" label so the displayed times are never unexplained.
  // The label starts as coordinates (immediate) and upgrades to a city
  // name via reverse geocoding when that resolves.
  function withLocation(cb) {
    if (!navigator.geolocation) return cb(BROOKLYN);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        const loc = { lat, lon, label: `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
        cb(loc);
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
          .then((r) => r.json())
          .then((data) => {
            const name = [data.city || data.locality, data.principalSubdivision].filter(Boolean).join(', ');
            if (name) cb({ lat, lon, label: name });
          })
          .catch(() => {});
      },
      () => cb(BROOKLYN),
      { timeout: 5000 }
    );
  }

  return { getSunTimes, computeZmanim, fmtTime, currentHebrewDateDisplay, withLocation, localIso, BROOKLYN };
})();
