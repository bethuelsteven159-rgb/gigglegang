import { renderStudentName } from '../student/dashboard.js';
import { requireRole } from '../shared/guards.js';

export function initStudentDashboardPage() {
  requireRole('student');
  renderStudentName();
}
