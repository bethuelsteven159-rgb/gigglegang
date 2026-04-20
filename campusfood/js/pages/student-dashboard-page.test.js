import { jest } from '@jest/globals';

const mockRenderStudentName = jest.fn();
const mockInitStudentDashboardLiveOrders = jest.fn();
const mockRequireRole = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../student/dashboard.js', () => ({
  renderStudentName: mockRenderStudentName,
  initStudentDashboardLiveOrders: mockInitStudentDashboardLiveOrders
}));

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initStudentDashboardPage } = await import('./student-dashboard-page.js');

describe('student-dashboard-page.js', () => {
  beforeEach(() => {
    mockRenderStudentName.mockReset();
    mockInitStudentDashboardLiveOrders.mockReset();
    mockRequireRole.mockReset();
    mockLogout.mockReset();
    delete window.logout;
  });

  test('stops when requireRole returns false', () => {
    mockRequireRole.mockReturnValue(false);

    initStudentDashboardPage();

    expect(mockRequireRole).toHaveBeenCalledWith('student');
    expect(mockRenderStudentName).not.toHaveBeenCalled();
    expect(mockInitStudentDashboardLiveOrders).not.toHaveBeenCalled();
    expect(window.logout).toBeUndefined();
  });

  test('initializes dashboard and sets window.logout when role is allowed', () => {
    mockRequireRole.mockReturnValue(true);

    initStudentDashboardPage();

    expect(mockRequireRole).toHaveBeenCalledWith('student');
    expect(mockRenderStudentName).toHaveBeenCalled();
    expect(mockInitStudentDashboardLiveOrders).toHaveBeenCalled();
    expect(window.logout).toBe(mockLogout);
  });
});