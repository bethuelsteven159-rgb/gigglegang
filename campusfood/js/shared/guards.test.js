import { jest } from '@jest/globals';

const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({
  maybeSingle: mockMaybeSingle
}));
const mockSelect = jest.fn(() => ({
  eq: mockEq
}));
const mockFrom = jest.fn(() => ({
  select: mockSelect
}));

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    auth: {
      getUser: mockGetUser
    },
    from: mockFrom
  }
}));

const {
  requireRole,
  requireAdmin,
  requireVendor,
  requireStudent
} = await import('./guards.js');

describe('guards.js', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockGetUser.mockReset();
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();

    global.alert = jest.fn();
  });

  test('requireRole returns true when role matches', () => {
    sessionStorage.setItem('role', 'student');

    const result = requireRole('student');

    expect(result).toBe(true);
  });

  test('requireRole returns false when role does not match', () => {
    sessionStorage.setItem('role', 'vendor');

    const result = requireRole('student');

    expect(result).toBe(false);
  });

  test('requireAdmin returns false when no authenticated user exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    const result = await requireAdmin();

    expect(result).toBe(false);
  });

  test('requireAdmin returns false and alerts when admin record is missing', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'admin@test.com' } },
      error: null
    });

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const result = await requireAdmin();

    expect(mockFrom).toHaveBeenCalledWith('admins');
    expect(result).toBe(false);
    expect(alert).toHaveBeenCalledWith('Access denied. Admins only.');
  });

  test('requireAdmin returns true when admin exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'admin@test.com' } },
      error: null
    });

    mockMaybeSingle.mockResolvedValue({
      data: { email: 'admin@test.com' },
      error: null
    });

    const result = await requireAdmin();

    expect(result).toBe(true);
  });

  test('requireVendor returns false when no userId in session', async () => {
    const result = await requireVendor();

    expect(result).toBe(false);
  });

  test('requireVendor returns false and alerts when vendor record is missing', async () => {
    sessionStorage.setItem('userId', 'vendor-1');

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const result = await requireVendor();

    expect(mockFrom).toHaveBeenCalledWith('vendors');
    expect(result).toBe(false);
    expect(alert).toHaveBeenCalledWith('Access denied. Vendors only.');
  });

  test('requireVendor returns true when vendor exists', async () => {
    sessionStorage.setItem('userId', 'vendor-1');

    mockMaybeSingle.mockResolvedValue({
      data: { id: 'vendor-1', username: 'shop', status: 'approved' },
      error: null
    });

    const result = await requireVendor();

    expect(result).toBe(true);
  });

  test('requireStudent returns false when no userId in session', async () => {
    const result = await requireStudent();

    expect(result).toBe(false);
  });

  test('requireStudent returns false and alerts when student record is missing', async () => {
    sessionStorage.setItem('userId', 'student-1');

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const result = await requireStudent();

    expect(mockFrom).toHaveBeenCalledWith('students');
    expect(result).toBe(false);
    expect(alert).toHaveBeenCalledWith('Access denied. Students only.');
  });

  test('requireStudent returns true when student exists', async () => {
    sessionStorage.setItem('userId', 'student-1');

    mockMaybeSingle.mockResolvedValue({
      data: { id: 'student-1', username: 'bethuel' },
      error: null
    });

    const result = await requireStudent();

    expect(result).toBe(true);
  });
});