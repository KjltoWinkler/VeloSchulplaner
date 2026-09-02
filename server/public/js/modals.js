// --- ASTRA M3 MODALS CONTROLLER ---

import { authFetch, showToast, normalizeClassCode, isValidClassCode } from './api.js';

export function createM3Modal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', (e) => {
      if (e.target === el) el.classList.remove('open');
    });
  }
  return {
    show: () => el && el.classList.add('open'),
    close: () => el && el.classList.remove('open'),
    element: el
  };
}

export let userDialog;
export let editUserDialog;
export let subDialog;
export let confirmDeleteDialog;
export let classDialog;
export let lessonDialog;
export let importTimetableDialog;

let onConfirmDeleteCallback = null;
let onClassSavedCallback = null;
let onLessonSavedCallback = null;
let onTimetableImportedCallback = null;
let getUsersListCallback = null;
let getClassesListCallback = null;
let currentEditingClass = null;
let currentEditingLesson = null;
let currentImportClass = '';
let parsedImportData = null;

export function initModals({ onUserSaved, onSubSaved, onClassSaved, onLessonSaved, onTimetableImported, getUsersList, getClassesList }) {
  userDialog = createM3Modal('addUserModal');
  editUserDialog = createM3Modal('editUserModal');
  subDialog = createM3Modal('addSubModal');
  confirmDeleteDialog = createM3Modal('confirmDeleteModal');
  classDialog = createM3Modal('classModal');
  lessonDialog = createM3Modal('lessonModal');
  importTimetableDialog = createM3Modal('importTimetableModal');
  onClassSavedCallback = onClassSaved;
  onLessonSavedCallback = onLessonSaved;
  onTimetableImportedCallback = onTimetableImported;
  getUsersListCallback = getUsersList;
  getClassesListCallback = getClassesList;

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.m3-modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });

  // --- CONFIRM DELETE DIALOG ---
  const confirmBtn = document.getElementById('confirmDeleteConfirmBtn');
  const cancelBtn = document.getElementById('confirmDeleteCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => confirmDeleteDialog.close());
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (onConfirmDeleteCallback) {
        confirmBtn.disabled = true;
        try {
          await onConfirmDeleteCallback();
        } finally {
          confirmBtn.disabled = false;
          confirmDeleteDialog.close();
        }
      }
    });
  }

  // --- ADD USER MODAL ---
  document.getElementById('closeAddUserModal').addEventListener('click', () => userDialog.close());

  document.getElementById('inputRole').addEventListener('change', (e) => {
    const isStudent = e.target.value === 'schueler';
    document.getElementById('classInputGroup').style.display = e.target.value === 'admin' ? 'none' : 'block';
    const classField = document.getElementById('inputClass');
    if (isStudent) {
      classField.setAttribute('required', 'true');
      classField.label = "Klasse (z. B. 9aR, 8bH) *";
    } else {
      classField.removeAttribute('required');
      classField.label = "Klasse (optional für Lehrer)";
    }
  });

  document.getElementById('btnGenPassword').addEventListener('click', () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('inputPassword').value = pwd;
  });

  document.getElementById('inputClass').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    const notice = document.getElementById('classValidationNotice');
    if (!val) { notice.textContent = ''; return; }
    const norm = normalizeClassCode(val);
    if (isValidClassCode(norm)) {
      notice.innerHTML = `<span style="color:#81c995;">✓ Gültig: <strong>${norm}</strong></span>`;
    } else {
      notice.innerHTML = `<span style="color:var(--md-sys-color-error);">✗ Ungültig. Format: z. B. 9aR, 8bH (Stufe + a/b/c + H/R)</span>`;
    }
  });

  document.getElementById('submitAddUserBtn').addEventListener('click', async () => {
    const username = document.getElementById('inputUsername').value.trim();
    const password = document.getElementById('inputPassword').value.trim();
    const name = document.getElementById('inputName').value.trim();
    const role = document.getElementById('inputRole').value;
    const rawClass = document.getElementById('inputClass').value.trim();
    const errEl = document.getElementById('userModalError');

    errEl.style.display = 'none';

    if (!username || !password) {
      errEl.textContent = 'Benutzername und Passwort sind erforderlich.';
      errEl.style.display = 'block';
      return;
    }

    let assignedClass = '';
    if (role === 'schueler') {
      if (!rawClass) {
        errEl.textContent = 'Schüler müssen einer gültigen Klasse zugewiesen sein (z. B. 9aR).';
        errEl.style.display = 'block';
        return;
      }
      assignedClass = normalizeClassCode(rawClass);
      if (!isValidClassCode(assignedClass)) {
        errEl.textContent = `Ungültiges Klassenkürzel "${rawClass}". Erlaubt: z. B. 9aR, 8bH, 10cR.`;
        errEl.style.display = 'block';
        return;
      }
    } else if (role === 'lehrer' && rawClass) {
      assignedClass = normalizeClassCode(rawClass);
      if (!isValidClassCode(assignedClass)) {
        errEl.textContent = `Ungültiges Klassenkürzel "${rawClass}". Erlaubt: z. B. 9aR, 8bH.`;
        errEl.style.display = 'block';
        return;
      }
    }

    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, role, assignedClass })
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Fehler beim Erstellen des Benutzers.';
        errEl.style.display = 'block';
        return;
      }
      userDialog.close();
      showToast(`Benutzer "${username}" erfolgreich erstellt.`);
      if (onUserSaved) onUserSaved();
    } catch (err) {
      errEl.textContent = 'Verbindungsfehler zum Server.';
      errEl.style.display = 'block';
    }
  });

  // --- EDIT USER MODAL ---
  document.getElementById('closeEditUserModal').addEventListener('click', () => editUserDialog.close());

  document.getElementById('editRole').addEventListener('change', (e) => {
    document.getElementById('editClassInputGroup').style.display = e.target.value === 'admin' ? 'none' : 'block';
  });

  document.getElementById('btnGenEditPassword').addEventListener('click', () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('editPassword').value = pwd;
  });

  document.getElementById('editClass').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    const notice = document.getElementById('editClassValidationNotice');
    if (!val) { notice.textContent = ''; return; }
    const norm = normalizeClassCode(val);
    if (isValidClassCode(norm)) {
      notice.innerHTML = `<span style="color:#81c995;">✓ Gültig: <strong>${norm}</strong></span>`;
    } else {
      notice.innerHTML = `<span style="color:var(--md-sys-color-error);">✗ Ungültig (z. B. 9aR, 8bH)</span>`;
    }
  });

  document.getElementById('submitEditUserBtn').addEventListener('click', async () => {
    const username = document.getElementById('editUsername').value;
    const name = document.getElementById('editName').value.trim();
    const password = document.getElementById('editPassword').value.trim();
    const role = document.getElementById('editRole').value;
    const rawClass = document.getElementById('editClass').value.trim();
    const errEl = document.getElementById('editUserModalError');

    const payload = { role, name };
    if (password) payload.password = password;
    if (role !== 'admin') {
      if (rawClass) {
        const norm = normalizeClassCode(rawClass);
        if (!isValidClassCode(norm)) {
          errEl.textContent = 'Klassenkürzel ungültig (z. B. 9aR, 8bH).';
          errEl.style.display = 'block';
          return;
        }
        payload.assignedClass = norm;
      } else {
        payload.assignedClass = '';
      }
    } else {
      payload.assignedClass = '';
    }

    try {
      const res = await authFetch(`/api/admin/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Fehler beim Bearbeiten.';
        errEl.style.display = 'block';
        return;
      }
      editUserDialog.close();
      showToast(`Benutzer "${username}" erfolgreich aktualisiert.`);
      if (onUserSaved) onUserSaved();
    } catch(e) {
      errEl.textContent = 'Verbindungsfehler.';
      errEl.style.display = 'block';
    }
  });

  // --- ADD SUBSTITUTION MODAL ---
  document.getElementById('closeAddSubModal').addEventListener('click', () => subDialog.close());

  const submitSubBtn = document.getElementById('submitAddSubBtn');
  if (submitSubBtn) {
    submitSubBtn.addEventListener('click', async () => {
      const day = document.getElementById('inputSubDay')?.value?.trim() || '';
      const rawClass = document.getElementById('inputSubClass')?.value?.trim() || '';
      const lesson = document.getElementById('inputSubLesson')?.value?.trim() || '';
      const subject = document.getElementById('inputSubSubject')?.value?.trim() || '';
      const art = document.getElementById('inputSubArt')?.value || 'Vertretung';
      const room = document.getElementById('inputSubRoom')?.value?.trim() || '';
      const vertrVon = document.getElementById('inputSubVertrVon')?.value?.trim() || '';
      const nach = document.getElementById('inputSubNach')?.value?.trim() || '';
      const text = document.getElementById('inputSubText')?.value?.trim() || '';
      const errEl = document.getElementById('subModalError');

      if (errEl) errEl.style.display = 'none';

    if (!day || !rawClass || !lesson || !subject) {
      errEl.textContent = 'Tag, Klasse, Stunde und Fach sind Pflichtfelder.';
      errEl.style.display = 'block';
      return;
    }

    const className = normalizeClassCode(rawClass);
    if (!isValidClassCode(className)) {
      errEl.textContent = `Ungültiges Klassenkürzel "${rawClass}". Erlaubt: z. B. 9aR, 8bH, 10cR.`;
      errEl.style.display = 'block';
      return;
    }

    try {
      const res = await authFetch('/api/admin/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, className, lesson, subject, art, room, vertrVon, nach, text })
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Fehler beim Anlegen der Vertretung.';
        errEl.style.display = 'block';
        return;
      }
      subDialog.close();
      showToast('Vertretungseintrag erfolgreich gespeichert.');
      if (onSubSaved) onSubSaved();
    } catch (err) {
      errEl.textContent = 'Verbindungsfehler zum Server.';
      errEl.style.display = 'block';
    }
  });
  }

  // --- CLASS MODAL HANDLERS ---
  const closeClassBtn = document.getElementById('closeClassModal');
  if (closeClassBtn) {
    closeClassBtn.addEventListener('click', () => {
      const tm = document.getElementById('classTeacherMenu');
      if (tm) tm.open = false;
      classDialog.close();
    });
  }

  const inputClassCode = document.getElementById('inputClassCode');
  const classModalNotice = document.getElementById('classModalNotice');
  if (inputClassCode && classModalNotice) {
    inputClassCode.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (!val) { classModalNotice.textContent = ''; return; }
      const norm = normalizeClassCode(val);
      if (isValidClassCode(norm)) {
        classModalNotice.innerHTML = `<span style="color:#81c995;">✓ Gültig: <strong>${norm}</strong></span>`;
      } else {
        classModalNotice.innerHTML = `<span style="color:var(--md-sys-color-error);">✗ Ungültig (z. B. 9aR, 8bH)</span>`;
      }
    });
  }

  const submitClassBtn = document.getElementById('submitClassBtn');
  if (submitClassBtn) {
    submitClassBtn.addEventListener('click', async () => {
      const rawCode = document.getElementById('inputClassCode').value.trim();
      const teacher = document.getElementById('inputClassTeacher').value.trim();
      const room = document.getElementById('inputClassRoom').value.trim();
      const branch = document.getElementById('inputClassBranch').value;
      const errEl = document.getElementById('classModalError');
      errEl.style.display = 'none';

      if (!currentEditingClass) {
        if (!rawCode) {
          errEl.textContent = 'Klassenkürzel ist erforderlich.';
          errEl.style.display = 'block';
          return;
        }
        const code = normalizeClassCode(rawCode);
        if (!isValidClassCode(code)) {
          errEl.textContent = `Ungültiges Klassenkürzel "${rawCode}". Erlaubt: z. B. 9aR, 8bH.`;
          errEl.style.display = 'block';
          return;
        }

        try {
          const res = await authFetch('/api/admin/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, teacher, room, branch })
          });
          const data = await res.json();
          if (!res.ok) {
            errEl.textContent = data.error || 'Fehler beim Anlegen der Klasse.';
            errEl.style.display = 'block';
            return;
          }
          classDialog.close();
          showToast(`Klasse "${code}" erfolgreich erstellt.`);
          if (onClassSavedCallback) onClassSavedCallback();
        } catch (e) {
          errEl.textContent = 'Verbindungsfehler.';
          errEl.style.display = 'block';
        }
      } else {
        // Editing existing class
        try {
          const res = await authFetch(`/api/admin/classes/${encodeURIComponent(currentEditingClass.code)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacher, room, branch })
          });
          const data = await res.json();
          if (!res.ok) {
            errEl.textContent = data.error || 'Fehler beim Bearbeiten der Klasse.';
            errEl.style.display = 'block';
            return;
          }
          classDialog.close();
          showToast(`Klasse "${currentEditingClass.code}" aktualisiert.`);
          if (onClassSavedCallback) onClassSavedCallback();
        } catch (e) {
          errEl.textContent = 'Verbindungsfehler.';
          errEl.style.display = 'block';
        }
      }
    });
  }

  // --- CLASS TEACHER COMBOBOX DROPDOWN HANDLERS ---
  const teacherInput = document.getElementById('inputClassTeacher');
  const teacherToggleBtn = document.getElementById('btnToggleClassTeacherMenu');
  const teacherMenu = document.getElementById('classTeacherMenu');

  if (teacherToggleBtn && teacherMenu) {
    teacherToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      populateTeacherMenu(teacherInput ? teacherInput.value : '');
      teacherMenu.open = !teacherMenu.open;
    });
  }

  if (teacherInput && teacherMenu) {
    teacherInput.addEventListener('input', () => {
      populateTeacherMenu(teacherInput.value);
      if (!teacherMenu.open) {
        teacherMenu.open = true;
      }
    });

    teacherInput.addEventListener('focus', () => {
      populateTeacherMenu(teacherInput.value);
      teacherMenu.open = true;
    });
  }

  // --- LESSON MODAL HANDLERS ---
  const closeLessonBtn = document.getElementById('closeLessonModal');
  if (closeLessonBtn) closeLessonBtn.addEventListener('click', () => lessonDialog.close());

  const submitLessonBtn = document.getElementById('submitLessonBtn');
  if (submitLessonBtn) {
    submitLessonBtn.addEventListener('click', () => {
      const subject = document.getElementById('inputLessonSubject').value.trim();
      const teacher = document.getElementById('inputLessonTeacher').value.trim();
      const room = document.getElementById('inputLessonRoom').value.trim();

      if (onLessonSavedCallback && currentEditingLesson) {
        onLessonSavedCallback({
          ...currentEditingLesson,
          lessonData: { subject, teacher, room }
        });
      }
      lessonDialog.close();
    });
  }

  const deleteLessonBtn = document.getElementById('deleteLessonBtn');
  if (deleteLessonBtn) {
    deleteLessonBtn.addEventListener('click', () => {
      if (onLessonSavedCallback && currentEditingLesson) {
        onLessonSavedCallback({
          ...currentEditingLesson,
          lessonData: null
        });
      }
      lessonDialog.close();
    });
  }

  // --- IMPORT TIMETABLES MODAL HANDLERS ---
  const closeImportBtn = document.getElementById('closeImportTimetableModal');
  if (closeImportBtn) closeImportBtn.addEventListener('click', () => importTimetableDialog.close());

  const dropZone = document.getElementById('importTimetableDropZone');
  const fileInput = document.getElementById('importTimetableFileInput');
  const jsonTextarea = document.getElementById('importTimetableJsonText');
  const previewBanner = document.getElementById('importTimetablePreview');
  const importErrorBanner = document.getElementById('importTimetableError');
  const submitImportBtn = document.getElementById('submitImportTimetableBtn');
  const targetClassSelect = document.getElementById('importTimetableTargetClass');
  const downloadTemplateBtn = document.getElementById('downloadTimetableTemplateBtn');

  function validateImportJson() {
    parsedImportData = null;
    if (importErrorBanner) {
      importErrorBanner.style.display = 'none';
      importErrorBanner.textContent = '';
    }
    if (previewBanner) {
      previewBanner.style.display = 'none';
      previewBanner.innerHTML = '';
    }
    if (submitImportBtn) submitImportBtn.disabled = true;

    const raw = jsonTextarea ? jsonTextarea.value.trim() : '';
    if (!raw) return;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      if (importErrorBanner) {
        importErrorBanner.textContent = `JSON-Syntaxfehler: ${e.message}`;
        importErrorBanner.style.display = 'block';
      }
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      if (importErrorBanner) {
        importErrorBanner.textContent = 'JSON muss ein Objekt mit Klassen- oder Wochentag-Strukturen sein.';
        importErrorBanner.style.display = 'block';
      }
      return;
    }

    const dayNames = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
    const keys = Object.keys(parsed);
    const isSingleClass = keys.some(k => dayNames.includes(k.toLowerCase()));

    let classesDetected = [];
    let lessonCount = 0;

    if (isSingleClass) {
      const targetVal = targetClassSelect ? targetClassSelect.value : 'auto';
      const targetCode = targetVal !== 'auto' ? targetVal : (currentImportClass || 'Aktuelle Klasse');
      classesDetected.push(targetCode);
      for (const day of Object.values(parsed)) {
        if (day && typeof day === 'object') {
          lessonCount += Object.keys(day).length;
        }
      }
    } else {
      for (const [cls, sched] of Object.entries(parsed)) {
        if (sched && typeof sched === 'object') {
          classesDetected.push(normalizeClassCode(cls));
          for (const day of Object.values(sched)) {
            if (day && typeof day === 'object') {
              lessonCount += Object.keys(day).length;
            }
          }
        }
      }
    }

    if (classesDetected.length === 0 || lessonCount === 0) {
      if (importErrorBanner) {
        importErrorBanner.textContent = 'Keine Unterrichtsstunden im JSON gefunden.';
        importErrorBanner.style.display = 'block';
      }
      return;
    }

    parsedImportData = {
      isSingleClass,
      data: parsed
    };

    if (previewBanner) {
      previewBanner.innerHTML = `<span class="material-symbols-outlined" style="vertical-align:middle; font-size:18px; margin-right:4px;">check_circle</span> ` +
        `<strong>Gültiges Format erkannt:</strong> ${classesDetected.length} Klasse(n) (${classesDetected.slice(0, 5).join(', ')}${classesDetected.length > 5 ? '...' : ''}) mit ${lessonCount} Unterrichtsstunden.`;
      previewBanner.style.display = 'block';
    }

    if (submitImportBtn) submitImportBtn.disabled = false;
  }

  function handleImportFile(file) {
    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast('Bitte wähle eine Datei mit der Endung .json aus.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (jsonTextarea) {
        jsonTextarea.value = event.target.result;
        validateImportJson();
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--md-sys-color-primary)';
      dropZone.style.background = 'var(--md-sys-color-surface-container)';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--md-sys-color-outline-variant)';
      dropZone.style.background = 'var(--md-sys-color-surface-container-low)';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--md-sys-color-outline-variant)';
      dropZone.style.background = 'var(--md-sys-color-surface-container-low)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImportFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImportFile(e.target.files[0]);
      }
    });
  }

  if (jsonTextarea) {
    jsonTextarea.addEventListener('input', () => validateImportJson());
  }

  if (targetClassSelect) {
    targetClassSelect.addEventListener('change', () => validateImportJson());
  }

  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', () => {
      const sample = {
        "9aR": {
          "Montag": {
            "1": { "subject": "Mathematik", "teacher": "Hr. Müller", "room": "R101" },
            "2": { "subject": "Deutsch", "teacher": "Fr. Schmidt", "room": "R101" },
            "3": { "subject": "Englisch", "teacher": "Hr. Klein", "room": "R102" }
          },
          "Dienstag": {
            "1": { "subject": "Biologie", "teacher": "Fr. Weber", "room": "BIO" },
            "2": { "subject": "Chemie", "teacher": "Hr. Koch", "room": "CH1" }
          }
        }
      };
      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stundenplan_muster.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (submitImportBtn) {
    submitImportBtn.addEventListener('click', async () => {
      if (!parsedImportData) return;
      submitImportBtn.disabled = true;

      try {
        let payload = {};
        const targetVal = targetClassSelect ? targetClassSelect.value : 'auto';

        if (parsedImportData.isSingleClass) {
          const targetClass = targetVal !== 'auto' ? targetVal : currentImportClass;
          if (!targetClass) {
            if (importErrorBanner) {
              importErrorBanner.textContent = 'Bitte wähle eine Zielklasse für diesen Stundenplan aus.';
              importErrorBanner.style.display = 'block';
            }
            submitImportBtn.disabled = false;
            return;
          }
          payload = {
            classCode: targetClass,
            schedule: parsedImportData.data
          };
        } else {
          payload = {
            timetables: parsedImportData.data
          };
        }

        const res = await authFetch('/api/admin/timetables/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          if (importErrorBanner) {
            importErrorBanner.textContent = data.error || 'Fehler beim Importieren.';
            importErrorBanner.style.display = 'block';
          }
          submitImportBtn.disabled = false;
          return;
        }

        importTimetableDialog.close();
        showToast(data.message || 'Stundenplan erfolgreich importiert!');
        if (onTimetableImportedCallback) {
          onTimetableImportedCallback(data);
        }
      } catch (err) {
        if (importErrorBanner) {
          importErrorBanner.textContent = 'Verbindungsfehler zum Server.';
          importErrorBanner.style.display = 'block';
        }
        submitImportBtn.disabled = false;
      }
    });
  }
}

