// ================================================================
// MOISDES ADMIN — Site settings (e.g. newsletter signup link)
// admin-settings.js
// ================================================================

window.MOISDES = window.MOISDES || {};

window.MOISDES.adminSettings = (function () {
  const api = window.MOISDES.api;

  function canWrite() {
    const role = api.getUser()?.role;
    if (role === 'admin' || role === 'superadmin') return true;
    return !!api.getPermissions()?.settings?.write;
  }

  function init() {
    const form = document.getElementById('settings-form');
    const urlInput = document.getElementById('settings-newsletter-url');
    const msg = document.getElementById('settings-msg');
    if (!form) return;

    api.get('/api/settings').then(({ settings }) => {
      urlInput.value = settings.newsletter_url || '';
    }).catch(() => {});

    if (!canWrite()) {
      urlInput.disabled = true;
      form.querySelector('button[type=submit]').style.display = 'none';
      msg.textContent = "View only — you don't have write access to Settings.";
      return;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = 'Saving…';
      msg.className = 'state-msg';
      try {
        await api.put('/api/settings', { settings: { newsletter_url: urlInput.value.trim() } });
        msg.textContent = 'Saved.';
        msg.className = 'state-msg ok';
      } catch (err) {
        msg.textContent = err.message || 'Save failed';
        msg.className = 'state-msg err';
      }
    });
  }

  return { init };
})();
