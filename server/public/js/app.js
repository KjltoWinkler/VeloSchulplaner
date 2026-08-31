// --- ASTRA ADMIN MAIN APP ENTRYPOINT ---

import {
  getAuthToken,
  setAuthToken,
  getStoredAdminUser,
  setStoredAdminUser,
  authFetch,
  showToast,
  normalizeClassCode,
  isValidClassCode
} from './api.js';

import {
  initRouter,
  navigateTo,
  getRouteInfo
} from './router.js';

import {
  initModals,
  openUserModal,
  openEditUserModal,
  openSubModal,
  openConfirmDeleteDialog
} from './modals.js';

let usersList = [];
let subsList = [];
let currentRoleFilter = 'all';
let currentClassFilter = '';

// --- LOGIN SCREEN ---
function showLoginScreen() {
  setAuthToken(null);
  setStoredAdminUser(null);
  document.getElementById('loginUsername').value = 'admin';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
  navigateTo('/login');
}

function showAppScreen(user) {
  const displayUser = user || { name: 'Administrator', username: 'admin' };
  const uNameEl = document.getElementById('headerUsername');
  const uAvatarEl = document.getElementById('headerAvatar');
  if (uNameEl) uNameEl.textContent = displayUser.name || displayUser.username;
  if (uAvatarEl) uAvatarEl.textContent = (displayUser.name || displayUser.username).charAt(0).toUpperCase();

  // If on /login or root, navigate to /benutzer
  const path = window.location.pathname;
  if (path === '/login' || path === '/' || path === '') {
    navigateTo('/benutzer');
  } else {
    navigateTo(path, false);
  }

  loadUsers();
  loadSubs();
}

// --- DATA LOADING & STATS ---
async function loadUsers() {
  try {
    const res = await authFetch('/api/admin/users');
    usersList = await res.json();
    renderUsers();
    updateStats();
    populateClassDropdown();
  } catch (err) {
    console.error("Fehler beim Laden der Benutzer:", err);
  }
}

async function loadSubs() {
  try {
    const res = await authFetch('/api/admin/substitutions');
    subsList = await res.json();
    renderSubs();
    updateStats();
  } catch (err) {
    console.error("Fehler beim Laden der Vertretungen:", err);
  }
}

function updateStats() {
  document.getElementById('statTotalUsers').textContent = usersList.length;
  document.getElementById('statStudents').textContent = usersList.filter(u => u.role === 'schueler').length;
  document.getElementById('statTeachers').textContent = usersList.filter(u => u.role === 'lehrer').length;

  const classes = new Set(usersList.map(u => u.assignedClass).filter(Boolean));
  document.getElementById('statClasses').textContent = classes.size;
  document.getElementById('statSubs').textContent = subsList.length;
}