export function openConfirmDeleteDialog(title, message, onConfirm) {
  document.getElementById('confirmDeleteTitle').textContent = title;
  document.getElementById('confirmDeleteMsg').textContent = message;
  onConfirmDeleteCallback = onConfirm;
  confirmDeleteDialog.show();
}

export function openUserModal() {
  document.getElementById('inputUsername').value = '';
  document.getElementById('inputPassword').value = '';
  document.getElementById('inputName').value = '';
  document.getElementById('inputClass').value = '';
  document.getElementById('classValidationNotice').textContent = '';
  document.getElementById('userModalError').style.display = 'none';
  userDialog.show();
}

export function openEditUserModal(username, usersList) {
  const user = usersList.find(u => u.username === username);
  if (!user) return;
  document.getElementById('editUsername').value = user.username;
  document.getElementById('editName').value = user.name || '';
  document.getElementById('editPassword').value = '';
  document.getElementById('editRole').value = user.role;
  document.getElementById('editClass').value = user.assignedClass || '';
  document.getElementById('editClassInputGroup').style.display = user.role === 'admin' ? 'none' : 'block';
  document.getElementById('editClassValidationNotice').textContent = '';
  document.getElementById('editUserModalError').style.display = 'none';
  editUserDialog.show();
}

export function openSubModal() {
  const dayEl = document.getElementById('inputSubDay');
  const classEl = document.getElementById('inputSubClass');
  const lessonEl = document.getElementById('inputSubLesson');
  const subjectEl = document.getElementById('inputSubSubject');
  const roomEl = document.getElementById('inputSubRoom');
  const vertrVonEl = document.getElementById('inputSubVertrVon');
  const nachEl = document.getElementById('inputSubNach');
  const textEl = document.getElementById('inputSubText');
  const errEl = document.getElementById('subModalError');

  if (dayEl) dayEl.value = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  if (classEl) classEl.value = '';
  if (lessonEl) lessonEl.value = '';
  if (subjectEl) subjectEl.value = '';
  if (roomEl) roomEl.value = '';
  if (vertrVonEl) vertrVonEl.value = '';
  if (nachEl) nachEl.value = '';
  if (textEl) textEl.value = '';
  if (errEl) errEl.style.display = 'none';

  subDialog.show();
}

