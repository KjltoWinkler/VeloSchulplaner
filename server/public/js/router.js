// --- ASTRA SPA ROUTER ---

const ROUTES = {
  '/benutzer': { targetId: 'viewUsers', navId: 'navUsers', title: 'Benutzer & Accounts' },
  '/vertretungsplaene': { targetId: 'viewSubs', navId: 'navSubs', title: 'Vertretungspläne' },
  '/klassen': { targetId: 'viewClasses', navId: 'navClasses', title: 'Klassensystem' },
  '/login': { isLogin: true, title: 'Anmeldung' }
};

let currentPath = '';

export function getRouteInfo(path) {
  const clean = path.replace(/\/$/, '') || '/';
  if (ROUTES[clean]) return { path: clean, ...ROUTES[clean] };
  if (clean.startsWith('/benutzer')) return { path: '/benutzer', ...ROUTES['/benutzer'] };
  if (clean.startsWith('/vertretungsplaene')) return { path: '/vertretungsplaene', ...ROUTES['/vertretungsplaene'] };
  if (clean.startsWith('/klassen')) return { path: '/klassen', ...ROUTES['/klassen'] };
  if (clean === '/login') return { path: '/login', ...ROUTES['/login'] };
  return { path: '/benutzer', ...ROUTES['/benutzer'] };
}

export function navigateTo(path, push = true) {
  const route = getRouteInfo(path);
  currentPath = route.path;

  if (push && window.location.pathname !== route.path) {
    window.history.pushState({ path: route.path }, '', route.path);
  }

  document.title = `${route.title} - Velo.Schulplaner`;

  if (route.isLogin) {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    return;
  }

  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';

  // Update Nav Items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.id === route.navId);
  });

  // Update Panels
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.style.display = panel.id === route.targetId ? 'flex' : 'none';
  });

  window.dispatchEvent(new CustomEvent('app:navigated', { detail: { path: route.path } }));
}

export function initRouter() {
  window.addEventListener('popstate', (e) => {
    const path = window.location.pathname;
    navigateTo(path, false);
  });

  // Nav item click delegation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target === 'viewUsers') navigateTo('/benutzer');
      else if (target === 'viewSubs') navigateTo('/vertretungsplaene');
      else if (target === 'viewClasses') navigateTo('/klassen');
    });
  });

  // Brand logo click goes to /benutzer
  const brandLogo = document.getElementById('brandLogo');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('/benutzer');
    });
  }
}
