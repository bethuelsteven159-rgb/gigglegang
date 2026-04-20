import { jest } from '@jest/globals';

const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({
  maybeSingle: mockMaybeSingle
}));
const mockSelect = jest.fn(() => ({
  eq: mockEq
}));

const mockUpsert = jest.fn();
const mockFrom = jest.fn((table) => ({
  select: mockSelect,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  upsert: mockUpsert
}));

const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();

const mockToast = jest.fn();
const mockSetLoadingMessage = jest.fn();
const mockGetUsernameFromUser = jest.fn();
const mockRedirectByRole = jest.fn();
const mockStoreSessionUser = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
      updateUser: mockUpdateUser
    }
  }
}));

jest.unstable_mockModule('../shared/notifications.js', () => ({
  toast: mockToast
}));

jest.unstable_mockModule('../shared/auth-helpers.js', () => ({
  setLoadingMessage: mockSetLoadingMessage,
  getUsernameFromUser: mockGetUsernameFromUser,
  redirectByRole: mockRedirectByRole
}));

jest.unstable_mockModule('../shared/session.js', () => ({
  storeSessionUser: mockStoreSessionUser
}));

const {
  getExistingRole,
  saveRoleForFirstTimeUser
} = await import('./role-selection.js');

describe('role-selection.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockUpsert.mockReset();
    mockFrom.mockClear();
    mockGetSession.mockReset();
    mockUpdateUser.mockReset();
    mockToast.mockReset();
    mockSetLoadingMessage.mockReset();
    mockGetUsernameFromUser.mockReset();
    mockRedirectByRole.mockReset();
    mockStoreSessionUser.mockReset();
    global.console.error = jest.fn();
    global.console.warn = jest.fn();
  });

  test('getExistingRole returns admin when admin record exists', async () => {
    const user = { id: 'u1', email: 'admin@example.com' };
    mockGetUsernameFromUser.mockReturnValue('Admin Guy');

    mockMaybeSingle
      .mockResolvedValueOnce({
        data: { email: 'admin@example.com' },
        error: null
      });

    const result = await getExistingRole(user);

    expect(result).toEqual({
      role: 'admin',
      username: 'Admin Guy'
    });
  });

  test('getExistingRole returns vendor when vendor record exists', async () => {
    const user = { id: 'u1', email: 'v@example.com' };
    mockGetUsernameFromUser.mockReturnValue('DefaultName');

    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: 'u1', username: 'shop1', status: 'pending' },
        error: null
      });

    const result = await getExistingRole(user);

    expect(result).toEqual({
      role: 'vendor',
      username: 'shop1',
      status: 'pending'
    });
  });

  test('getExistingRole returns student when student record exists', async () => {
    const user = { id: 'u1', email: 's@example.com' };
    mockGetUsernameFromUser.mockReturnValue('DefaultName');

    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: 'u1', username: 'bethuel' },
        error: null
      });

    const result = await getExistingRole(user);

    expect(result).toEqual({
      role: 'student',
      username: 'bethuel'
    });
  });

  test('getExistingRole returns null when no role exists', async () => {
    const user = { id: 'u1', email: 'nobody@example.com' };
    mockGetUsernameFromUser.mockReturnValue('Nobody');

    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await getExistingRole(user);

    expect(result).toBeNull();
  });

  test('saveRoleForFirstTimeUser stops when no role is selected', async () => {
    document.body.innerHTML = `<select id="roleSelect"><option value=""></option></select>`;

    await saveRoleForFirstTimeUser();

    expect(mockSetLoadingMessage).toHaveBeenCalledWith('Saving account type...');
    expect(mockToast).toHaveBeenCalledWith('Choose a role first', 'error');
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
  });

  test('saveRoleForFirstTimeUser stops when there is no signed-in user', async () => {
    document.body.innerHTML = `<select id="roleSelect"><option value="student" selected>student</option></select>`;
    document.getElementById('roleSelect').value = 'student';

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    await saveRoleForFirstTimeUser();

    expect(mockToast).toHaveBeenCalledWith('Please sign in with Google first', 'error');
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
  });

  test('saveRoleForFirstTimeUser saves vendor role and redirects', async () => {
    const user = { id: 'u1', email: 'vendor@example.com' };

    document.body.innerHTML = `
      <select id="roleSelect">
        <option value="vendor" selected>vendor</option>
      </select>
    `;
    document.getElementById('roleSelect').value = 'vendor';

    mockGetSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    mockGetUsernameFromUser.mockReturnValue('shop1');
    mockUpsert.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });

    await saveRoleForFirstTimeUser();

    expect(mockFrom).toHaveBeenCalledWith('vendors');
    expect(mockStoreSessionUser).toHaveBeenCalledWith(user, 'vendor', 'shop1');
    expect(mockRedirectByRole).toHaveBeenCalledWith('vendor');
  });

  test('saveRoleForFirstTimeUser saves student role and redirects', async () => {
    const user = { id: 'u1', email: 'student@example.com' };

    document.body.innerHTML = `
      <select id="roleSelect">
        <option value="student" selected>student</option>
      </select>
    `;
    document.getElementById('roleSelect').value = 'student';

    mockGetSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    mockGetUsernameFromUser.mockReturnValue('bethuel');
    mockUpsert.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });

    await saveRoleForFirstTimeUser();

    expect(mockFrom).toHaveBeenCalledWith('students');
    expect(mockStoreSessionUser).toHaveBeenCalledWith(user, 'student', 'bethuel');
    expect(mockRedirectByRole).toHaveBeenCalledWith('student');
  });

  test('saveRoleForFirstTimeUser warns when metadata update fails but still continues', async () => {
    const user = { id: 'u1', email: 'student@example.com' };

    document.body.innerHTML = `
      <select id="roleSelect">
        <option value="student" selected>student</option>
      </select>
    `;
    document.getElementById('roleSelect').value = 'student';

    mockGetSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    mockGetUsernameFromUser.mockReturnValue('bethuel');
    mockUpsert.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({
      error: { message: 'metadata warning' }
    });

    await saveRoleForFirstTimeUser();

    expect(console.warn).toHaveBeenCalled();
    expect(mockStoreSessionUser).toHaveBeenCalledWith(user, 'student', 'bethuel');
    expect(mockRedirectByRole).toHaveBeenCalledWith('student');
  });

  test('saveRoleForFirstTimeUser handles thrown errors', async () => {
    const user = { id: 'u1', email: 'vendor@example.com' };

    document.body.innerHTML = `
      <select id="roleSelect">
        <option value="vendor" selected>vendor</option>
      </select>
    `;
    document.getElementById('roleSelect').value = 'vendor';

    mockGetSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    mockGetUsernameFromUser.mockReturnValue('shop1');
    mockUpsert.mockResolvedValue({
      error: new Error('upsert failed')
    });

    await saveRoleForFirstTimeUser();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('upsert failed', 'error');
    expect(mockSetLoadingMessage).toHaveBeenLastCalledWith('');
  });
});