export function populateTeacherMenu(filterText = '') {
  const teacherMenu = document.getElementById('classTeacherMenu');
  if (!teacherMenu) return;

  const teacherMap = new Map();

  // 1. Teachers from usersList (users with role === 'lehrer')
  const allUsers = (getUsersListCallback ? getUsersListCallback() : []) || [];
  allUsers.filter(u => u.role === 'lehrer').forEach(u => {
    const displayName = u.name || u.username;
    if (displayName) {
      teacherMap.set(displayName, { name: displayName, username: u.username });
    }
  });

  // 2. Teachers from existing classes
  const allClasses = (getClassesListCallback ? getClassesListCallback() : []) || [];
  allClasses.forEach(c => {
    if (c.teacher && !teacherMap.has(c.teacher)) {
      teacherMap.set(c.teacher, { name: c.teacher, username: '' });
    }
  });

  // 3. Fallback defaults if no teachers yet in the system
  if (teacherMap.size === 0) {
    const defaultSuggestions = [
      { name: 'Hr. Müller (MÜL)', username: 'lehrer_mueller' },
      { name: 'Fr. Schmidt (SCH)', username: '' },
      { name: 'Hr. Klein (KLE)', username: '' },
      { name: 'Fr. Weber (WEB)', username: '' },
      { name: 'Hr. Becker (BEC)', username: '' }
    ];
    defaultSuggestions.forEach(t => teacherMap.set(t.name, t));
  }

  const cleanFilter = (filterText || '').toLowerCase().trim();
  const teachers = Array.from(teacherMap.values()).filter(t => {
    if (!cleanFilter) return true;
    return (t.name || '').toLowerCase().includes(cleanFilter) || (t.username || '').toLowerCase().includes(cleanFilter);
  });

  teacherMenu.innerHTML = '';

  if (teachers.length === 0) {
    const emptyItem = document.createElement('md-menu-item');
    emptyItem.disabled = true;
    emptyItem.innerHTML = `
      <span slot="headline">Kein passender Lehrer</span>
      <span slot="supporting-text">Name frei eingeben</span>
    `;
    teacherMenu.appendChild(emptyItem);
    return;
  }

  teachers.forEach(t => {
    const item = document.createElement('md-menu-item');
    item.setAttribute('data-value', t.name);
    item.innerHTML = `
      <span slot="headline">${t.name}</span>
      ${t.username ? `<span slot="supporting-text">@${t.username}</span>` : ''}
    `;
    item.addEventListener('click', () => {
      const teacherEl = document.getElementById('inputClassTeacher');
      if (teacherEl) {
        teacherEl.value = t.name;
        teacherEl.focus();
      }
      teacherMenu.close();
    });
    teacherMenu.appendChild(item);
  });
}

