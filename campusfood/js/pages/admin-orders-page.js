import { renderAdminName } from '../admin/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { loadAllOrders } from '../admin/orders.js';
import { logout } from '../shared/session.js';

export function initAdminOrdersPage() {
  requireRole('admin');
  renderAdminName();
  loadAllOrders();

  window.logout = logout;
}
