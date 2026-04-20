import { jest } from '@jest/globals';

const mockRenderAdminName = jest.fn();
const mockRequireRole = jest.fn();
const mockLoadVendors = jest.fn();
const mockUpdateVendorStatus = jest.fn();
const mockDeleteVendor = jest.fn();
const mockCreateVendor = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../admin/dashboard.js', () => ({
  renderAdminName: mockRenderAdminName
}));

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../admin/vendors.js', () => ({
  loadVendors: mockLoadVendors,
  updateVendorStatus: mockUpdateVendorStatus,
  deleteVendor: mockDeleteVendor,
  createVendor: mockCreateVendor
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initAdminVendorsPage } = await import('./admin-vendors-page.js');

describe('admin-vendors-page.js', () => {
  beforeEach(() => {
    mockRenderAdminName.mockReset();
    mockRequireRole.mockReset();
    mockLoadVendors.mockReset();
    delete window.createVendor;
    delete window.updateVendorStatus;
    delete window.deleteVendor;
    delete window.logout;
  });

  test('initializes admin vendors page and exposes window handlers', () => {
    initAdminVendorsPage();

    expect(mockRequireRole).toHaveBeenCalledWith('admin');
    expect(mockRenderAdminName).toHaveBeenCalled();
    expect(mockLoadVendors).toHaveBeenCalled();

    expect(window.createVendor).toBe(mockCreateVendor);
    expect(window.updateVendorStatus).toBe(mockUpdateVendorStatus);
    expect(window.deleteVendor).toBe(mockDeleteVendor);
    expect(window.logout).toBe(mockLogout);
  });
});