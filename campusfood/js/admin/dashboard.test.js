import { renderAdminName } from './dashboard.js';

describe('admin/dashboard.js', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  test('renders username into both admin name elements', () => {
    sessionStorage.setItem('username', 'Bethuel');

    document.body.innerHTML = `
      <span id="adminName"></span>
      <span id="adminNameWelcome"></span>
    `;

    renderAdminName();

    expect(document.getElementById('adminName').textContent).toBe('Bethuel');
    expect(document.getElementById('adminNameWelcome').textContent).toBe('Bethuel');
  });

  test('falls back to Admin when username is missing', () => {
    document.body.innerHTML = `
      <span id="adminName"></span>
      <span id="adminNameWelcome"></span>
    `;

    renderAdminName();

    expect(document.getElementById('adminName').textContent).toBe('Admin');
    expect(document.getElementById('adminNameWelcome').textContent).toBe('Admin');
  });

  test('does not crash if elements are missing', () => {
    sessionStorage.setItem('username', 'Bethuel');
    expect(() => renderAdminName()).not.toThrow();
  });
});