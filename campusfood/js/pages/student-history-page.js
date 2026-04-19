import { requireRole } from '../shared/guards.js';
import { renderStudentName } from '../student/dashboard.js';
import {
  initStudentHistoryPage as initStudentHistoryFeature,
  submitReview,
  closeModal,
  deleteReview
} from '../student/history.js';
import { logout } from '../shared/session.js';

export function initStudentHistoryPage() {
  requireRole('student');
  renderStudentName();

  initStudentHistoryFeature();

  window.submitReview = submitReview;
  window.closeModal = closeModal;
  window.closeReviewModal = closeModal;
  window.deleteReview = deleteReview;
  window.logout = logout;
}
