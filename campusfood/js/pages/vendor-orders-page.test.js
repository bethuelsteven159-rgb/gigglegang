import { jest } from '@jest/globals';

const mockRequireRole = jest.fn();
const mockRenderVendorName = jest.fn();
const mockLoadVendorOrders = jest.fn();
const mockUpdateOrderStatus = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../vendor/dashboard.js', () => ({
  renderVendorName: mockRenderVendorName
}));

jest.unstable_mockModule('../vendor/orders.js', () => ({
  loadVendorOrders: mockLoadVendorOrders,
  updateOrderStatus: mockUpdateOrderStatus
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initVendorOrdersPage } = await import('./vendor-orders-page.js');

describe('vendor-orders-page.js', () => {
  beforeEach(() => {
    mockRequireRole.mockReset();
    mockRenderVendorName.mockReset();
    mockLoadVendorOrders.mockReset();
    delete window.updateOrderStatus;
    delete window.logout;
  });

  test('stops when requireRole returns false', async () => {
    mockRequireRole.mockReturnValue(false);

    await initVendorOrdersPage();

    expect(mockRequireRole).toHaveBeenCalledWith('vendor');
    expect(mockRenderVendorName).not.toHaveBeenCalled();
    expect(mockLoadVendorOrders).not.toHaveBeenCalled();
    expect(window.updateOrderStatus).toBeUndefined();
    expect(window.logout).toBeUndefined();
  });

  test('initializes vendor orders page and exposes window handlers', async () => {
    mockRequireRole.mockReturnValue(true);
    mockLoadVendorOrders.mockResolvedValue();

    await initVendorOrdersPage();

    expect(mockRequireRole).toHaveBeenCalledWith('vendor');
    expect(mockRenderVendorName).toHaveBeenCalled();
    expect(mockLoadVendorOrders).toHaveBeenCalled();

    expect(window.updateOrderStatus).toBe(mockUpdateOrderStatus);
    expect(window.logout).toBe(mockLogout);
  });
});