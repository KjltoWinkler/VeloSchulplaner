// --- ASTRA SPA ROUTER ---
import { getStoredAdminUser } from './api.js';

const ROUTES = {
  '/benutzer': { targetId: 'viewUsers', navId: 'navUsers', title: 'Benutzer & Accounts', role: 'admin' },
  '/vertretungsplaene': { targetId: 'viewSubs', navId: 'navSubs', title: 'Vertretungspläne', role: 'admin' },
  '/klassen': { targetId: 'viewClasses', navId: 'navClasses', title: 'Klassenverwaltung', role: 'admin' },
  '/stundenplaene': { targetId: 'viewTimetables', navId: 'navTimetables', title: 'Stundenpläne', role: 'admin' },
  '/schueler': { isStudent: true, title: 'Schüler-Portal', role: 'schueler' },
  '/login': { isLogin: true, title: 'Anmeldung' }
};

let currentPath = '';

export function getRouteInfo(path) {
  const clean = path.replace(/\/$/, '') || '/';
  if (ROUTES[clean]) return { path: clean, ...ROUTES[clean] };
  if (clean.startsWith('/benutzer')) return { path: '/benutzer', ...ROUTES['/benutzer'] };
  if (clean.startsWith('/vertretungsplaene')) return { path: '/vertretungsplaene', ...ROUTES['/vertretungsplaene'] };
  if (clean.startsWith('/klassen')) return { path: '/klassen', ...ROUTES['/klassen'] };
  if (clean.startsWith('/stundenplaene')) return { path: '/stundenplaene', ...ROUTES['/stundenplaene'] };
  if (clean.startsWith('/schueler')) return { path: '/schueler', ...ROUTES['/schueler'] };
  if (clean === '/login') return { path: '/login', ...ROUTES['/login'] };
  return { path: '/benutzer', ...ROUTES['/benutzer'] };
}

export function navigateTo(path, push = true) {
  let route = getRouteInfo(path);
  const user = getStoredAdminUser();

  // Role guard: if student tries to access admin route, redirect to /schueler
  if (user && user.role === 'schueler' && route.role === 'admin') {
    route = getRouteInfo('/schueler');
  }

  currentPath = route.path;

  if (push && window.location.pathname !== route.path) {
    window.history.pushState({ path: route.path }, '', route.path);
  }

  document.title = `${route.title} - Velo.Schulplaner`;

  const loginOverlay = document.getElementById('loginOverlay');
  const appContainer = document.getElementById('appContainer');
  const studentPortal = document.getElementById('studentPortal');

  if (route.isLogin) {
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    if (studentPortal) studentPortal.style.display = 'none';
    return;
  }

  if (route.isStudent) {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    if (studentPortal) studentPortal.style.display = 'flex';
    window.dispatchEvent(new CustomEvent('app:navigated', { detail: { path: route.path } }));
    return;
  }

  // Admin Portal
  if (loginOverlay) loginOverlay.style.display = 'none';
  if (studentPortal) studentPortal.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';

  // Update Nav Items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.id === route.navId);
  });

  // Update Panels with smooth M3 transition
  document.querySelectorAll('.view-panel').forEach(panel => {
    const isTarget = panel.id === route.targetId;
    if (isTarget) {
      panel.style.display = 'flex';
      panel.classList.remove('view-entering');
      void panel.offsetWidth;
      panel.classList.add('view-entering');
    } else {
      panel.style.display = 'none';
      panel.classList.remove('view-entering');
    }
  });

  window.dispatchEvent(new CustomEvent('app:navigated', { detail: { path: route.path } }));
}

export function initRouter() {
  window.addEventListener('popstate', () => {
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
      else if (target === 'viewTimetables') navigateTo('/stundenplaene');
    });
  });

  // Brand logo click
  const brandLogo = document.getElementById('brandLogo');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      const user = getStoredAdminUser();
      if (user && user.role === 'schueler') {
        navigateTo('/schueler');
      } else {
        navigateTo('/benutzer');
      }
    });
  }
}
