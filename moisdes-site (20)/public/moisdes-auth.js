// ================================================================
// MOISDES — AUTH GUARD
// moisdes-auth.js
// Include on all upload pages. Redirects to login if not authenticated.
// Also updates shared-config.js API base URL.
// ================================================================

(function() {
  const API = 'https://moisdes-worker.moisdesvienweb.workers.dev';

  // Make API URL available globally
  window.MOISDES_API = API;

  // Check auth
  const token = localStorage.getItem('moisdes_token');
  const user  = JSON.parse(localStorage.getItem('moisdes_user') || 'null');

  if (!token || !user) {
    window.location.href = '/login?redirect=' + encodeURIComponent(location.pathname);
    return;
  }

  // Check page-specific permission
  const pageMap = {
    '/upload-blog':    'blog',
    '/upload-posters': 'posters',
    '/upload-events':  'events',
    '/upload-video':   'video',
    '/upload-pdfs':    'pdfs',
  };

  const requiredPerm = pageMap[location.pathname];
  if (requiredPerm) {
    const perms = JSON.parse(localStorage.getItem('moisdes_perms') || '[]');
    const isAdmin = user.role === 'superadmin' || user.role === 'admin';
    if (!isAdmin && !perms.includes(requiredPerm)) {
      // No permission — redirect to home
      window.location.href = '/';
      return;
    }
  }

  // Override submitBase to point to Cloudflare Worker
  document.addEventListener('DOMContentLoaded', () => {
    if (window.MOISDES && window.MOISDES.CFG) {
      window.MOISDES.CFG.submitBase = API + '/api/upload';
      window.MOISDES.CFG._token = token;
    }
  });

  // Add auth token to all API calls from upload forms
  const origFetch = window.fetch;
  window.fetch = function(url, opts = {}) {
    if (typeof url === 'string' && url.includes(API)) {
      opts.headers = opts.headers || {};
      opts.headers['Authorization'] = `Bearer ${token}`;
    }
    return origFetch(url, opts);
  };

})();
