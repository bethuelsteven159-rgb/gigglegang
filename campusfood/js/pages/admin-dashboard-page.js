import { renderAdminName } from '../admin/dashboard.js';
import { requireRole, requireAdmin } from '../shared/guards.js';
import { logout } from '../shared/session.js';

export async function initAdminDashboardPage() {
  // Connect logout immediately, before any guard can stop the page
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Optional safety bridge, in case old HTML still uses onclick="logout()"
  window.logout = logout;

  // Step 1: quick check
  const roleOk = requireRole('admin');
  if (!roleOk) return;

  // Step 2: real database-level check
  const adminOk = await requireAdmin();
  if (!adminOk) return;

  // Step 3: page logic
  renderAdminName();
}