export function openClassModal(classItem = null) {
  currentEditingClass = classItem;
  const titleEl = document.getElementById('classModalTitle');
  const codeEl = document.getElementById('inputClassCode');
  const teacherEl = document.getElementById('inputClassTeacher');
  const roomEl = document.getElementById('inputClassRoom');
  const branchEl = document.getElementById('inputClassBranch');
  const noticeEl = document.getElementById('classModalNotice');
  const errEl = document.getElementById('classModalError');
  const teacherMenu = document.getElementById('classTeacherMenu');

  if (errEl) errEl.style.display = 'none';
  if (noticeEl) noticeEl.textContent = '';
  if (teacherMenu) teacherMenu.open = false;

  if (classItem) {
    if (titleEl) titleEl.textContent = `Klasse ${classItem.code} bearbeiten`;
    if (codeEl) {
      codeEl.value = classItem.code;
      codeEl.disabled = true;
    }
    if (teacherEl) teacherEl.value = classItem.teacher || '';
    if (roomEl) roomEl.value = classItem.room || '';
    if (branchEl) branchEl.value = classItem.branch || 'Realschule';
  } else {
    if (titleEl) titleEl.textContent = 'Neue Klasse anlegen';
    if (codeEl) {
      codeEl.value = '';
      codeEl.disabled = false;
    }
    if (teacherEl) teacherEl.value = '';
    if (roomEl) roomEl.value = '';
    if (branchEl) branchEl.value = 'Realschule';
  }

  populateTeacherMenu(teacherEl ? teacherEl.value : '');
  classDialog.show();
}

