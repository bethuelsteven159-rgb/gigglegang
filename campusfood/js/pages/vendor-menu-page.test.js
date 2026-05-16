import { jest } from '@jest/globals';

const mockRenderVendorName = jest.fn();
const mockRequireRole      = jest.fn();
const mockLoadVendorMenu   = jest.fn();
const mockOpenAddModal     = jest.fn();
const mockCloseAddModal    = jest.fn();
const mockAddMenuItem      = jest.fn();
const mockToggleSoldOut    = jest.fn();
const mockDeleteMenuItem   = jest.fn();
const mockOpenEditModal    = jest.fn();
const mockCloseEditModal   = jest.fn();
const mockSaveEdit         = jest.fn();
const mockLogout           = jest.fn();

jest.unstable_mockModule('../vendor/dashboard.js', () => ({ renderVendorName: mockRenderVendorName }));
jest.unstable_mockModule('../shared/guards.js',    () => ({ requireRole: mockRequireRole }));
jest.unstable_mockModule('../vendor/menu.js', () => ({
  loadVendorMenu:   mockLoadVendorMenu,
  openAddModal:     mockOpenAddModal,
  closeAddModal:    mockCloseAddModal,
  addMenuItem:      mockAddMenuItem,
  toggleSoldOut:    mockToggleSoldOut,
  deleteMenuItem:   mockDeleteMenuItem,
  openEditModal:    mockOpenEditModal,
  closeEditModal:   mockCloseEditModal,
  saveEdit:         mockSaveEdit
}));
jest.unstable_mockModule('../shared/session.js', () => ({ logout: mockLogout }));

const { initVendorMenuPage } = await import('./vendor-menu-page.js');

describe('vendor-menu-page.js', () => {
  beforeEach(() => {
    mockRenderVendorName.mockReset();
    mockRequireRole.mockReset();
    mockLoadVendorMenu.mockReset();
    [
      'openAddModal','closeAddModal','addMenuItem','toggleSoldOut',
      'deleteMenuItem','openEditModal','closeEditModal','saveEdit','logout'
    ].forEach(k => delete window[k]);
  });

  test('initializes page and exposes all window handlers', () => {
    initVendorMenuPage();

    expect(mockRequireRole).toHaveBeenCalledWith('vendor');
    expect(mockRenderVendorName).toHaveBeenCalled();
    expect(mockLoadVendorMenu).toHaveBeenCalled();

    expect(window.openAddModal).toBe(mockOpenAddModal);
    expect(window.closeAddModal).toBe(mockCloseAddModal);
    expect(window.addMenuItem).toBe(mockAddMenuItem);
    expect(window.toggleSoldOut).toBe(mockToggleSoldOut);
    expect(window.deleteMenuItem).toBe(mockDeleteMenuItem);
    expect(window.openEditModal).toBe(mockOpenEditModal);
    expect(window.closeEditModal).toBe(mockCloseEditModal);
    expect(window.saveEdit).toBe(mockSaveEdit);
    expect(window.logout).toBe(mockLogout);
  });
});
