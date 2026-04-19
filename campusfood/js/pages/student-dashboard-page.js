import { renderStudentName, initStudentDashboardLiveOrders } from '../student/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { logout } from '../shared/session.js';

export function initStudentDashboardPage() {
  if (!requireRole('student')) return;

  renderStudentName();
  initStudentDashboardLiveOrders();

  window.logout = logout;
}
