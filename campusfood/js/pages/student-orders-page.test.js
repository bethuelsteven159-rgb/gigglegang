import { jest } from '@jest/globals';

const mockRenderStudentName = jest.fn();
const mockRequireRole = jest.fn();
const mockLoadStudentMenu = jest.fn();
const mockLoadVendorsList = jest.fn();
const mockShowVendorMenu = jest.fn();
const mockResetToAllMenu = jest.fn();
const mockAddToCart = jest.fn();
const mockRemoveFromCart = jest.fn();
const mockPlaceOrder = jest.fn();
const mockLogout = jest.fn();

jest.unstable_mockModule('../student/dashboard.js', () => ({
  renderStudentName: mockRenderStudentName
}));

jest.unstable_mockModule('../shared/guards.js', () => ({
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../student/menu.js', () => ({
  loadStudentMenu: mockLoadStudentMenu
}));

jest.unstable_mockModule('../student/browse-vendors.js', () => ({
  loadVendorsList: mockLoadVendorsList,
  showVendorMenu: mockShowVendorMenu,
  resetToAllMenu: mockResetToAllMenu
}));

jest.unstable_mockModule('../student/cart.js', () => ({
  addToCart: mockAddToCart,
  removeFromCart: mockRemoveFromCart
}));

jest.unstable_mockModule('../student/checkout.js', () => ({
  placeOrder: mockPlaceOrder
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  logout: mockLogout
}));

const { initStudentOrdersPage } = await import('./student-orders-page.js');

describe('student-orders-page.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockRenderStudentName.mockReset();
    mockRequireRole.mockReset();
    mockLoadStudentMenu.mockReset();
    mockLoadVendorsList.mockReset();
    delete window.addToCart;
    delete window.removeFromCart;
    delete window.placeOrder;
    delete window.showVendorMenu;
    delete window.resetToAllMenu;
    delete window.logout;
  });

  test('initializes page, loads menu, and exposes window handlers', () => {
    mockRequireRole.mockReturnValue(true);

    document.body.innerHTML = `
      <div id="menuView"></div>
      <div id="vendorsView"></div>
      <button id="browseByMenuBtn"></button>
      <button id="browseByVendorBtn"></button>
    `;

    initStudentOrdersPage();

    expect(mockRequireRole).toHaveBeenCalledWith('student');
    expect(mockRenderStudentName).toHaveBeenCalled();
    expect(mockLoadStudentMenu).toHaveBeenCalledTimes(1);

    expect(window.addToCart).toBe(mockAddToCart);
    expect(window.removeFromCart).toBe(mockRemoveFromCart);
    expect(window.placeOrder).toBe(mockPlaceOrder);
    expect(window.showVendorMenu).toBe(mockShowVendorMenu);
    expect(window.resetToAllMenu).toBe(mockResetToAllMenu);
    expect(window.logout).toBe(mockLogout);
  });

  test('browse by menu button switches views and reloads student menu', () => {
    mockRequireRole.mockReturnValue(true);

    document.body.innerHTML = `
      <div id="menuView" style="display:none"></div>
      <div id="vendorsView" style="display:block"></div>
      <button id="browseByMenuBtn" class="btn"></button>
      <button id="browseByVendorBtn" class="btn btn-primary"></button>
    `;

    initStudentOrdersPage();

    mockLoadStudentMenu.mockClear();

    document.getElementById('browseByMenuBtn').click();

    expect(document.getElementById('menuView').style.display).toBe('block');
    expect(document.getElementById('vendorsView').style.display).toBe('none');
    expect(document.getElementById('browseByMenuBtn').className).toBe('btn btn-primary');
    expect(document.getElementById('browseByVendorBtn').className).toBe('btn');
    expect(mockLoadStudentMenu).toHaveBeenCalledTimes(1);
  });

  test('browse by vendor button switches views and loads vendors list', () => {
    mockRequireRole.mockReturnValue(true);

    document.body.innerHTML = `
      <div id="menuView" style="display:block"></div>
      <div id="vendorsView" style="display:none"></div>
      <button id="browseByMenuBtn" class="btn btn-primary"></button>
      <button id="browseByVendorBtn" class="btn"></button>
    `;

    initStudentOrdersPage();

    document.getElementById('browseByVendorBtn').click();

    expect(document.getElementById('menuView').style.display).toBe('none');
    expect(document.getElementById('vendorsView').style.display).toBe('block');
    expect(document.getElementById('browseByVendorBtn').className).toBe('btn btn-primary');
    expect(document.getElementById('browseByMenuBtn').className).toBe('btn');
    expect(mockLoadVendorsList).toHaveBeenCalledTimes(1);
  });
});