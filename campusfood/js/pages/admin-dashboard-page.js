import { renderAdminName } from '../admin/dashboard.js';
import { requireRole } from '../shared/guards.js';

export function initAdminDashboardPage() {
  requireRole('admin');
  renderAdminName();
}
