/**
 * @jest-environment jsdom
 */

import { renderVendorName } from '../vendor/dashboard.js';

describe('vendor/dashboard.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
  });

  test('renderVendorName sets username into both elements', () => {
    document.body.innerHTML = `
      <span id="vendorName"></span>
      <span id="vendorNameWelcome"></span>
    `;

    sessionStorage.setItem('username', 'BethuelVendor');

    renderVendorName();

    expect(document.getElementById('vendorName').textContent).toBe('BethuelVendor');
    expect(document.getElementById('vendorNameWelcome').textContent).toBe('BethuelVendor');
  });

  test('renderVendorName falls back to Vendor when username is missing', () => {
    document.body.innerHTML = `
      <span id="vendorName"></span>
      <span id="vendorNameWelcome"></span>
    `;

    renderVendorName();

    expect(document.getElementById('vendorName').textContent).toBe('Vendor');
    expect(document.getElementById('vendorNameWelcome').textContent).toBe('Vendor');
  });

  test('renderVendorName does not crash if elements do not exist', () => {
    sessionStorage.setItem('username', 'BethuelVendor');
    expect(() => renderVendorName()).not.toThrow();
  });

  test('renderVendorName updates only existing element(s)', () => {
    document.body.innerHTML = `<span id="vendorName"></span>`;
    sessionStorage.setItem('username', 'BethuelVendor');

    renderVendorName();

    expect(document.getElementById('vendorName').textContent).toBe('BethuelVendor');
  });
});