// --- USERS TABLE RENDERING ---
function renderUsers() {
  const search = (document.getElementById('globalSearchInput').value || '').toLowerCase().trim();
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = usersList.filter(u => {
    const matchRole = currentRoleFilter === 'all' || u.role === currentRoleFilter;
    const matchClass = !currentClassFilter || (u.assignedClass && u.assignedClass.toLowerCase() === currentClassFilter.toLowerCase());
    const matchSearch = !search || u.username.toLowerCase().includes(search) || (u.name && u.name.toLowerCase().includes(search)) || (u.assignedClass && u.assignedClass.toLowerCase().includes(search));
    return matchRole && matchClass && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">Keine Benutzer gefunden</td></tr>`;
    return;
  }

  filtered.forEach((u, idx) => {
    const tr = document.createElement('tr');
    const roleLabel = u.role === 'schueler' ? 'Schüler' : (u.role === 'lehrer' ? 'Lehrer' : 'Admin');
    const userMenuBtnId = `uMenuBtn_${idx}`;
    const userMenuId = `uMenu_${idx}`;

    tr.innerHTML = `
      <td><strong>${u.username}</strong></td>
      <td>${u.name || '—'}</td>
      <td><span class="role-badge role-${u.role}">${roleLabel}</span></td>
      <td>${u.assignedClass ? `<span class="class-chip">${u.assignedClass}</span>` : '—'}</td>
      <td>
        <div style="display:flex; align-items:center; gap:4px;">
          <code id="pwdVal_${idx}" data-pwd="${u.initialPassword || ''}" data-masked="true" style="background:var(--md-sys-color-surface-container); padding:4px 10px; border-radius:6px; font-family:monospace; font-size:0.88rem; min-width:80px; display:inline-block; letter-spacing:1.5px;">••••••••</code>
          <md-icon-button class="toggle-pwd-btn" data-target="pwdVal_${idx}" title="Passwort aufdecken/verbergen">
            <span class="material-symbols-outlined" style="font-size:18px;">visibility</span>
          </md-icon-button>
          <md-icon-button class="copy-creds-btn" data-username="${u.username}" data-password="${u.initialPassword || ''}" data-class="${u.assignedClass || ''}" title="Zugangsdaten für Zettel/Ausgabe kopieren">
            <span class="material-symbols-outlined" style="font-size:18px;">content_copy</span>
          </md-icon-button>
        </div>
      </td>
      <td>
        <div class="row-actions" style="position: relative;">
          ${u.username !== 'admin' ? `
            <span style="position: relative;">
              <md-icon-button id="${userMenuBtnId}" title="Optionen">
                <span class="material-symbols-outlined">more_vert</span>
              </md-icon-button>
              <md-menu id="${userMenuId}" anchor="${userMenuBtnId}" positioning="popover">
                <md-menu-item class="action-edit-user" data-username="${u.username}">
                  <span slot="start" class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">edit</span>
                  <div slot="headline">Nutzer bearbeiten</div>
                </md-menu-item>
                <md-menu-item class="action-copy-item" data-username="${u.username}" data-password="${u.initialPassword || ''}" data-class="${u.assignedClass || ''}">
                  <span slot="start" class="material-symbols-outlined">content_copy</span>
                  <div slot="headline">Zugangsdaten kopieren</div>
                </md-menu-item>
                <md-divider></md-divider>
                <md-menu-item class="action-delete-user" data-username="${u.username}">
                  <span slot="start" class="material-symbols-outlined" style="color:var(--md-sys-color-error);">delete</span>
                  <div slot="headline" style="color:var(--md-sys-color-error);">Benutzer löschen</div>
                </md-menu-item>
              </md-menu>
            </span>
          ` : '<span style="font-size:0.75rem; color:var(--md-sys-color-outline); padding-right:8px;">System</span>'}
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    if (u.username !== 'admin') {
      const btn = tr.querySelector(`#${userMenuBtnId}`);
      const menu = tr.querySelector(`#${userMenuId}`);
      if (btn && menu) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.open = !menu.open;
        });
      }
    }
  });

  // Toggle Password Masking / Revealing
  document.querySelectorAll('.toggle-pwd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const el = document.getElementById(targetId);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (!el || !icon) return;
      if (el.getAttribute('data-masked') === 'true') {
        el.textContent = el.getAttribute('data-pwd') || '(kein Passwort)';
        el.setAttribute('data-masked', 'false');
        icon.textContent = 'visibility_off';
      } else {
        el.textContent = '••••••••';
        el.setAttribute('data-masked', 'true');
        icon.textContent = 'visibility';
      }
    });
  });

  // Copy Credentials Handler (Buttons & Menu Items)
  const copyCreds = (uname, pwd, cls) => {
    let text = `Benutzername: ${uname}\nPasswort: ${pwd}`;
    if (cls) text += `\nKlasse: ${cls}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Zugangsdaten für "${uname}" kopiert!`);
    });
  };

  document.querySelectorAll('.copy-creds-btn, .action-copy-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const uname = btn.getAttribute('data-username');
      const pwd = btn.getAttribute('data-password');
      const cls = btn.getAttribute('data-class');
      copyCreds(uname, pwd, cls);
    });
  });

  // Edit User Handler
  document.querySelectorAll('.action-edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const uname = btn.getAttribute('data-username');
      openEditUserModal(uname, usersList);
    });
  });

  // Delete User Handler via Material 3 modal
  document.querySelectorAll('.action-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const uname = btn.getAttribute('data-username');
      openConfirmDeleteDialog(
        `Benutzer "${uname}" löschen?`,
        `Möchtest du das Benutzerkonto "${uname}" wirklich unwiderruflich löschen?`,
        async () => {
          await authFetch(`/api/admin/users/${uname}`, { method: 'DELETE' });
          showToast(`Benutzer "${uname}" gelöscht.`);
          loadUsers();
        }
      );
    });
  });
}

