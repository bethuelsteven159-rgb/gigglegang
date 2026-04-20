import { jest } from '@jest/globals';

const mockSignInWithGoogle = jest.fn();
const mockCheckLoginAfterRedirect = jest.fn();
const mockSaveRoleForFirstTimeUser = jest.fn();

jest.unstable_mockModule('../auth/login.js', () => ({
  signInWithGoogle: mockSignInWithGoogle,
  checkLoginAfterRedirect: mockCheckLoginAfterRedirect
}));

jest.unstable_mockModule('../auth/role-selection.js', () => ({
  saveRoleForFirstTimeUser: mockSaveRoleForFirstTimeUser
}));

const { initIndexPage } = await import('./index-page.js');

describe('index-page.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockSignInWithGoogle.mockReset();
    mockCheckLoginAfterRedirect.mockReset();
    mockSaveRoleForFirstTimeUser.mockReset();
  });

  test('attaches click handlers and checks login after redirect', () => {
    document.body.innerHTML = `
      <button id="googleLoginBtn"></button>
      <button id="saveRoleBtn"></button>
    `;

    initIndexPage();

    document.getElementById('googleLoginBtn').click();
    document.getElementById('saveRoleBtn').click();

    expect(mockSignInWithGoogle).toHaveBeenCalled();
    expect(mockSaveRoleForFirstTimeUser).toHaveBeenCalled();
    expect(mockCheckLoginAfterRedirect).toHaveBeenCalled();
  });

  test('still checks login after redirect even when buttons are missing', () => {
    initIndexPage();

    expect(mockCheckLoginAfterRedirect).toHaveBeenCalled();
  });
});