// --- ASTRA MAIN APP ENTRYPOINT ---

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
  openConfirmDeleteDialog,
  openClassModal,
  openClassDetailModal,
  openLessonModal,
  openImportTimetableModal
} from './modals.js';

let usersList = [];
let subsList = [];
let classesList = [];
let currentTimetable = {};
let selectedTimetableClass = '';
let studentData = null;

let currentRoleFilter = 'all';
let currentClassFilter = '';
let currentSubClassFilter = 'all';

// --- AUTH SCREENS ---
function showLoginScreen() {
  setAuthToken(null);
  setStoredAdminUser(null);
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput) {
    uInput.value = '';
    uInput.error = false;
    uInput.errorText = '';
  }
  if (pInput) {
    pInput.value = '';
    pInput.error = false;
    pInput.errorText = '';
  }
  navigateTo('/login');
}

function showAppScreen(user) {
  const displayUser = user || { name: 'Administrator', username: 'admin' };
  const uNameEl = document.getElementById('headerUsername');
  const uAvatarEl = document.getElementById('headerAvatar');
  if (uNameEl) uNameEl.textContent = displayUser.name || displayUser.username;
  if (uAvatarEl) uAvatarEl.textContent = (displayUser.name || displayUser.username).charAt(0).toUpperCase();

  // If on /login or root or student route, navigate to /benutzer
  const path = window.location.pathname;
  if (path === '/login' || path === '/' || path === '' || path === '/schueler') {
    navigateTo('/benutzer');
  } else {
    navigateTo(path, false);
  }

  loadUsers();
  loadSubs();
  loadClasses();
}

