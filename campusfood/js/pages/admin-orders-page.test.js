import { jest } from '@jest/globals';

const mockRenderAdminName = jest.fn();
const mockRequireRole = jest.fn();
const mockLoadAllOrders = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../admin/dashboard.js', () => ({
  renderAdminName: mockRenderAdminName
}));

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../admin/orders.js', () => ({
  loadAllOrders: mockLoadAllOrders
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initAdminOrdersPage } = await import('./admin-orders-page.js');

describe('admin-orders-page.js', () => {
  beforeEach(() => {
    mockRenderAdminName.mockReset();
    mockRequireRole.mockReset();
    mockLoadAllOrders.mockReset();
    delete window.logout;
  });

  test('initializes admin orders page and exposes logout', () => {
    initAdminOrdersPage();

    expect(mockRequireRole).toHaveBeenCalledWith('admin');
    expect(mockRenderAdminName).toHaveBeenCalled();
    expect(mockLoadAllOrders).toHaveBeenCalled();
    expect(window.logout).toBe(mockLogout);
  });
});