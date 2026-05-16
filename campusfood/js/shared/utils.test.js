/**
 * @jest-environment node
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

let mockSb;
let toast;
let logout;
let checkAuth;
let escapeHtml;

function createMockStorage() {
  const store = new Map();

  return {
    getItem: jest.fn((key) => {
      return store.has(key) ? store.get(key) : null;
    }),

    setItem: jest.fn((key, value) => {
      store.set(key, String(value));
    }),

    removeItem: jest.fn((key) => {
      store.delete(key);
    }),

    clear: jest.fn(() => {
      store.clear();
    }),
  };
}

async function loadUtilsModule() {
  jest.resetModules();

  mockSb = {
    auth: {
      signOut: jest.fn().mockResolvedValue({}),
    },
  };

  jest.unstable_mockModule('../config/supabase.js', () => ({
    sb: mockSb,
  }));

  const module = await import('./utils.js');

  toast = module.toast;
  logout = module.logout;
  checkAuth = module.checkAuth;
  escapeHtml = module.escapeHtml;
}

describe('utils.js', () => {
  let toastElement;

  beforeEach(async () => {
    jest.useFakeTimers();

    toastElement = {
      textContent: '',
      className: '',
    };

    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'toast') return toastElement;
        return null;
      }),
    };

    global.window = {
      location: {
        href: '',
      },
    };

    global.sessionStorage = createMockStorage();
    global.localStorage = createMockStorage();

    await loadUtilsModule();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();

    delete global.document;
    delete global.window;
    delete global.sessionStorage;
    delete global.localStorage;
  });

  test('toast displays a message with the given type', () => {
    toast('Saved successfully', 'success');

    expect(document.getElementById).toHaveBeenCalledWith('toast');
    expect(toastElement.textContent).toBe('Saved successfully');
    expect(toastElement.className).toBe('show success');
  });

  test('toast uses success as the default type', () => {
    toast('Done');

    expect(toastElement.textContent).toBe('Done');
    expect(toastElement.className).toBe('show success');
  });

  test('toast clears the class name after 3 seconds', () => {
    toast('Updated', 'info');

    expect(toastElement.className).toBe('show info');

    jest.advanceTimersByTime(3000);

    expect(toastElement.className).toBe('');
  });

  test('toast does nothing when the toast element does not exist', () => {
    document.getElementById = jest.fn(() => null);

    expect(() => {
      toast('Missing toast element', 'error');
    }).not.toThrow();
  });

  test('logout signs out, clears storage, and redirects to index page', async () => {
    sessionStorage.setItem('role', 'student');
    sessionStorage.setItem('userId', '123');
    localStorage.setItem('theme', 'dark');

    await logout();

    expect(mockSb.auth.signOut).toHaveBeenCalledTimes(1);
    expect(sessionStorage.clear).toHaveBeenCalledTimes(1);
    expect(localStorage.clear).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('index.html');
  });

  test('logout still clears storage and redirects when signOut fails', async () => {
    const error = new Error('Sign out failed');
    mockSb.auth.signOut.mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await logout();

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(sessionStorage.clear).toHaveBeenCalledTimes(1);
    expect(localStorage.clear).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('index.html');
  });

  test('checkAuth returns false and redirects when userId is missing', () => {
    sessionStorage.setItem('role', 'student');

    const result = checkAuth('student');

    expect(result).toBe(false);
    expect(window.location.href).toBe('index.html');
  });

  test('checkAuth returns false and redirects when role does not match required role', () => {
    sessionStorage.setItem('userId', '123');
    sessionStorage.setItem('role', 'vendor');

    const result = checkAuth('student');

    expect(result).toBe(false);
    expect(window.location.href).toBe('index.html');
  });

  test('checkAuth returns true when userId exists and role matches required role', () => {
    sessionStorage.setItem('userId', '123');
    sessionStorage.setItem('role', 'student');

    const result = checkAuth('student');

    expect(result).toBe(true);
    expect(window.location.href).toBe('');
  });

  test('checkAuth returns true when userId exists and no required role is provided', () => {
    sessionStorage.setItem('userId', '123');
    sessionStorage.setItem('role', 'vendor');

    const result = checkAuth();

    expect(result).toBe(true);
    expect(window.location.href).toBe('');
  });

  test('escapeHtml returns empty string for empty values', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('escapeHtml escapes &, <, and > characters', () => {
    const result = escapeHtml('5 > 3 & <script>');

    expect(result).toBe('5 &gt; 3 &amp; &lt;script&gt;');
  });

  test('escapeHtml leaves normal text unchanged', () => {
    expect(escapeHtml('Campus Food')).toBe('Campus Food');
  });
});
