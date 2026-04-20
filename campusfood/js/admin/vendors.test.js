import { jest } from '@jest/globals';

const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({
  eq: mockEq
}));
const mockDelete = jest.fn(() => ({
  eq: mockEq
}));
const mockInsert = jest.fn();
const mockSelect = jest.fn(() => ({
  order: mockOrder
}));

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  delete: mockDelete,
  insert: mockInsert
}));

const mockToast = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    from: mockFrom
  }
}));

jest.unstable_mockModule('../shared/notifications.js', () => ({
  toast: mockToast
}));

const { loadVendors, updateVendorStatus, deleteVendor, createVendor } =
  await import('./vendors.js');

describe('admin/vendors.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockOrder.mockReset();
    mockEq.mockReset();
    mockUpdate.mockClear();
    mockDelete.mockClear();
    mockInsert.mockReset();
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockToast.mockReset();
    global.console.error = jest.fn();
    global.confirm = jest.fn();
  });

  test('loadVendors returns early if tbody is missing', async () => {
    await loadVendors();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('loadVendors shows error row on failure', async () => {
    document.body.innerHTML = `<table><tbody id="vendorBody"></tbody></table>`;

    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'failed' }
    });

    await loadVendors();

    expect(document.getElementById('vendorBody').innerHTML).toContain('Failed to load');
  });

  test('loadVendors shows empty row when no vendors exist', async () => {
    document.body.innerHTML = `<table><tbody id="vendorBody"></tbody></table>`;

    mockOrder.mockResolvedValue({
      data: [],
      error: null
    });

    await loadVendors();

    expect(document.getElementById('vendorBody').innerHTML).toContain('No vendors yet');
  });

  test('loadVendors renders vendor rows', async () => {
    document.body.innerHTML = `<table><tbody id="vendorBody"></tbody></table>`;

    mockOrder.mockResolvedValue({
      data: [
        { id: 'v1', username: 'shop1', status: 'pending' },
        { id: 'v2', username: 'shop2', status: 'approved' }
      ],
      error: null
    });

    await loadVendors();

    const html = document.getElementById('vendorBody').innerHTML;
    expect(html).toContain('shop1');
    expect(html).toContain('pending');
    expect(html).toContain('Approve');
    expect(html).toContain('shop2');
    expect(html).toContain('approved');
    expect(html).toContain('Suspend');
  });

  test('updateVendorStatus shows error toast on failure', async () => {
    mockEq.mockResolvedValue({
      error: { message: 'failed' }
    });

    await updateVendorStatus('v1', 'approved');

    expect(mockToast).toHaveBeenCalledWith('Update failed', 'error');
  });

  test('updateVendorStatus shows success toast on success', async () => {
    mockEq.mockResolvedValue({
      error: null
    });

    await updateVendorStatus('v1', 'approved');

    expect(mockToast).toHaveBeenCalledWith('Vendor approved');
  });

  test('deleteVendor stops if confirm returns false', async () => {
    global.confirm.mockReturnValue(false);

    await deleteVendor('v1');

    expect(mockFrom).not.toHaveBeenCalledWith('vendors');
  });

  test('deleteVendor shows error toast on failure', async () => {
    global.confirm.mockReturnValue(true);
    mockEq.mockResolvedValue({
      error: { message: 'failed' }
    });

    await deleteVendor('v1');

    expect(mockToast).toHaveBeenCalledWith('Delete failed', 'error');
  });

  test('deleteVendor shows success toast on success', async () => {
    global.confirm.mockReturnValue(true);
    mockEq.mockResolvedValue({
      error: null
    });

    await deleteVendor('v1');

    expect(mockToast).toHaveBeenCalledWith('Vendor removed');
  });

  test('createVendor shows error toast if username is empty', async () => {
    document.body.innerHTML = `<input id="newVendor" value="   ">`;

    await createVendor();

    expect(mockToast).toHaveBeenCalledWith('Enter a vendor username', 'error');
  });

  test('createVendor shows error toast on insert failure', async () => {
    document.body.innerHTML = `<input id="newVendor" value="shop1">`;

    mockInsert.mockResolvedValue({
      error: new Error('insert failed')
    });

    await createVendor();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Failed to create vendor', 'error');
  });

  test('createVendor clears input and shows success toast on success', async () => {
    document.body.innerHTML = `<input id="newVendor" value="shop1">`;

    mockInsert.mockResolvedValue({
      error: null
    });

    await createVendor();

    expect(mockToast).toHaveBeenCalledWith('Vendor added successfully');
    expect(document.getElementById('newVendor').value).toBe('');
  });
});