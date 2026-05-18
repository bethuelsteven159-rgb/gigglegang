import { jest } from '@jest/globals';

const mockRenderAdminName = jest.fn();
const mockRequireRole = jest.fn();
const mockRequireAdmin = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../admin/dashboard.js', () => ({
  renderAdminName: mockRenderAdminName
}));

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole,
  requireAdmin: mockRequireAdmin
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initAdminDashboardPage } = await import('./admin-dashboard-page.js');

describe('admin-dashboard-page.js', () => {
  beforeEach(() => {
    mockRenderAdminName.mockReset();
    mockRequireRole.mockReset();
    mockRequireAdmin.mockReset();
    mockLogout.mockReset();

    delete window.logout;
  });

  test('stops immediately when role check fails', async () => {
    mockRequireRole.mockReturnValue(false);

    await initAdminDashboardPage();

    expect(mockRequireRole).toHaveBeenCalledWith('admin');
    expect(mockRequireAdmin).not.toHaveBeenCalled();
    expect(mockRenderAdminName).not.toHaveBeenCalled();
    expect(window.logout).toBe(mockLogout); // logout wired before guard so button always works
  });

  test('stops when database-level admin check fails', async () => {
    mockRequireRole.mockReturnValue(true);
    mockRequireAdmin.mockResolvedValue(false);

    await initAdminDashboardPage();

    expect(mockRequireRole).toHaveBeenCalledWith('admin');
    expect(mockRequireAdmin).toHaveBeenCalled();
    expect(mockRenderAdminName).not.toHaveBeenCalled();
    expect(window.logout).toBe(mockLogout); // logout wired before guard so button always works
  });

  test('renders admin name and exposes logout when both checks pass', async () => {
    mockRequireRole.mockReturnValue(true);
    mockRequireAdmin.mockResolvedValue(true);

    await initAdminDashboardPage();

    expect(mockRequireRole).toHaveBeenCalledWith('admin');
    expect(mockRequireAdmin).toHaveBeenCalled();
    expect(mockRenderAdminName).toHaveBeenCalled();

    expect(window.logout).toBe(mockLogout);
  });
});
