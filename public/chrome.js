// ================================================================
// MOISDES — SHARED HEADER & FOOTER
// chrome.js
// ================================================================

(function () {
  const CFG = window.MOISDES.CFG;

  function currentPath() {
    return location.pathname.replace(/\/$/, '') || '/';
  }
  function isActive(href) {
    const p = currentPath();
    if (href === '/') return p === '/';
    return p === href || p.startsWith(href + '/');
  }
  function navLinks(onClick) {
    return CFG.nav.map((n) => {
      const a = document.createElement('a');
      a.href = n.href;
      a.textContent = n.label;
      if (isActive(n.href)) a.classList.add('active');
      if (onClick) a.addEventListener('click', onClick);
      return a;
    });
  }

  function buildHeader() {
    const header = document.createElement('header');
    header.id = 'moisdes-header';
    const inner = document.createElement('div');
    inner.className = 'header-inner';

    // Logo first in DOM -> rightmost in RTL flex row.
    const logoLink = document.createElement('a');
    logoLink.href = '/';
    logoLink.className = 'header-logo';
    const logoImg = document.createElement('img');
    logoImg.src = CFG.logo;
    logoImg.alt = 'מאסדעס וויען';
    logoLink.appendChild(logoImg);

    const nav = document.createElement('ul');
    nav.className = 'header-nav';
    navLinks().forEach((a) => {
      const li = document.createElement('li');
      li.appendChild(a);
      nav.appendChild(li);
    });

    const burger = document.createElement('button');
    burger.className = 'header-burger';
    burger.innerHTML = '&#9776;';
    burger.setAttribute('aria-label', 'תפריט');
    burger.addEventListener('click', () => document.getElementById('moisdes-mobile').classList.add('open'));

    inner.appendChild(logoLink);
    inner.appendChild(nav);
    inner.appendChild(burger);
    header.appendChild(inner);
    return header;
  }

  function buildMobile() {
    const menu = document.createElement('div');
    menu.id = 'moisdes-mobile';
    const close = document.createElement('button');
    close.className = 'mobile-close';
    close.innerHTML = '&#10005;';
    close.addEventListener('click', () => menu.classList.remove('open'));
    const logoImg = document.createElement('img');
    logoImg.src = CFG.logo;
    logoImg.alt = 'מאסדעס וויען';
    menu.appendChild(close);
    menu.appendChild(logoImg);
    navLinks(() => menu.classList.remove('open')).forEach((a) => menu.appendChild(a));
    return menu;
  }

  function buildFooter() {
    const footer = document.createElement('footer');
    footer.id = 'moisdes-footer';
    const inner = document.createElement('div');
    inner.className = 'footer-inner';

    const nav = document.createElement('ul');
    nav.className = 'footer-nav';
    navLinks().forEach((a) => {
      const li = document.createElement('li');
      li.appendChild(a);
      nav.appendChild(li);
    });

    const copy = document.createElement('div');
    copy.className = 'footer-copy';
    copy.innerHTML = `&copy; ${new Date().getFullYear()} Mosdes Vien`;

    inner.appendChild(nav);
    inner.appendChild(copy);
    footer.appendChild(inner);
    return footer;
  }

  function inject() {
    document.body.insertBefore(buildMobile(), document.body.firstChild);
    document.body.insertBefore(buildHeader(), document.body.firstChild);
    document.body.appendChild(buildFooter());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
