import { jest } from '@jest/globals';

const mockRenderVendorName = jest.fn();
const mockRequireRole = jest.fn();

jest.unstable_mockModule('../vendor/dashboard.js', () => ({
  renderVendorName: mockRenderVendorName
}));

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

const { initVendorDashboardPage } = await import('./vendor-dashboard-page.js');

describe('vendor-dashboard-page.js', () => {
  beforeEach(() => {
    mockRenderVendorName.mockReset();
    mockRequireRole.mockReset();
  });

  test('requires vendor role and renders vendor name', () => {
    initVendorDashboardPage();

    expect(mockRequireRole).toHaveBeenCalledWith('vendor');
    expect(mockRenderVendorName).toHaveBeenCalled();
  });
});