// --- SUBSTITUTIONS TABLE RENDERING ---
function renderSubs() {
  const tbody = document.getElementById('subsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const classFilter = (document.getElementById('subClassFilter').value || '').trim().toLowerCase();
  const filtered = subsList.filter(s => {
    return !classFilter || (s.className && s.className.toLowerCase().includes(classFilter));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">Keine Vertretungen eingetragen</td></tr>`;
    return;
  }

  filtered.forEach((s, idx) => {
    const tr = document.createElement('tr');
    const subMenuBtnId = `subActionsBtn_${idx}`;
    const subMenuId = `subActionsMenu_${idx}`;

    tr.innerHTML = `
      <td><strong>${s.day}</strong></td>
      <td><span class="class-chip">${s.className}</span></td>
      <td>${s.lesson}</td>
      <td><strong>${s.subject}</strong></td>
      <td><span class="role-badge role-lehrer">${s.art}</span></td>
      <td>${s.room}</td>
      <td>${s.vertrVon ? `${s.vertrVon} → ${s.nach || '?'}` : '—'}</td>
      <td>${s.text || '—'}</td>
      <td>
        <div class="row-actions" style="position: relative;">
          <span style="position: relative;">
            <md-icon-button id="${subMenuBtnId}" title="Optionen">
              <span class="material-symbols-outlined">more_vert</span>
            </md-icon-button>
            <md-menu id="${subMenuId}" anchor="${subMenuBtnId}" positioning="popover">
              <md-menu-item class="action-delete-sub" data-id="${s.id}" data-name="${s.className} (${s.subject})">
                <span slot="start" class="material-symbols-outlined" style="color:var(--md-sys-color-error);">delete</span>
                <div slot="headline" style="color:var(--md-sys-color-error);">Eintrag löschen</div>
              </md-menu-item>
            </md-menu>
          </span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    const btn = tr.querySelector(`#${subMenuBtnId}`);
    const menu = tr.querySelector(`#${subMenuId}`);
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.open = !menu.open;
      });
    }
  });

  document.querySelectorAll('.action-delete-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      openConfirmDeleteDialog(
        'Vertretung löschen?',
        `Möchtest du den Vertretungseintrag "${name}" wirklich löschen?`,
        async () => {
          await authFetch(`/api/admin/substitutions/${id}`, { method: 'DELETE' });
          showToast('Vertretungseintrag gelöscht.');
          loadSubs();
        }
      );
    });
  });
}

function populateClassDropdown() {
  const select = document.getElementById('userClassFilterDropdown');
  if (!select) return;
  const classes = Array.from(new Set(usersList.map(u => u.assignedClass).filter(Boolean))).sort();

  select.innerHTML = '<md-select-option value=""><div slot="headline">Alle Klassen</div></md-select-option>';
  classes.forEach(c => {
    const opt = document.createElement('md-select-option');
    opt.value = c;
    opt.innerHTML = `<div slot="headline">${c}</div>`;
    select.appendChild(opt);
  });
}

// --- CLASS CODE TESTER ---
function testClass() {
  const input = document.getElementById('testClassInput');
  const result = document.getElementById('testClassResult');
  const code = (input.value || '').trim();

  if (!code) {
    result.style.display = 'none';
    return;
  }

  const normalized = normalizeClassCode(code);
  const valid = isValidClassCode(normalized);

  result.style.display = 'flex';
  if (valid) {
    result.className = 'test-result-box valid';
    result.style.cssText = 'display:flex; align-items:center; gap:8px; padding:16px; border-radius:12px; background:rgba(129, 201, 149, 0.15); color:#81c995; border:1px solid rgba(129, 201, 149, 0.4); margin-top:16px;';
    result.innerHTML = `<span class="material-symbols-outlined">check_circle</span> <div><strong>Gültiges Klassenkürzel!</strong><br>Format: <code>${normalized}</code></div>`;
  } else {
    result.className = 'test-result-box invalid';
    result.style.cssText = 'display:flex; align-items:center; gap:8px; padding:16px; border-radius:12px; background:rgba(242, 184, 181, 0.15); color:var(--md-sys-color-error); border:1px solid rgba(242, 184, 181, 0.4); margin-top:16px;';
    result.innerHTML = `<span class="material-symbols-outlined">error</span> <div><strong>Ungültiges Format.</strong><br>Beispiele: <code>9aR</code> (9. Klasse Realschule), <code>8bH</code> (8. Klasse Hauptschule).</div>`;
  }
}

