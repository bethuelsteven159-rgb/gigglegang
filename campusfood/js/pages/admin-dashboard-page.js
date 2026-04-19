import { renderAdminName } from '../admin/dashboard.js';
import { requireRole, requireAdmin } from '../shared/guards.js';

export async function initAdminDashboardPage() {
  // Step 1: quick check (fast, UI-level)
  const roleOk = requireRole('admin');
  if (!roleOk) return;

  // Step 2: real check (database-level 🔒)
  const adminOk = await requireAdmin();
  if (!adminOk) return;

  // Step 3: page logic
  renderAdminName();
}
