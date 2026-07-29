// ================================================================
// MOISDES ADMIN — top-level wiring
// admin.js
// ================================================================

(function () {
  const api = window.MOISDES.api;

  if (!api.isLoggedIn()) {
    location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname);
    return;
  }

  // ── Sidebar panel switching ──────────────────────────────────────
  document.querySelectorAll('.sidebar-link[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link[data-panel]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api.logout();
    location.href = '/login.html';
  });

  // ── Upload sub-tabs ───────────────────────────────────────────────
  const uploadContainer = document.getElementById('upload-form-container');
  function loadUploadTab(type) {
    window.MOISDES.adminUpload.buildForm(type, uploadContainer);
  }
  document.querySelectorAll('#upload-subtabs .subtab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#upload-subtabs .subtab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadUploadTab(btn.dataset.type);
    });
  });
  loadUploadTab('posts');

  // ── Init other panels ─────────────────────────────────────────────
  window.MOISDES.adminBrowse.init();
  window.MOISDES.adminForms.init();
  window.MOISDES.adminUsers.init();
  if (window.MOISDES.adminDaf) window.MOISDES.adminDaf.init();
  if (window.MOISDES.adminSettings) window.MOISDES.adminSettings.init();
  if (window.MOISDES.adminAnalytics) window.MOISDES.adminAnalytics.init();

  // ── Browse export-XLSX button (follows the active Browse subtab) ──
  const exportBtn = document.getElementById('browse-export-xlsx');
  let exportType = 'posts';
  document.querySelectorAll('#browse-subtabs .subtab').forEach((btn) => {
    btn.addEventListener('click', () => { exportType = btn.dataset.type; });
  });
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      if (!window.XLSX) { alert('Export library did not load.'); return; }
      exportBtn.disabled = true;
      try {
        const data = await api.get(`/api/${exportType}`);
        const rows = data[exportType] || [];
        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, exportType);
        window.XLSX.writeFile(wb, `${exportType}.xlsx`);
      } catch (e) {
        alert(e.message || 'Export failed.');
      }
      exportBtn.disabled = false;
    });
  }
})();