function showStudentScreen(user) {
  const displayUser = user || { name: 'Schüler', username: 'schueler' };
  const sAvatar = document.getElementById('studentAvatar');
  const sName = document.getElementById('studentName');
  const sClassBadge = document.getElementById('studentClassBadge');
  const sDate = document.getElementById('studentCurrentDate');

  if (sAvatar) sAvatar.textContent = (displayUser.name || displayUser.username).charAt(0).toUpperCase();
  if (sName) sName.textContent = displayUser.name || displayUser.username;
  if (sClassBadge) sClassBadge.textContent = displayUser.assignedClass || 'Ohne Klasse';
  if (sDate) {
    sDate.textContent = new Date().toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  navigateTo('/schueler');
  loadStudentDashboard();
}

// --- STUDENT PORTAL LOGIC ---
async function loadStudentDashboard() {
  try {
    const res = await authFetch('/api/student/dashboard');
    const data = await res.json();
    studentData = data;
    renderStudentSubs(data.substitutions || []);
    renderStudentTimetable(data.timetable || {}, data.substitutions || []);
  } catch (e) {
    console.error('Fehler beim Laden des Schüler-Dashboards', e);
  }
}

function renderStudentSubs(subs) {
  const container = document.getElementById('studentSubsList');
  if (!container) return;
  container.innerHTML = '';

  if (!subs || subs.length === 0) {
    container.innerHTML = `
      <div class="student-sub-card" style="text-align:center; padding:36px 20px; align-items:center;">
        <span class="material-symbols-outlined" style="font-size:48px; color:#81c995; margin-bottom:8px;">check_circle</span>
        <h3 style="font-family:var(--md-ref-typeface-brand); font-size:1.2rem; margin-bottom:4px;">Keine Vertretungen!</h3>
        <p style="color:var(--md-sys-color-on-surface-variant); font-size:0.92rem;">Für deine Klasse findet der Unterricht wie im regulären Stundenplan statt.</p>
      </div>
    `;
    return;
  }

  subs.forEach(s => {
    const card = document.createElement('div');
    const artLower = (s.art || '').toLowerCase();
    let artClass = 'card-vertretung';
    let artColor = 'var(--md-sys-color-primary)';
    if (artLower.includes('entfall')) {
      artClass = 'card-entfall';
      artColor = 'var(--md-sys-color-error)';
    } else if (artLower.includes('raum')) {
      artClass = 'card-raumaenderung';
      artColor = '#fdd663';
    }

    card.className = `student-sub-card ${artClass}`;
    card.innerHTML = `
      <div class="student-sub-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="student-sub-lesson-badge">${s.lesson}. Stunde</span>
          <span class="student-sub-subject">${s.subject}</span>
        </div>
        <span class="role-badge" style="background:${artColor}22; color:${artColor}; border:1px solid ${artColor}66;">${s.art}</span>
      </div>
      <div class="student-sub-details">
        <span>📅 ${s.day}</span>
        <span>🚪 Raum: <strong>${s.room || '—'}</strong></span>
        ${s.vertrVon ? `<span>👤 Vertreter: <strong>${s.vertrVon}</strong> ${s.nach ? `(für ${s.nach})` : ''}</span>` : ''}
      </div>
      ${s.text ? `<div class="student-sub-text">📝 <strong>Hinweis:</strong> ${s.text}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

function renderStudentTimetable(timetable, substitutions = []) {
  const wrapper = document.getElementById('studentTimetableWrapper');
  if (!wrapper) return;

  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const times = [
    '07:55 - 08:40',
    '08:45 - 09:30',
    '09:50 - 10:35',
    '10:40 - 11:25',
    '11:45 - 12:30',
    '12:35 - 13:20',
    '13:30 - 14:15',
    '14:20 - 15:05'
  ];

  let html = `
    <table class="timetable-grid">
      <thead>
        <tr>
          <th class="time-col-header">Stunde</th>
          ${days.map(d => `<th>${d}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  for (let p = 1; p <= 8; p++) {
    html += `<tr><td class="time-cell"><div class="period-num">${p}</div><div>${times[p - 1]}</div></td>`;
    days.forEach(day => {
      const slot = timetable[day] && timetable[day][p];
      const sub = substitutions.find(s => {
        const lessonStr = String(s.lesson || '');
        const matchLesson = lessonStr.includes(String(p));
        const dayStr = String(s.day || '').toLowerCase();
        const matchDay = dayStr.includes(day.toLowerCase());
        return matchLesson && matchDay;
      });

      if (slot && slot.subject) {
        const isEntfall = sub && (sub.art || '').toLowerCase().includes('entfall');
        const hasSub = !!sub;
        let subBadge = '';
        if (sub) {
          if (isEntfall) subBadge = `<div class="sub-badge-mini sub-badge-entfall">Entfall</div>`;
          else subBadge = `<div class="sub-badge-mini sub-badge-vertr">${sub.art || 'Vertretung'} (${sub.room || slot.room})</div>`;
        }

        html += `
          <td>
            <div class="timetable-slot filled ${hasSub ? 'has-sub' : ''} ${isEntfall ? 'sub-entfall' : ''}">
              <div class="slot-subject">${slot.subject}</div>
              <div class="slot-meta">
                <span class="slot-teacher">${sub && sub.vertrVon ? sub.vertrVon : (slot.teacher || '—')}</span>
                <span class="slot-room">${sub && sub.room && sub.room !== '---' ? sub.room : (slot.room || '')}</span>
              </div>
              ${subBadge}
            </div>
          </td>
        `;
      } else {
        html += `<td><div class="timetable-slot empty"></div></td>`;
      }
    });
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
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
    console.error('Fehler beim Laden der Benutzer:', err);
  }
}

function renderUsers() {
  const search = (document.getElementById('globalSearchInput')?.value || '').toLowerCase().trim();
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
          <md-icon-button class="copy-creds-btn" data-username="${u.username}" data-password="${u.initialPassword || ''}" data-class="${u.assignedClass || ''}" title="Zugangsdaten kopieren">
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

  document.querySelectorAll('.action-edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const uname = btn.getAttribute('data-username');
      openEditUserModal(uname, usersList);
    });
  });

  document.querySelectorAll('.action-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const uname = btn.getAttribute('data-username');
      openConfirmDeleteDialog(
        `Benutzer "${uname}" löschen?`,
        `Möchtest du das Benutzerkonto "${uname}" wirklich unwiderruflich löschen?`,
        async () => {
          await authFetch(`/api/admin/users/${encodeURIComponent(uname)}`, { method: 'DELETE' });
          showToast(`Benutzer "${uname}" gelöscht.`);
          loadUsers();
        }
      );
    });
  });
}

