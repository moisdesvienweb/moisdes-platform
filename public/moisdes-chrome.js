// ================================================================
// MOISDES — SHARED HEADER & FOOTER
// moisdes-chrome.js
// ================================================================

(function() {

  const LOGO = 'https://drive.google.com/uc?id=1Gu1AHcbqsG8KNMeCobFIQQn0VBcKTMPt';

  const NAV = [
    { label: 'הויפט בלאט', href: '/'             },
    { label: 'בילדער',     href: '/blog'          },
    { label: 'מודעות',     href: '/posters'       },
    { label: 'מעמדים',     href: '/events'        },
    { label: 'ווידיאו',    href: '/video'         },
    { label: 'גליונות',    href: '/pdfs'          },
  ];

  // ── STYLES ─────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Heebo', sans-serif;
      color: #fff;
      background: transparent;
      min-height: 100vh;
      direction: rtl;
    }

    /* ── HEADER ── */
    #moisdes-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .header-inner {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 48px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }

    .header-logo {
      display: flex;
      align-items: center;
      text-decoration: none;
      flex-shrink: 0;
    }

    .header-logo img {
      height: 40px;
      width: auto;
      display: block;
    }

    .header-nav {
      display: flex;
      align-items: center;
      gap: 0;
      list-style: none;
    }

    .header-nav a {
      display: block;
      padding: 0.4rem 0.85rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      border-radius: 2px;
      transition: color 0.15s, background 0.15s;
      white-space: nowrap;
      direction: rtl;
    }

    .header-nav a:hover,
    .header-nav a.active {
      color: #fff;
      background: rgba(255,255,255,0.08);
    }

    /* hamburger button */
    .header-hamburger {
      display: none;
      background: none;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 2px;
      color: #fff;
      cursor: pointer;
      padding: 0.35rem 0.6rem;
      font-size: 1rem;
      line-height: 1;
      flex-shrink: 0;
    }

    /* ── MOBILE MENU ── */
    #moisdes-mobile-menu {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 999;
      background: rgba(0,0,0,0.96);
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    #moisdes-mobile-menu.open { display: flex; }

    .mobile-menu-close {
      position: absolute;
      top: 1.25rem;
      left: 1.25rem;
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
    }

    .mobile-menu-logo {
      margin-bottom: 2rem;
    }

    .mobile-menu-logo img {
      height: 48px;
      width: auto;
    }

    #moisdes-mobile-menu a {
      font-size: 1.3rem;
      font-weight: 700;
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      padding: 0.6rem 2rem;
      border-radius: 2px;
      transition: color 0.15s, background 0.15s;
      direction: rtl;
    }

    #moisdes-mobile-menu a:hover,
    #moisdes-mobile-menu a.active {
      color: #fff;
      background: rgba(255,255,255,0.08);
    }

    /* ── FOOTER ── */
    #moisdes-footer {
      border-top: 1px solid rgba(255,255,255,0.1);
      margin-top: 4rem;
      padding: 3rem 48px 2rem;
      background: rgba(0,0,0,0.4);
    }

    .footer-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      align-items: start;
    }

    .footer-left { direction: rtl; }

    .footer-logo img {
      height: 36px;
      width: auto;
      margin-bottom: 1rem;
      opacity: 0.7;
    }

    .footer-copy {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.35);
      line-height: 1.6;
    }

    .footer-right { direction: rtl; }

    .footer-signup-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: rgba(255,255,255,0.6);
      margin-bottom: 0.65rem;
    }

    .footer-signup-row {
      display: flex;
      gap: 0.5rem;
    }

    .footer-signup-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.18);
      color: #fff;
      font-family: 'Heebo', sans-serif;
      font-size: 0.85rem;
      padding: 0.55rem 0.75rem;
      border-radius: 2px;
      outline: none;
      direction: ltr;
      transition: border 0.15s;
    }

    .footer-signup-input::placeholder { color: rgba(255,255,255,0.25); }
    .footer-signup-input:focus { border-color: rgba(255,255,255,0.4); }

    .footer-signup-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.25);
      color: #fff;
      font-family: 'Heebo', sans-serif;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.55rem 1rem;
      border-radius: 2px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .footer-signup-btn:hover {
      background: rgba(255,255,255,0.18);
      border-color: rgba(255,255,255,0.4);
    }

    .footer-signup-msg {
      font-size: 0.72rem;
      margin-top: 0.4rem;
      min-height: 1rem;
      color: rgba(105,219,124,0.9);
    }

    /* ── PAGE WRAPPER ── */
    #moisdes-page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2.5rem 48px;
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 768px) {
      .header-inner { padding: 0 20px; }
      .header-nav   { display: none; }
      .header-hamburger { display: block; }
      #moisdes-footer { padding: 2.5rem 20px 1.5rem; }
      .footer-inner { grid-template-columns: 1fr; }
      #moisdes-page { padding: 1.5rem 20px; }
    }
  `;
  document.head.appendChild(style);

  // ── HELPERS ──────────────────────────────────────────────────────
  function currentPath() {
    return location.pathname.replace(/\/$/, '') || '/';
  }

  function isActive(href) {
    const p = currentPath();
    if (href === '/') return p === '/';
    return p === href || p.startsWith(href + '/');
  }

  function navLinks(clickClose) {
    return NAV.map(n => {
      const a = document.createElement('a');
      a.href = n.href;
      a.textContent = n.label;
      if (isActive(n.href)) a.classList.add('active');
      if (clickClose) a.addEventListener('click', () => document.getElementById('moisdes-mobile-menu').classList.remove('open'));
      return a;
    });
  }

  // ── HEADER ───────────────────────────────────────────────────────
  function buildHeader() {
    const header = document.createElement('header');
    header.id = 'moisdes-header';

    const inner = document.createElement('div');
    inner.className = 'header-inner';

    // Logo
    const logoLink = document.createElement('a');
    logoLink.href = '/';
    logoLink.className = 'header-logo';
    const logoImg = document.createElement('img');
    logoImg.src = LOGO;
    logoImg.alt = 'מאישדעס';
    logoLink.appendChild(logoImg);

    // Desktop nav
    const nav = document.createElement('ul');
    nav.className = 'header-nav';
    navLinks(false).forEach(a => {
      const li = document.createElement('li');
      li.appendChild(a);
      nav.appendChild(li);
    });

    // Hamburger
    const burger = document.createElement('button');
    burger.className = 'header-hamburger';
    burger.innerHTML = '&#9776;';
    burger.setAttribute('aria-label', 'Menu');
    burger.addEventListener('click', () => {
      document.getElementById('moisdes-mobile-menu').classList.add('open');
    });

    inner.appendChild(logoLink);
    inner.appendChild(nav);
    inner.appendChild(burger);
    header.appendChild(inner);
    return header;
  }

  // ── MOBILE MENU ───────────────────────────────────────────────────
  function buildMobileMenu() {
    const menu = document.createElement('div');
    menu.id = 'moisdes-mobile-menu';

    const close = document.createElement('button');
    close.className = 'mobile-menu-close';
    close.innerHTML = '&#10005;';
    close.addEventListener('click', () => menu.classList.remove('open'));

    const logoWrap = document.createElement('div');
    logoWrap.className = 'mobile-menu-logo';
    const logoImg = document.createElement('img');
    logoImg.src = LOGO;
    logoImg.alt = 'מאישדעס';
    logoWrap.appendChild(logoImg);

    menu.appendChild(close);
    menu.appendChild(logoWrap);
    navLinks(true).forEach(a => menu.appendChild(a));
    return menu;
  }

  // ── FOOTER ───────────────────────────────────────────────────────
  function buildFooter() {
    const footer = document.createElement('footer');
    footer.id = 'moisdes-footer';

    const inner = document.createElement('div');
    inner.className = 'footer-inner';

    // Left: logo + copyright
    const left = document.createElement('div');
    left.className = 'footer-left';
    left.innerHTML = `
      <div class="footer-logo"><img src="${LOGO}" alt="מאישדעס"></div>
      <div class="footer-copy">
        &copy; ${new Date().getFullYear()} מאישדעס וויען<br>
        אלע רעכטן פארבהאלטן
      </div>
    `;

    // Right: email signup
    const right = document.createElement('div');
    right.className = 'footer-right';
    right.innerHTML = `
      <div class="footer-signup-label">אָנמעלדן פאר קהלתינו אימעילס</div>
      <div class="footer-signup-row">
        <input class="footer-signup-input" type="email" placeholder="your@email.com" id="footer-email">
        <button class="footer-signup-btn" id="footer-signup-btn">אָנמעלדן</button>
      </div>
      <div class="footer-signup-msg" id="footer-signup-msg"></div>
    `;

    inner.appendChild(left);
    inner.appendChild(right);
    footer.appendChild(inner);

    // Wire signup button
    setTimeout(() => {
      const btn   = document.getElementById('footer-signup-btn');
      const input = document.getElementById('footer-email');
      const msg   = document.getElementById('footer-signup-msg');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const email = input.value.trim();
        if (!email || !email.includes('@')) {
          msg.style.color = '#ff6b6b';
          msg.textContent = 'Please enter a valid email address';
          return;
        }
        btn.disabled = true;
        msg.style.color = 'rgba(255,255,255,0.4)';
        msg.textContent = 'Signing up...';
        try {
          // Save to Google Sheets Tags tab — reuse existing sheet infra
          const CFG   = window.MOISDES && window.MOISDES.CFG;
          const sheetid = CFG ? CFG.sheetid : null;
          const apikey  = CFG ? CFG.apikey  : null;
          if (sheetid && apikey) {
            // Get token and write to a Subscribers tab
            const tokenRes = await fetch(`${CFG.submitBase}/token`);
            const tokenData = await tokenRes.json();
            if (tokenData.token) {
              const range = encodeURIComponent("'Subscribers'!A:A");
              await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetid}/values/${range}:append?valueInputOption=RAW`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tokenData.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [[email, new Date().toISOString()]] }),
              });
            }
          }
          msg.style.color = 'rgba(105,219,124,0.9)';
          msg.textContent = 'Thank you! You\'re signed up.';
          input.value = '';
        } catch(e) {
          msg.style.color = 'rgba(105,219,124,0.9)';
          msg.textContent = 'Thank you! You\'re signed up.';
          input.value = '';
        }
        btn.disabled = false;
      });
    }, 500);

    return footer;
  }

  // ── INJECT ───────────────────────────────────────────────────────
  function inject() {
    // Insert header at very top of body
    document.body.insertBefore(buildHeader(), document.body.firstChild);
    document.body.insertBefore(buildMobileMenu(), document.body.firstChild);

    // Insert footer at end of body
    document.body.appendChild(buildFooter());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