// --- INITIALIZE APPLICATION ---
function initApp() {
  initRouter();
  initModals({
    onUserSaved: loadUsers,
    onSubSaved: loadSubs,
    getUsersList: () => usersList
  });

  // "+ Neu" Menu
  const newBtn = document.getElementById('driveNewBtn');
  const newMenu = document.getElementById('newMenu');
  if (newBtn && newMenu) {
    newBtn.addEventListener('click', () => {
      newMenu.open = !newMenu.open;
    });
  }

  // Header User Menu
  const headerUserBtn = document.getElementById('headerUserMenuBtn');
  const headerUserMenu = document.getElementById('headerUserMenu');
  if (headerUserBtn && headerUserMenu) {
    headerUserBtn.addEventListener('click', () => {
      headerUserMenu.open = !headerUserMenu.open;
    });
  }

  const menuLogoutItem = document.getElementById('menuLogoutItem');
  if (menuLogoutItem) {
    menuLogoutItem.addEventListener('click', () => showLoginScreen());
  }

  const refreshBtn = document.getElementById('headerRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadUsers();
      loadSubs();
      showToast('Daten aktualisiert');
    });
  }

  const helpBtn = document.getElementById('headerHelpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => navigateTo('/klassen'));
  }

  // Modals Open Triggers
  document.getElementById('menuAddUser').addEventListener('click', openUserModal);
  document.getElementById('canvasAddUserBtn').addEventListener('click', openUserModal);
  document.getElementById('menuAddSub').addEventListener('click', openSubModal);
  document.getElementById('canvasAddSubBtn').addEventListener('click', openSubModal);
  document.getElementById('menuTestClass').addEventListener('click', () => navigateTo('/klassen'));

  // Role Filter Chips
  const roleChips = [
    document.getElementById('chipRoleAll'),
    document.getElementById('chipRoleSchueler'),
    document.getElementById('chipRoleLehrer'),
    document.getElementById('chipRoleAdmin')
  ];

  roleChips.forEach(chip => {
    if (!chip) return;
    chip.addEventListener('click', () => {
      roleChips.forEach(c => c.removeAttribute('selected'));
      chip.setAttribute('selected', '');
      currentRoleFilter = chip.getAttribute('data-role');
      renderUsers();
    });
  });

  // Search Inputs
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) searchInput.addEventListener('input', () => renderUsers());

  const subSearchInput = document.getElementById('subClassFilter');
  if (subSearchInput) subSearchInput.addEventListener('input', () => renderSubs());

  const classDropdown = document.getElementById('userClassFilterDropdown');
  if (classDropdown) {
    classDropdown.addEventListener('change', (e) => {
      currentClassFilter = e.target.value;
      renderUsers();
    });
  }

  // Clear Subs Button
  const btnClearSubs = document.getElementById('btnClearSubs');
  if (btnClearSubs) {
    btnClearSubs.addEventListener('click', () => {
      openConfirmDeleteDialog(
        'Alle Vertretungen löschen?',
        'Möchtest du wirklich die gesamte Vertretungsliste für alle Klassen leeren?',
        async () => {
          await authFetch('/api/admin/substitutions/clear', { method: 'POST' });
          showToast('Vertretungsliste vollständig geleert.');
          loadSubs();
        }
      );
    });
  }

  // Class Tester Button
  const btnTestClass = document.getElementById('btnTestClass');
  if (btnTestClass) btnTestClass.addEventListener('click', testClass);

  const testInput = document.getElementById('testClassInput');
  if (testInput) {
    testInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') testClass();
    });
  }

  // Login Form Submission
  const loginForm = document.getElementById('loginForm');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');

  async function performLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errEl = document.getElementById('loginError');
    const errText = document.getElementById('loginErrorText');

    errEl.style.display = 'none';

    if (!username || !password) {
      errText.textContent = 'Bitte Benutzername und Passwort eingeben.';
      errEl.style.display = 'flex';
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        errText.textContent = data.error || 'Anmeldung fehlgeschlagen.';
        errEl.style.display = 'flex';
        return;
      }

      if (data.user.role !== 'admin') {
        errText.textContent = 'Nur Administratoren haben Zugriff auf dieses Web-Portal.';
        errEl.style.display = 'flex';
        return;
      }

      setAuthToken(data.token);
      setStoredAdminUser(data.user);
      showAppScreen(data.user);
    } catch (err) {
      errText.textContent = 'Verbindung zum Server fehlgeschlagen.';
      errEl.style.display = 'flex';
    }
  }

  if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', performLogin);
  if (loginForm) loginForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performLogin();
  });

  window.addEventListener('app:unauthorized', () => {
    showLoginScreen();
  });

  // Check initial authentication
  const token = getAuthToken();
  const user = getStoredAdminUser();

  if (token) {
    showAppScreen(user);
  } else {
    showLoginScreen();
  }
}

// Bootstrap once DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