// --- SUBSTITUTIONS LOGIC ---
async function loadSubs() {
  try {
    const res = await authFetch('/api/substitutions');
    const data = await res.json();
    subsList = data.entries || [];
    renderSubs();
    updateStats();
  } catch (err) {
    console.error('Fehler beim Laden der Vertretungen:', err);
  }
}

function renderSubs() {
  const tbody = document.getElementById('subsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = subsList.filter(s => currentSubClassFilter === 'all' || s.className.toLowerCase() === currentSubClassFilter.toLowerCase());

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
      <td>${s.room || '—'}</td>
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
        `Möchtest du die Vertretung für "${name}" wirklich löschen?`,
        async () => {
          await authFetch(`/api/admin/substitutions/${encodeURIComponent(id)}`, { method: 'DELETE' });
          showToast('Vertretungseintrag gelöscht.');
          loadSubs();
        }
      );
    });
  });
}

// --- KLASSENVERWALTUNG LOGIC ---
async function loadClasses() {
  try {
    const res = await authFetch('/api/admin/classes');
    classesList = await res.json();
    renderClasses();
    populateTimetableClassDropdown();
    populateClassDropdown();
    updateStats();
  } catch (e) {
    console.error('Fehler beim Laden der Klassen:', e);
  }
}

function renderClasses() {
  const tbody = document.getElementById('classesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (classesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">Keine Klassen angelegt</td></tr>`;
    return;
  }

  classesList.forEach(c => {
    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.style.cursor = 'pointer';
    tr.title = `Klicke, um Schüler & Details von Klasse ${c.code} anzuzeigen`;
    tr.innerHTML = `
      <td><span class="class-chip" style="font-size:0.9rem;">${c.code}</span></td>
      <td><strong>${c.grade || '—'}</strong></td>
      <td><span class="role-badge role-schueler">${c.branch || 'Realschule'}</span></td>
      <td>${c.teacher || '—'}</td>
      <td>${c.room ? `<strong style="color:var(--md-sys-color-primary);">${c.room}</strong>` : '—'}</td>
      <td><span class="class-chip" style="background:var(--md-sys-color-surface-container); font-size:0.85rem;"><span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle; margin-right:4px;">group</span>${c.studentCount || 0}</span></td>
      <td>
        <div class="row-actions" onclick="event.stopPropagation();">
          <md-icon-button class="btn-detail-class" data-code="${c.code}" title="Schüler & Details anzeigen">
            <span class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">group</span>
          </md-icon-button>
          <md-outlined-button class="btn-open-timetable" data-code="${c.code}" title="Stundenplan dieser Klasse öffnen">
            <span slot="icon" class="material-symbols-outlined">schedule</span>
            Stundenplan
          </md-outlined-button>
          <md-icon-button class="btn-edit-class" data-code="${c.code}" title="Klasse bearbeiten">
            <span class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">edit</span>
          </md-icon-button>
          <md-icon-button class="btn-delete-class" data-code="${c.code}" title="Klasse löschen">
            <span class="material-symbols-outlined" style="color:var(--md-sys-color-error);">delete</span>
          </md-icon-button>
        </div>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.row-actions')) return;
      openClassDetailModal(c);
    });

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-detail-class').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = btn.getAttribute('data-code');
      const item = classesList.find(c => c.code === code);
      if (item) openClassDetailModal(item);
    });
  });

  tbody.querySelectorAll('.btn-open-timetable').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = btn.getAttribute('data-code');
      selectedTimetableClass = code;
      const sel = document.getElementById('timetableClassSelect');
      if (sel) sel.value = code;
      loadTimetableForClass(code);
      navigateTo('/stundenplaene');
    });
  });

  tbody.querySelectorAll('.btn-edit-class').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = btn.getAttribute('data-code');
      const item = classesList.find(c => c.code === code);
      if (item) openClassModal(item);
    });
  });

  tbody.querySelectorAll('.btn-delete-class').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      openConfirmDeleteDialog(
        `Klasse "${code}" löschen?`,
        `Möchtest du die Klasse "${code}" wirklich entfernen? Benutzerkonten dieser Klasse bleiben erhalten.`,
        async () => {
          await authFetch(`/api/admin/classes/${encodeURIComponent(code)}`, { method: 'DELETE' });
          showToast(`Klasse "${code}" gelöscht.`);
          loadClasses();
        }
      );
    });
  });
}

// --- STUNDENPLANVERWALTUNG LOGIC ---
function populateTimetableClassDropdown() {
  const select = document.getElementById('timetableClassSelect');
  if (!select) return;
  select.innerHTML = '';

  if (classesList.length === 0) {
    select.innerHTML = '<md-select-option value=""><div slot="headline">Keine Klassen vorhanden</div></md-select-option>';
    return;
  }

  classesList.forEach((c, idx) => {
    const opt = document.createElement('md-select-option');
    opt.value = c.code;
    if ((!selectedTimetableClass && idx === 0) || selectedTimetableClass === c.code) {
      opt.setAttribute('selected', '');
      if (!selectedTimetableClass) selectedTimetableClass = c.code;
    }
    opt.innerHTML = `<div slot="headline">${c.code} (${c.branch || 'Klasse'})</div>`;
    select.appendChild(opt);
  });

  if (selectedTimetableClass) {
    loadTimetableForClass(selectedTimetableClass);
  }
}

async function loadTimetableForClass(classCode) {
  if (!classCode) return;
  selectedTimetableClass = classCode;
  try {
    const res = await authFetch(`/api/timetables/${encodeURIComponent(classCode)}`);
    currentTimetable = await res.json() || {};
    renderTimetableGrid();
  } catch (e) {
    console.error('Fehler beim Laden des Stundenplans:', e);
  }
}

let draggedSlot = null;
let isDraggingNow = false;

function renderTimetableGrid() {
  const tbody = document.getElementById('timetableGridBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const times = [
    '07:55 - 08:40',
    '08:45 - 09:30',
    '09:50 - 10:35',
    '10:40 - 11:25',
    '11:45 - 12:30',
    '12:35 - 13:20',
    '13:30 - 14:15',
    '14:20 - 15:05'
  ];

  for (let p = 1; p <= 8; p++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="time-cell"><div class="period-num">${p}</div><div>${times[p - 1]}</div></td>`;

    days.forEach(day => {
      const td = document.createElement('td');
      const slot = currentTimetable[day] && currentTimetable[day][p];
      const hasLesson = Boolean(slot && slot.subject);

      if (hasLesson) {
        td.innerHTML = `
          <div class="timetable-slot filled" draggable="true" data-day="${day}" data-period="${p}">
            <div class="slot-subject">${slot.subject}</div>
            <div class="slot-meta">
              <span class="slot-teacher">${slot.teacher || '—'}</span>
              <span class="slot-room">${slot.room || ''}</span>
            </div>
          </div>
        `;
      } else {
        td.innerHTML = `
          <div class="timetable-slot empty" data-day="${day}" data-period="${p}" title="Stunde hinzufügen">
            <span class="material-symbols-outlined" style="font-size:18px;">add</span>
          </div>
        `;
      }

      const slotEl = td.querySelector('.timetable-slot');

      // Drag Source Handler (for filled slots)
      if (hasLesson) {
        slotEl.addEventListener('dragstart', (e) => {
          draggedSlot = { day, period: p, lesson: slot };
          isDraggingNow = true;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify({ day, period: p }));
          setTimeout(() => {
            slotEl.classList.add('is-dragging');
          }, 0);
        });

        slotEl.addEventListener('dragend', () => {
          slotEl.classList.remove('is-dragging');
          document.querySelectorAll('.timetable-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
          draggedSlot = null;
          setTimeout(() => {
            isDraggingNow = false;
          }, 60);
        });
      }

      // Drop Target Handler (both empty and filled slots)
      slotEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedSlot) return;
        if (draggedSlot.day === day && draggedSlot.period === p) return;
        e.dataTransfer.dropEffect = 'move';
        if (!slotEl.classList.contains('drag-over')) {
          slotEl.classList.add('drag-over');
        }
      });

      slotEl.addEventListener('dragleave', (e) => {
        if (!slotEl.contains(e.relatedTarget)) {
          slotEl.classList.remove('drag-over');
        }
      });

      slotEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        slotEl.classList.remove('drag-over');
        if (!draggedSlot) return;

        const sourceDay = draggedSlot.day;
        const sourcePeriod = draggedSlot.period;
        const targetDay = day;
        const targetPeriod = p;

        if (sourceDay === targetDay && sourcePeriod === targetPeriod) return;

        if (!currentTimetable[sourceDay]) currentTimetable[sourceDay] = {};
        if (!currentTimetable[targetDay]) currentTimetable[targetDay] = {};

        const sourceLesson = currentTimetable[sourceDay][sourcePeriod];
        const targetLesson = currentTimetable[targetDay][targetPeriod];

        if (!sourceLesson) return;

        if (targetLesson && targetLesson.subject) {
          // Swap both lessons
          currentTimetable[targetDay][targetPeriod] = sourceLesson;
          currentTimetable[sourceDay][sourcePeriod] = targetLesson;
          showToast(`"${sourceLesson.subject}" und "${targetLesson.subject}" getauscht.`);
        } else {
          // Move lesson to empty slot
          currentTimetable[targetDay][targetPeriod] = sourceLesson;
          delete currentTimetable[sourceDay][sourcePeriod];
          showToast(`"${sourceLesson.subject}" nach ${targetDay}, ${targetPeriod}. Stunde verschoben.`);
        }

        renderTimetableGrid();

        // Persist change to server
        try {
          await authFetch(`/api/admin/timetables/${encodeURIComponent(selectedTimetableClass)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentTimetable)
          });
        } catch (err) {
          showToast('Fehler beim Speichern der Änderung.');
        }
      });

      // Click to edit modal (only when not dragging)
      slotEl.addEventListener('click', () => {
        if (isDraggingNow) return;
        openLessonModal(day, p, slot || {}, async ({ day: d, period: per, lessonData }) => {
          if (!currentTimetable[d]) currentTimetable[d] = {};
          if (lessonData && lessonData.subject) {
            currentTimetable[d][per] = lessonData;
          } else {
            delete currentTimetable[d][per];
          }
          await authFetch(`/api/admin/timetables/${encodeURIComponent(selectedTimetableClass)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentTimetable)
          });
          showToast(`Stundenplan für ${selectedTimetableClass} gespeichert.`);
          renderTimetableGrid();
        });
      });

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }
}

