import { renderStudentName } from '../student/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { loadStudentOrderHistory } from '../student/history.js';
import { logout } from '../shared/session.js';

export function initStudentHistoryPage() {
  requireRole('student');
  renderStudentName();
  loadStudentOrderHistory();

  window.logout = logout;
}