export function openLessonModal(day, period, currentData, onSave) {
  currentEditingLesson = { day, period };
  onLessonSavedCallback = onSave;

  const titleEl = document.getElementById('lessonModalTitle');
  if (titleEl) titleEl.textContent = `${day}, ${period}. Stunde bearbeiten`;

  document.getElementById('inputLessonSubject').value = currentData?.subject || '';
  document.getElementById('inputLessonTeacher').value = currentData?.teacher || '';
  document.getElementById('inputLessonRoom').value = currentData?.room || '';

  lessonDialog.show();
}

export function openImportTimetableModal(selectedClass, classesList = []) {
  currentImportClass = selectedClass || '';
  const fileInput = document.getElementById('importTimetableFileInput');
  if (fileInput) fileInput.value = '';
  const jsonTextarea = document.getElementById('importTimetableJsonText');
  if (jsonTextarea) jsonTextarea.value = '';
  const previewBanner = document.getElementById('importTimetablePreview');
  if (previewBanner) {
    previewBanner.style.display = 'none';
    previewBanner.innerHTML = '';
  }
  const errEl = document.getElementById('importTimetableError');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.textContent = '';
  }
  const submitBtn = document.getElementById('submitImportTimetableBtn');
  if (submitBtn) submitBtn.disabled = true;

  const targetClassSelect = document.getElementById('importTimetableTargetClass');
  if (targetClassSelect) {
    let opts = `<md-select-option value="auto" ${!selectedClass ? 'selected' : ''}>` +
               `<div slot="headline">Automatisch aus JSON erkennen</div>` +
               `</md-select-option>`;
    classesList.forEach(c => {
      const isSel = selectedClass && c.code.toLowerCase() === selectedClass.toLowerCase();
      opts += `<md-select-option value="${c.code}" ${isSel ? 'selected' : ''}>` +
              `<div slot="headline">Klasse ${c.code}</div>` +
              `</md-select-option>`;
    });
    targetClassSelect.innerHTML = opts;
  }

  importTimetableDialog.show();
}
