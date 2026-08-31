// --- ASTRA ADMIN API & UTILS ---

const TOKEN_KEY = 'astra_admin_token';
const USER_KEY = 'astra_admin_user';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredAdminUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredAdminUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = Object.assign({}, options.headers || {});
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    setAuthToken(null);
    setStoredAdminUser(null);
    window.dispatchEvent(new CustomEvent('app:unauthorized'));
  }
  return res;
}

export function showToast(message, durationMs = 3500) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  if (!toast || !toastText) return;
  toastText.textContent = message;
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.style.display = 'none';
  }, durationMs);
}

// Canonical class code normalization: e.g. "9ar" -> "9aR", "10bh" -> "10bH"
export function normalizeClassCode(code) {
  if (!code) return "";
  let c = code.trim();
  if (c.length < 2) return c;
  const lastChar = c.slice(-1).toUpperCase();
  const rest = c.slice(0, -1);
  return rest + lastChar;
}

// Strict validation: Stufe (1-13) + a/b/c/d/e/f + H/R/G
export function isValidClassCode(code) {
  if (!code) return false;
  return /^[0-9]{1,2}[a-zA-Z][HRGhrg]?$/.test(code.trim());
}
