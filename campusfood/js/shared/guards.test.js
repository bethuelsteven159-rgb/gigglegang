/**
 * @jest-environment jsdom
 */

import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals';

let mockSb;
let redirectSpy;

async function loadGuardsModule({
  adminResult = {
    data: {
      email: 'admin@test.com'
    },
    error: null
  },

  vendorResult = {
    data: {
      id: 'v1'
    },
    error: null
  },

  userResult = {
    data: {
      user: {
        id: 'u1',
        email: 'admin@test.com'
      }
    },
    error: null
  }
} = {}) {
  jest.resetModules();

  const adminsMaybeSingle = jest.fn().mockResolvedValue(adminResult);

  const adminsEq = jest.fn(() => ({
    maybeSingle: adminsMaybeSingle
  }));

  const adminsSelect = jest.fn(() => ({
    eq: adminsEq
  }));

  const vendorsMaybeSingle = jest.fn().mockResolvedValue(vendorResult);

  const vendorsEq = jest.fn(() => ({
    maybeSingle: vendorsMaybeSingle
  }));

  const vendorsSelect = jest.fn(() => ({
    eq: vendorsEq
  }));

  mockSb = {
    auth: {
      getUser: jest.fn().mockResolvedValue(userResult)
    },

    from: jest.fn((table) => {
      if (table === 'admins') {
        return {
          select: adminsSelect
        };
      }

      if (table === 'vendors') {
        return {
          select: vendorsSelect
        };
      }

      return {
        select: jest.fn(() => ({
          eq: jest.fn()
        }))
      };
    })
  };

  jest.unstable_mockModule('../config/supabase.js', () => ({
    sb: mockSb
  }));

  return await import('./guards.js');
}

describe('shared/guards.js', () => {
  beforeEach(() => {
    sessionStorage.clear();

    redirectSpy = jest.fn();

    window.__redirectToHomeForTests = redirectSpy;

    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();

    delete window.__redirectToHomeForTests;
  });

  test('requireRole returns true when role matches expected role', async () => {
    const { requireRole } = await loadGuardsModule();

    sessionStorage.setItem('role', 'student');

    const result = requireRole('student');

    expect(result).toBe(true);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  test('requireRole redirects and returns false when role does not match', async () => {
    const { requireRole } = await loadGuardsModule();

    sessionStorage.setItem('role', 'vendor');

    const result = requireRole('student');

    expect(result).toBe(false);
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireRole redirects and returns false when role is missing', async () => {
    const { requireRole } = await loadGuardsModule();

    const result = requireRole('admin');

    expect(result).toBe(false);
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireAdmin returns true when logged-in user is an admin', async () => {
    const { requireAdmin } = await loadGuardsModule({
      userResult: {
        data: {
          user: {
            id: 'u1',
            email: 'admin@test.com'
          }
        },
        error: null
      },

      adminResult: {
        data: {
          email: 'admin@test.com'
        },
        error: null
      }
    });

    const result = await requireAdmin();

    expect(result).toBe(true);
    expect(mockSb.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mockSb.from).toHaveBeenCalledWith('admins');
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  test('requireAdmin redirects and returns false when user is not logged in', async () => {
    const { requireAdmin } = await loadGuardsModule({
      userResult: {
        data: {
          user: null
        },
        error: null
      }
    });

    const result = await requireAdmin();

    expect(result).toBe(false);
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireAdmin redirects and returns false when auth returns an error', async () => {
    const { requireAdmin } = await loadGuardsModule({
      userResult: {
        data: {
          user: null
        },
        error: {
          message: 'Auth failed'
        }
      }
    });

    const result = await requireAdmin();

    expect(result).toBe(false);
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireAdmin denies access when admin row is missing', async () => {
    const { requireAdmin } = await loadGuardsModule({
      adminResult: {
        data: null,
        error: null
      }
    });

    const result = await requireAdmin();

    expect(result).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Access denied. Admins only.');
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireAdmin denies access when admin query fails', async () => {
    const { requireAdmin } = await loadGuardsModule({
      adminResult: {
        data: null,
        error: {
          message: 'Admin query failed'
        }
      }
    });

    const result = await requireAdmin();

    expect(result).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Access denied. Admins only.');
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireVendor returns true when vendor exists', async () => {
    const { requireVendor } = await loadGuardsModule({
      vendorResult: {
        data: {
          id: 'v1'
        },
        error: null
      }
    });

    sessionStorage.setItem('userId', 'v1');

    const result = await requireVendor();

    expect(result).toBe(true);
    expect(mockSb.from).toHaveBeenCalledWith('vendors');
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  test('requireVendor redirects and returns false when userId is missing', async () => {
    const { requireVendor } = await loadGuardsModule();

    const result = await requireVendor();

    expect(result).toBe(false);
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireVendor denies access when vendor row is missing', async () => {
    const { requireVendor } = await loadGuardsModule({
      vendorResult: {
        data: null,
        error: null
      }
    });

    sessionStorage.setItem('userId', 'v1');

    const result = await requireVendor();

    expect(result).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Access denied. Vendors only.');
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });

  test('requireVendor denies access when vendor query fails', async () => {
    const { requireVendor } = await loadGuardsModule({
      vendorResult: {
        data: null,
        error: {
          message: 'Vendor query failed'
        }
      }
    });

    sessionStorage.setItem('userId', 'v1');

    const result = await requireVendor();

    expect(result).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Access denied. Vendors only.');
    expect(redirectSpy).toHaveBeenCalledWith('index.html');
  });
});
