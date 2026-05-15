import { renderAdminName } from '../admin/dashboard.js';
import { loadCompliance } from '../admin/compliance.js';
import { requireRole, requireAdmin } from '../shared/guards.js';
import { logout } from '../shared/session.js';

export async function initAdminCompliancePage() {
  const roleOk = requireRole('admin');
  if (!roleOk) return;

  const adminOk = await requireAdmin();
  if (!adminOk) return;

  renderAdminName();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  await loadCompliance();
}
