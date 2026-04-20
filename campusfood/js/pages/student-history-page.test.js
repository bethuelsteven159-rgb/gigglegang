import { jest } from '@jest/globals';

const mockRequireRole = jest.fn();
const mockRenderStudentName = jest.fn();
const mockInitStudentHistoryFeature = jest.fn();
const mockSubmitReview = jest.fn();
const mockCloseModal = jest.fn();
const mockDeleteReview = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../student/dashboard.js', () => ({
  renderStudentName: mockRenderStudentName
}));

jest.unstable_mockModule('../student/history.js', () => ({
  initStudentHistoryPage: mockInitStudentHistoryFeature,
  submitReview: mockSubmitReview,
  closeModal: mockCloseModal,
  deleteReview: mockDeleteReview
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initStudentHistoryPage } = await import('./student-history-page.js');

describe('student-history-page.js', () => {
  beforeEach(() => {
    mockRequireRole.mockReset();
    mockRenderStudentName.mockReset();
    mockInitStudentHistoryFeature.mockReset();
    delete window.submitReview;
    delete window.closeModal;
    delete window.closeReviewModal;
    delete window.deleteReview;
    delete window.logout;
  });

  test('initializes history page and exposes window handlers', () => {
    initStudentHistoryPage();

    expect(mockRequireRole).toHaveBeenCalledWith('student');
    expect(mockRenderStudentName).toHaveBeenCalled();
    expect(mockInitStudentHistoryFeature).toHaveBeenCalled();

    expect(window.submitReview).toBe(mockSubmitReview);
    expect(window.closeModal).toBe(mockCloseModal);
    expect(window.closeReviewModal).toBe(mockCloseModal);
    expect(window.deleteReview).toBe(mockDeleteReview);
    expect(window.logout).toBe(mockLogout);
  });
});