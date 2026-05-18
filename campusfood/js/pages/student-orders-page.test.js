/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

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

function setupDOM() {
  document.body.innerHTML = `
    <section id="menuView" style="display: block;"></section>
    <section id="vendorsView" style="display: none;"></section>

    <button id="browseByMenuBtn" class="btn btn-primary">Browse menu</button>
    <button id="browseByVendorBtn" class="btn">Browse vendor</button>
  `;
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDOM();

  delete window.addToCart;
  delete window.removeFromCart;
  delete window.placeOrder;
  delete window.showVendorMenu;
  delete window.resetToAllMenu;
  delete window.logout;
});

describe('student-orders-page.js', () => {
  test('protects the page, renders the student name, and loads the default menu', () => {
    initStudentOrdersPage();

    expect(mockRequireRole).toHaveBeenCalledWith('student');
    expect(mockRenderStudentName).toHaveBeenCalledTimes(1);
    expect(mockLoadStudentMenu).toHaveBeenCalledTimes(1);
  });

  test('exposes inline HTML functions on window', () => {
    initStudentOrdersPage();

    expect(window.addToCart).toBe(mockAddToCart);
    expect(window.removeFromCart).toBe(mockRemoveFromCart);
    expect(window.placeOrder).toBe(mockPlaceOrder);
    expect(window.showVendorMenu).toBe(mockShowVendorMenu);
    expect(window.resetToAllMenu).toBe(mockResetToAllMenu);
    expect(window.logout).toBe(mockLogout);
  });

  test('switches to vendor view when browse by vendor is clicked', () => {
    initStudentOrdersPage();

    const menuView = document.getElementById('menuView');
    const vendorsView = document.getElementById('vendorsView');
    const browseByMenuBtn = document.getElementById('browseByMenuBtn');
    const browseByVendorBtn = document.getElementById('browseByVendorBtn');

    browseByVendorBtn.click();

    expect(menuView.style.display).toBe('none');
    expect(vendorsView.style.display).toBe('block');

    expect(browseByVendorBtn.className).toBe('btn btn-primary');
    expect(browseByMenuBtn.className).toBe('btn');
    expect(browseByMenuBtn.style.background).toBe('var(--surface-alt)');
    expect(browseByMenuBtn.style.color).toBe('var(--text)');

    expect(mockLoadVendorsList).toHaveBeenCalledTimes(1);
  });

  test('switches back to menu view when browse by menu is clicked', () => {
    initStudentOrdersPage();

    const menuView = document.getElementById('menuView');
    const vendorsView = document.getElementById('vendorsView');
    const browseByMenuBtn = document.getElementById('browseByMenuBtn');
    const browseByVendorBtn = document.getElementById('browseByVendorBtn');

    browseByVendorBtn.click();
    browseByMenuBtn.click();

    expect(menuView.style.display).toBe('block');
    expect(vendorsView.style.display).toBe('none');

    expect(browseByMenuBtn.className).toBe('btn btn-primary');
    expect(browseByVendorBtn.className).toBe('btn');
    expect(browseByVendorBtn.style.background).toBe('var(--surface-alt)');
    expect(browseByVendorBtn.style.color).toBe('var(--text)');

    expect(mockLoadStudentMenu).toHaveBeenCalledTimes(2);
  });

  test('does not crash when optional buttons or views are missing', () => {
    document.body.innerHTML = '';

    expect(() => initStudentOrdersPage()).not.toThrow();

    expect(mockRequireRole).toHaveBeenCalledWith('student');
    expect(mockRenderStudentName).toHaveBeenCalledTimes(1);
    expect(mockLoadStudentMenu).toHaveBeenCalledTimes(1);
  });
});
