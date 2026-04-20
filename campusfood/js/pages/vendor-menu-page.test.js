import { jest } from '@jest/globals';

const mockRenderVendorName = jest.fn();
const mockRequireRole = jest.fn();
const mockLoadVendorMenu = jest.fn();
const mockAddMenuItem = jest.fn();
const mockToggleSoldOut = jest.fn();
const mockDeleteMenuItem = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../vendor/dashboard.js', () => ({
  renderVendorName: mockRenderVendorName
}));

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../vendor/menu.js', () => ({
  loadVendorMenu: mockLoadVendorMenu,
  addMenuItem: mockAddMenuItem,
  toggleSoldOut: mockToggleSoldOut,
  deleteMenuItem: mockDeleteMenuItem
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initVendorMenuPage } = await import('./vendor-menu-page.js');

describe('vendor-menu-page.js', () => {
  beforeEach(() => {
    mockRenderVendorName.mockReset();
    mockRequireRole.mockReset();
    mockLoadVendorMenu.mockReset();
    delete window.addMenuItem;
    delete window.toggleSoldOut;
    delete window.deleteMenuItem;
    delete window.logout;
  });

  test('initializes vendor menu page and exposes window handlers', () => {
    initVendorMenuPage();

    expect(mockRequireRole).toHaveBeenCalledWith('vendor');
    expect(mockRenderVendorName).toHaveBeenCalled();
    expect(mockLoadVendorMenu).toHaveBeenCalled();

    expect(window.addMenuItem).toBe(mockAddMenuItem);
    expect(window.toggleSoldOut).toBe(mockToggleSoldOut);
    expect(window.deleteMenuItem).toBe(mockDeleteMenuItem);
    expect(window.logout).toBe(mockLogout);
  });
});