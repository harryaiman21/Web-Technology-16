// =============================================
//  auth.js — Login / Logout / Session helpers
// =============================================

const SESSION_KEY = 'dhl_user';

/** Save user to session after login */
function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** Get current logged-in user object (or null) */
function getCurrentUser() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Redirect to login if not authenticated. Call at top of every protected page. */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

/** Log out and go back to login */
function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

/** Inject user name + role into the header element with id="user-info" */
function renderUserHeader() {
  const user = getCurrentUser();
  const el = document.getElementById('user-info');
  if (el && user) {
    el.innerHTML = `
      <span class="user-avatar">${user.name.charAt(0)}</span>
      <span>${user.name}</span>
      <span class="role-badge role-${user.role}">${user.role}</span>
    `;
  }
  // Attach logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}