// --- STATS & DROPDOWNS ---
function updateStats() {
  const schuelerCount = usersList.filter(u => u.role === 'schueler').length;
  const lehrerCount = usersList.filter(u => u.role === 'lehrer').length;
  const statsEl = document.getElementById('statsSummary');
  if (statsEl) {
    statsEl.textContent = `${schuelerCount} Schüler, ${lehrerCount} Lehrer, ${classesList.length} Klassen`;
  }
}

function populateClassDropdown() {
  const dropdown = document.getElementById('userClassFilterDropdown');
  if (!dropdown) return;
  const classes = new Set();
  usersList.forEach(u => {
    if (u.assignedClass) classes.add(normalizeClassCode(u.assignedClass));
  });
  classesList.forEach(c => {
    if (c.code) classes.add(normalizeClassCode(c.code));
  });

  const sorted = Array.from(classes).sort();
  let html = '<md-select-option value="" selected><div slot="headline">Alle Klassen</div></md-select-option>';
  sorted.forEach(cls => {
    html += `<md-select-option value="${cls}"><div slot="headline">${cls}</div></md-select-option>`;
  });
  dropdown.innerHTML = html;
}

// --- BOOTSTRAP APP ---
export function initApp() {
  initRouter();

  initModals({
    onUserSaved: () => loadUsers(),
    onSubSaved: () => loadSubs(),
    onClassSaved: () => loadClasses(),
    onLessonSaved: () => renderTimetableGrid(),
    onTimetableImported: async (data) => {
      await loadClasses();
      if (selectedTimetableClass) {
        await loadTimetableForClass(selectedTimetableClass);
      } else if (data.importedClasses && data.importedClasses.length > 0) {
        selectedTimetableClass = data.importedClasses[0];
        const selectEl = document.getElementById('timetableClassSelect');
        if (selectEl) selectEl.value = selectedTimetableClass;
        await loadTimetableForClass(selectedTimetableClass);
      }
    },
    onOpenTimetable: (classCode) => {
      selectedTimetableClass = classCode;
      const selectEl = document.getElementById('timetableClassSelect');
      if (selectEl) selectEl.value = classCode;
      loadTimetableForClass(classCode);
      navigateTo('/stundenplaene');
    },
    getUsersList: () => usersList,
    getClassesList: () => classesList
  });

  // "+ Neu" Button Menu
  const driveNewBtn = document.getElementById('driveNewBtn');
  const newMenu = document.getElementById('newMenu');
  if (driveNewBtn && newMenu) {
    driveNewBtn.addEventListener('click', () => {
      newMenu.open = !newMenu.open;
    });
  }

  // Header User Menu & Actions
  const headerUserMenuBtn = document.getElementById('headerUserMenuBtn');
  const headerUserMenu = document.getElementById('headerUserMenu');
  if (headerUserMenuBtn && headerUserMenu) {
    headerUserMenuBtn.addEventListener('click', () => {
      headerUserMenu.open = !headerUserMenu.open;
    });
  }

  const menuLogoutItem = document.getElementById('menuLogoutItem');
  if (menuLogoutItem) {
    menuLogoutItem.addEventListener('click', () => showLoginScreen());
  }

  const studentLogoutBtn = document.getElementById('studentLogoutBtn');
  if (studentLogoutBtn) {
    studentLogoutBtn.addEventListener('click', () => showLoginScreen());
  }

  const refreshBtn = document.getElementById('headerRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadUsers();
      loadSubs();
      loadClasses();
      showToast('Daten aktualisiert');
    });
  }

  const helpBtn = document.getElementById('headerHelpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => navigateTo('/klassen'));
  }

  // Modals Open Triggers
  document.getElementById('menuAddUser')?.addEventListener('click', openUserModal);
  document.getElementById('canvasAddUserBtn')?.addEventListener('click', openUserModal);
  document.getElementById('menuAddSub')?.addEventListener('click', openSubModal);
  document.getElementById('canvasAddSubBtn')?.addEventListener('click', openSubModal);
  document.getElementById('menuAddClass')?.addEventListener('click', () => openClassModal());
  document.getElementById('canvasAddClassBtn')?.addEventListener('click', () => openClassModal());
  document.getElementById('menuTestClass')?.addEventListener('click', () => navigateTo('/klassen'));

  // Timetable Class Selector Change
  const timetableClassSelect = document.getElementById('timetableClassSelect');
  if (timetableClassSelect) {
    timetableClassSelect.addEventListener('change', (e) => {
      selectedTimetableClass = e.target.value;
      loadTimetableForClass(selectedTimetableClass);
    });
  }

  // Clear Timetable Button
  const clearTimetableBtn = document.getElementById('clearTimetableBtn');
  if (clearTimetableBtn) {
    clearTimetableBtn.addEventListener('click', () => {
      if (!selectedTimetableClass) return;
      openConfirmDeleteDialog(
        `Stundenplan für ${selectedTimetableClass} leeren?`,
        `Möchtest du wirklich alle Stunden im Stundenplan der Klasse ${selectedTimetableClass} löschen?`,
        async () => {
          currentTimetable = {};
          await authFetch(`/api/admin/timetables/${encodeURIComponent(selectedTimetableClass)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          showToast(`Stundenplan für ${selectedTimetableClass} geleert.`);
          renderTimetableGrid();
        }
      );
    });
  }

  // Import Timetable Button
  const importTimetableBtn = document.getElementById('importTimetableBtn');
  if (importTimetableBtn) {
    importTimetableBtn.addEventListener('click', () => {
      openImportTimetableModal(selectedTimetableClass, classesList);
    });
  }

  // Export Timetable Button
  const exportTimetableBtn = document.getElementById('exportTimetableBtn');
  if (exportTimetableBtn) {
    exportTimetableBtn.addEventListener('click', async () => {
      try {
        if (selectedTimetableClass && currentTimetable && Object.keys(currentTimetable).length > 0) {
          const exportObj = {
            [selectedTimetableClass]: currentTimetable
          };
          const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `stundenplan_${selectedTimetableClass}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast(`Stundenplan für ${selectedTimetableClass} exportiert.`);
        } else {
          const res = await authFetch('/api/admin/timetables');
          const allTimetables = await res.json();
          const blob = new Blob([JSON.stringify(allTimetables, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'stundenplaene_alle.json';
          a.click();
          URL.revokeObjectURL(url);
          showToast('Alle Stundenpläne exportiert.');
        }
      } catch (err) {
        showToast('Fehler beim Exportieren.');
      }
    });
  }

  // Student Portal Tabs Switcher
  const tabStudentSubs = document.getElementById('tabStudentSubs');
  const tabStudentTimetable = document.getElementById('tabStudentTimetable');
  const studentSubsView = document.getElementById('studentSubsView');
  const studentTimetableView = document.getElementById('studentTimetableView');

  if (tabStudentSubs && tabStudentTimetable && studentSubsView && studentTimetableView) {
    tabStudentSubs.addEventListener('click', () => {
      tabStudentSubs.setAttribute('selected', '');
      tabStudentTimetable.removeAttribute('selected');
      studentSubsView.style.display = 'block';
      studentSubsView.classList.remove('view-entering');
      void studentSubsView.offsetWidth;
      studentSubsView.classList.add('view-entering');
      studentTimetableView.style.display = 'none';
    });

    tabStudentTimetable.addEventListener('click', () => {
      tabStudentTimetable.setAttribute('selected', '');
      tabStudentSubs.removeAttribute('selected');
      studentSubsView.style.display = 'none';
      studentTimetableView.style.display = 'block';
      studentTimetableView.classList.remove('view-entering');
      void studentTimetableView.offsetWidth;
      studentTimetableView.classList.add('view-entering');
    });
  }

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
      roleChips.forEach(c => c?.removeAttribute('selected'));
      chip.setAttribute('selected', '');
      currentRoleFilter = chip.getAttribute('data-role');
      renderUsers();
    });
  });

  // Global Search
  document.getElementById('globalSearchInput')?.addEventListener('input', () => {
    renderUsers();
  });

  // User Class Filter Dropdown
  document.getElementById('userClassFilterDropdown')?.addEventListener('change', (e) => {
    currentClassFilter = e.target.value;
    renderUsers();
  });

  // Sub Class Filter Chips
  document.querySelectorAll('#subClassChips md-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#subClassChips md-filter-chip').forEach(c => c.removeAttribute('selected'));
      chip.setAttribute('selected', '');
      currentSubClassFilter = chip.getAttribute('data-class-filter') || 'all';
      renderSubs();
    });
  });

  // Clear Subs Button
  document.getElementById('btnClearSubs')?.addEventListener('click', () => {
    openConfirmDeleteDialog(
      'Alle Vertretungspläne löschen?',
      'Möchtest du wirklich alle Vertretungseinträge unwiderruflich löschen?',
      async () => {
        await authFetch('/api/admin/substitutions/clear', { method: 'POST' });
        showToast('Alle Vertretungspläne gelöscht.');
        loadSubs();
      }
    );
  });

  // Live Class Code Tester
  const liveTestInput = document.getElementById('liveTestClassInput');
  const liveTestResult = document.getElementById('liveTestClassResult');
  if (liveTestInput && liveTestResult) {
    liveTestInput.addEventListener('input', () => {
      const val = liveTestInput.value.trim();
      if (!val) {
        liveTestResult.innerHTML = '';
        return;
      }
      const norm = normalizeClassCode(val);
      if (isValidClassCode(norm)) {
        liveTestResult.innerHTML = `<span class="class-chip" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-on-primary-container);">✓ Gültig: ${norm}</span>`;
      } else {
        liveTestResult.innerHTML = `<span style="color:var(--md-sys-color-error);">✗ Ungültig (z. B. 9aR, 8bH)</span>`;
      }
    });
  }

  // --- UNIFIED LOGIN HANDLER ---
  const loginForm = document.getElementById('loginForm');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const usernameField = document.getElementById('loginUsername');
  const passwordField = document.getElementById('loginPassword');

  function clearLoginFieldErrors() {
    if (usernameField) {
      usernameField.error = false;
      usernameField.errorText = '';
    }
    if (passwordField) {
      passwordField.error = false;
      passwordField.errorText = '';
    }
  }

  // Clear error message in real time as soon as user types
  usernameField?.addEventListener('input', () => {
    if (usernameField.error) {
      usernameField.error = false;
      usernameField.errorText = '';
    }
  });
  passwordField?.addEventListener('input', () => {
    if (passwordField.error) {
      passwordField.error = false;
      passwordField.errorText = '';
    }
  });

  async function performLogin() {
    clearLoginFieldErrors();

    const username = (usernameField?.value || usernameField?.shadowRoot?.querySelector('input')?.value || '').trim();
    const password = (passwordField?.value || passwordField?.shadowRoot?.querySelector('input')?.value || '').trim();

    if (!username) {
      if (usernameField) {
        usernameField.error = true;
        usernameField.errorText = 'Fülle dieses Feld aus.';
        usernameField.focus();
      }
      return;
    }

    if (!password) {
      if (passwordField) {
        passwordField.error = true;
        passwordField.errorText = 'Fülle dieses Feld aus.';
        passwordField.focus();
      }
      return;
    }

    if (loginSubmitBtn) loginSubmitBtn.disabled = true;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (usernameField) {
          usernameField.error = true;
          usernameField.errorText = data.error || 'Ungültiger Benutzername oder Passwort.';
          usernameField.focus();
        }
        if (passwordField) {
          passwordField.error = true;
        }
        return;
      }

      setAuthToken(data.token);
      setStoredAdminUser(data.user);

      if (data.user.role === 'schueler') {
        showStudentScreen(data.user);
      } else {
        showAppScreen(data.user);
      }
    } catch (err) {
      if (usernameField) {
        usernameField.error = true;
        usernameField.errorText = 'Verbindung zum Server fehlgeschlagen.';
      }
    } finally {
      if (loginSubmitBtn) loginSubmitBtn.disabled = false;
    }
  }

  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performLogin();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      performLogin();
    });
    loginForm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performLogin();
      }
    });
  }

  usernameField?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordField ? passwordField.focus() : performLogin();
    }
  });

  passwordField?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performLogin();
    }
  });

  window.addEventListener('app:unauthorized', () => {
    showLoginScreen();
  });

  // Check initial authentication
  const token = getAuthToken();
  const user = getStoredAdminUser();

  if (token && user) {
    if (user.role === 'schueler') {
      showStudentScreen(user);
    } else {
      showAppScreen(user);
    }
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
