import { jest } from '@jest/globals';

const mockGetSession = jest.fn();
const mockSignOut = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut
    }
  }
}));

const {
  storeSessionUser,
  getSessionUserId,
  getSessionUsername,
  getSessionRole,
  clearSession,
  getUserId,
  logout
} = await import('./session.js');

describe('session.js', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mockGetSession.mockReset();
    mockSignOut.mockReset();
    global.console.error = jest.fn();
  });

  test('storeSessionUser stores user details in sessionStorage', () => {
    const user = { id: '123', email: 'test@example.com' };

    storeSessionUser(user, 'student', 'bethuel');

    expect(sessionStorage.getItem('userId')).toBe('123');
    expect(sessionStorage.getItem('email')).toBe('test@example.com');
    expect(sessionStorage.getItem('username')).toBe('bethuel');
    expect(sessionStorage.getItem('role')).toBe('student');
  });

  test('getSessionUserId returns stored userId', () => {
    sessionStorage.setItem('userId', 'abc123');
    expect(getSessionUserId()).toBe('abc123');
  });

  test('getSessionUsername returns stored username', () => {
    sessionStorage.setItem('username', 'Bethuel');
    expect(getSessionUsername()).toBe('Bethuel');
  });

  test('getSessionRole returns stored role', () => {
    sessionStorage.setItem('role', 'vendor');
    expect(getSessionRole()).toBe('vendor');
  });

  test('clearSession clears sessionStorage', () => {
    sessionStorage.setItem('userId', '123');
    sessionStorage.setItem('role', 'student');

    clearSession();

    expect(sessionStorage.getItem('userId')).toBeNull();
    expect(sessionStorage.getItem('role')).toBeNull();
  });

  test('getUserId returns user id from Supabase session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-999' }
        }
      },
      error: null
    });

    const result = await getUserId();

    expect(result).toBe('user-999');
  });

  test('getUserId returns null when Supabase returns an error', async () => {
    mockGetSession.mockResolvedValue({
      data: null,
      error: { message: 'Session failed' }
    });

    const result = await getUserId();

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  test('logout signs out, clears storage, and removes cart', async () => {
    mockSignOut.mockResolvedValue({});
    sessionStorage.setItem('userId', '123');
    localStorage.setItem('cart', '[]');

    await logout();

    expect(mockSignOut).toHaveBeenCalled();
    expect(sessionStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('cart')).toBeNull();
  });

  test('logout still clears storage even if signOut fails', async () => {
    mockSignOut.mockRejectedValue(new Error('Sign out failed'));
    sessionStorage.setItem('userId', '123');
    localStorage.setItem('cart', '[]');

    await logout();

    expect(console.error).toHaveBeenCalled();
    expect(sessionStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('cart')).toBeNull();
  });
});