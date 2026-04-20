import { jest } from '@jest/globals';

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
    from: mockFrom
  }
}));

const {
  setLoadingMessage,
  showRoleSection,
  getUsernameFromUser,
  getVendorId,
  getStudentId
} = await import('./auth-helpers.js');

describe('auth-helpers.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
    global.console.warn = jest.fn();
  });

  test('setLoadingMessage shows loading text and disables buttons', () => {
    document.body.innerHTML = `
      <div id="loadingText"></div>
      <button id="googleLoginBtn"></button>
      <button id="saveRoleBtn"></button>
    `;

    setLoadingMessage('Signing in...');

    expect(document.getElementById('loadingText').style.display).toBe('block');
    expect(document.getElementById('loadingText').textContent).toBe('Signing in...');
    expect(document.getElementById('googleLoginBtn').disabled).toBe(true);
    expect(document.getElementById('saveRoleBtn').disabled).toBe(true);
  });

  test('setLoadingMessage hides loading text and enables buttons when message is empty', () => {
    document.body.innerHTML = `
      <div id="loadingText"></div>
      <button id="googleLoginBtn" disabled></button>
      <button id="saveRoleBtn" disabled></button>
    `;

    setLoadingMessage('');

    expect(document.getElementById('loadingText').style.display).toBe('none');
    expect(document.getElementById('loadingText').textContent).toBe('');
    expect(document.getElementById('googleLoginBtn').disabled).toBe(false);
    expect(document.getElementById('saveRoleBtn').disabled).toBe(false);
  });

  test('showRoleSection shows the role section by default', () => {
    document.body.innerHTML = `<div id="roleSection" style="display:none"></div>`;

    showRoleSection();

    expect(document.getElementById('roleSection').style.display).toBe('block');
  });

  test('showRoleSection hides the role section when false is passed', () => {
    document.body.innerHTML = `<div id="roleSection" style="display:block"></div>`;

    showRoleSection(false);

    expect(document.getElementById('roleSection').style.display).toBe('none');
  });

  test('getUsernameFromUser returns trimmed full name when available', () => {
    const user = {
      user_metadata: { full_name: '  Bethuel Steven  ' },
      email: 'bethuel@example.com'
    };

    expect(getUsernameFromUser(user)).toBe('Bethuel Steven');
  });

  test('getUsernameFromUser falls back to email prefix', () => {
    const user = {
      user_metadata: { full_name: '   ' },
      email: 'bethuel@example.com'
    };

    expect(getUsernameFromUser(user)).toBe('bethuel');
  });

  test('getUsernameFromUser falls back to user when email is missing', () => {
    const user = {};

    expect(getUsernameFromUser(user)).toBe('user');
  });

  test('getVendorId returns null when username is missing', async () => {
    const result = await getVendorId('');

    expect(result).toBeNull();
  });

  test('getVendorId returns vendor id when found', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'vendor-123' },
      error: null
    });

    const result = await getVendorId('shop1');

    expect(mockFrom).toHaveBeenCalledWith('vendors');
    expect(result).toBe('vendor-123');
  });

  test('getVendorId returns null and warns when vendor is not found', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const result = await getVendorId('shop1');

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  test('getStudentId returns null when username is missing', async () => {
    const result = await getStudentId('');

    expect(result).toBeNull();
  });

  test('getStudentId returns student id when found', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'student-123' },
      error: null
    });

    const result = await getStudentId('bethuel');

    expect(mockFrom).toHaveBeenCalledWith('students');
    expect(result).toBe('student-123');
  });

  test('getStudentId returns null and warns when student is not found', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const result = await getStudentId('bethuel');

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });
});