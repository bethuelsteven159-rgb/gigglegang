import { jest } from '@jest/globals';

const mockSignInWithOAuth = jest.fn();
const mockGetSession = jest.fn();

const mockToast = jest.fn();
const mockSetLoadingMessage = jest.fn();
const mockShowRoleSection = jest.fn();
const mockGetUsernameFromUser = jest.fn();
const mockRedirectByRole = jest.fn();
const mockStoreSessionUser = jest.fn();
const mockGetExistingRole = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      getSession: mockGetSession
    }
  }
}));

jest.unstable_mockModule('../shared/notifications.js', () => ({
  toast: mockToast
}));

jest.unstable_mockModule('../shared/auth-helpers.js', () => ({
  setLoadingMessage: mockSetLoadingMessage,
  showRoleSection: mockShowRoleSection,
  getUsernameFromUser: mockGetUsernameFromUser,
  redirectByRole: mockRedirectByRole
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  storeSessionUser: mockStoreSessionUser
}));

jest.unstable_mockModule('./role-selection.js', () => ({
  getExistingRole: mockGetExistingRole
}));

const {
  signInWithGoogle,
  checkLoginAfterRedirect
} = await import('./login.js');

describe('login.js', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
    mockGetSession.mockReset();
    mockToast.mockReset();
    mockSetLoadingMessage.mockReset();
    mockShowRoleSection.mockReset();
    mockGetUsernameFromUser.mockReset();
    mockRedirectByRole.mockReset();
    mockStoreSessionUser.mockReset();
    mockGetExistingRole.mockReset();
    global.console.error = jest.fn();
  });

  test('signInWithGoogle starts loading and calls Google OAuth', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    await signInWithGoogle();

    expect(mockSetLoadingMessage).toHaveBeenCalledWith('Redirecting to Google...');
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://bethuelsteven159-rgb.github.io/gigglegang/'
      }
    });
  });

  test('signInWithGoogle handles OAuth error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      error: new Error('OAuth failed')
    });

    await signInWithGoogle();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('OAuth failed', 'error');
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
  });

  test('checkLoginAfterRedirect stops cleanly when there is no session user', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    await checkLoginAfterRedirect();

    expect(mockSetLoadingMessage).toHaveBeenCalledWith('Checking your account...');
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
    expect(mockGetUsernameFromUser).not.toHaveBeenCalled();
  });

  test('checkLoginAfterRedirect shows role section when user has no existing role', async () => {
    const user = { id: 'u1', email: 'bethuel@example.com' };

    mockGetSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    mockGetUsernameFromUser.mockReturnValue('Bethuel');
    mockGetExistingRole.mockResolvedValue(null);

    await checkLoginAfterRedirect();

    expect(mockGetUsernameFromUser).toHaveBeenCalledWith(user);
    expect(mockGetExistingRole).toHaveBeenCalledWith(user);
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
    expect(mockShowRoleSection).toHaveBeenCalledWith(true);
    expect(mockStoreSessionUser).not.toHaveBeenCalled();
    expect(mockRedirectByRole).not.toHaveBeenCalled();
  });

  test('checkLoginAfterRedirect stores session and redirects when role exists', async () => {
    const user = { id: 'u1', email: 'bethuel@example.com' };

    mockGetSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    mockGetUsernameFromUser.mockReturnValue('Bethuel');
    mockGetExistingRole.mockResolvedValue({
      role: 'student',
      username: 'bethuel'
    });

    await checkLoginAfterRedirect();

    expect(mockStoreSessionUser).toHaveBeenCalledWith(user, 'student', 'bethuel');
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
    expect(mockRedirectByRole).toHaveBeenCalledWith('student');
  });

  test('checkLoginAfterRedirect falls back to generated username if existingRole username is missing', async () => {
    const user = { id: 'u1', email: 'bethuel@example.com' };

    mockGetSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    mockGetUsernameFromUser.mockReturnValue('Bethuel');
    mockGetExistingRole.mockResolvedValue({
      role: 'vendor'
    });

    await checkLoginAfterRedirect();

    expect(mockStoreSessionUser).toHaveBeenCalledWith(user, 'vendor', 'Bethuel');
    expect(mockRedirectByRole).toHaveBeenCalledWith('vendor');
  });

  test('checkLoginAfterRedirect handles session error', async () => {
    mockGetSession.mockResolvedValue({
      data: null,
      error: new Error('Session failed')
    });

    await checkLoginAfterRedirect();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Session failed', 'error');
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
  });
});