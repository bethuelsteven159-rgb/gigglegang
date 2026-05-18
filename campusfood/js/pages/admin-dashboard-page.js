import { renderAdminName } from '../admin/dashboard.js';
import { requireRole, requireAdmin } from '../shared/guards.js';
import { logout } from '../shared/session.js';

export async function initAdminDashboardPage() {
  // Step 1: quick check (fast, UI-level)
  const roleOk = requireRole('admin');
  if (!roleOk) return;

  // Step 2: real check (database-level 🔒)
  const adminOk = await requireAdmin();
  if (!adminOk) return;

  // Step 3: page logic
  renderAdminName();

  // Make logout available to the HTML onclick="logout()"
  window.logout = logout;
}
