import { jest } from '@jest/globals';

const mockToast = jest.fn();
const mockGetVendorId = jest.fn();

const mockOrder = jest.fn();
const mockEq = jest.fn(() => ({
  order: mockOrder
}));
const mockSelect = jest.fn(() => ({
  eq: mockEq
}));

const mockInsert = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn(() => ({
  eq: mockUpdateEq
}));

const mockDeleteEq = jest.fn();
const mockDelete = jest.fn(() => ({
  eq: mockDeleteEq
}));

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

const mockStorageFrom = jest.fn(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl
}));

const mockFrom = jest.fn((table) => {
  if (table === 'menu') {
    return {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    };
  }

  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    from: mockFrom,
    storage: {
      from: mockStorageFrom
    }
  }
}));

jest.unstable_mockModule('../shared/notifications.js', () => ({
  toast: mockToast
}));

jest.unstable_mockModule('../shared/auth-helpers.js', () => ({
  getVendorId: mockGetVendorId
}));

const {
  loadVendorMenu,
  addMenuItem,
  toggleSoldOut,
  deleteMenuItem
} = await import('./menu.js');

describe('vendor/menu.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    mockToast.mockReset();
    mockGetVendorId.mockReset();

    mockOrder.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();

    mockInsert.mockReset();
    mockUpdateEq.mockReset();
    mockUpdate.mockClear();

    mockDeleteEq.mockReset();
    mockDelete.mockClear();

    mockUpload.mockReset();
    mockGetPublicUrl.mockReset();
    mockStorageFrom.mockClear();
    mockFrom.mockClear();

    global.console.error = jest.fn();
    global.confirm = jest.fn();
  });

  test('loadVendorMenu returns early if container is missing', async () => {
    await loadVendorMenu();

    expect(mockGetVendorId).not.toHaveBeenCalled();
  });

  test('loadVendorMenu shows vendor not found when vendorId is missing', async () => {
    document.body.innerHTML = `<div id="vendorMenu"></div>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue(null);

    await loadVendorMenu();

    expect(document.getElementById('vendorMenu').innerHTML).toContain('Vendor not found');
  });

  test('loadVendorMenu shows failure message on query error', async () => {
    document.body.innerHTML = `<div id="vendorMenu"></div>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'failed' }
    });

    await loadVendorMenu();

    expect(document.getElementById('vendorMenu').innerHTML).toContain('Failed to load menu');
  });

  test('loadVendorMenu shows empty message when no items exist', async () => {
    document.body.innerHTML = `<div id="vendorMenu"></div>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrder.mockResolvedValue({
      data: [],
      error: null
    });

    await loadVendorMenu();

    expect(document.getElementById('vendorMenu').innerHTML).toContain('No items yet.');
  });

  test('loadVendorMenu renders items with correct buttons', async () => {
    document.body.innerHTML = `<div id="vendorMenu"></div>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Burger',
          image_url: 'https://img.test/burger.jpg',
          description: 'Tasty',
          price: 50,
          status: 'available'
        },
        {
          id: 2,
          name: 'Pizza',
          image_url: '',
          description: 'Cheesy',
          price: 70,
          status: 'sold_out'
        }
      ],
      error: null
    });

    await loadVendorMenu();

    const html = document.getElementById('vendorMenu').innerHTML;
    expect(html).toContain('Burger');
    expect(html).toContain('Pizza');
    expect(html).toContain('Tasty');
    expect(html).toContain('Cheesy');
    expect(html).toContain('R50');
    expect(html).toContain('R70');
    expect(html).toContain('Mark Sold Out');
    expect(html).toContain('Mark Available');
    expect(html).toContain('Delete');
    expect(html).toContain('burger.jpg');
  });

  test('addMenuItem shows error when fields are incomplete', async () => {
    document.body.innerHTML = `
      <input id="itemName" value="">
      <input id="itemPrice" value="50">
      <textarea id="itemDescription">Nice</textarea>
      <input id="itemImage">
    `;

    const imageInput = document.getElementById('itemImage');
    Object.defineProperty(imageInput, 'files', {
      value: [],
      configurable: true
    });

    await addMenuItem();

    expect(mockToast).toHaveBeenCalledWith('Fill in all fields', 'error');
  });

  test('addMenuItem shows error when vendor is not found', async () => {
    document.body.innerHTML = `
      <input id="itemName" value="Burger">
      <input id="itemPrice" value="50">
      <textarea id="itemDescription">Nice</textarea>
      <input id="itemImage">
    `;
    sessionStorage.setItem('username', 'shop1');

    const imageInput = document.getElementById('itemImage');
    Object.defineProperty(imageInput, 'files', {
      value: [],
      configurable: true
    });

    mockGetVendorId.mockResolvedValue(null);

    await addMenuItem();

    expect(mockToast).toHaveBeenCalledWith('Vendor not found', 'error');
  });

  test('addMenuItem uploads image and inserts item successfully', async () => {
    document.body.innerHTML = `
      <input id="itemName" value="Burger">
      <input id="itemPrice" value="50">
      <textarea id="itemDescription">Nice</textarea>
      <input id="itemImage">
      <div id="vendorMenu"></div>
    `;
    sessionStorage.setItem('username', 'shop1');

    const imageInput = document.getElementById('itemImage');
    Object.defineProperty(imageInput, 'files', {
      value: [{ name: 'burger.jpg' }],
      configurable: true
    });

    mockGetVendorId.mockResolvedValue('v1');
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://img.test/burger.jpg' }
    });
    mockInsert.mockResolvedValue({ error: null });
    mockOrder.mockResolvedValue({
      data: [],
      error: null
    });

    await addMenuItem();

    expect(mockStorageFrom).toHaveBeenCalledWith('menu_images');
    expect(mockUpload).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Item added successfully');
    expect(document.getElementById('itemName').value).toBe('');
    expect(document.getElementById('itemPrice').value).toBe('');
    expect(document.getElementById('itemDescription').value).toBe('');
    expect(document.getElementById('itemImage').value).toBe('');
  });

  test('addMenuItem shows error when image upload fails', async () => {
    document.body.innerHTML = `
      <input id="itemName" value="Burger">
      <input id="itemPrice" value="50">
      <textarea id="itemDescription">Nice</textarea>
      <input id="itemImage">
    `;
    sessionStorage.setItem('username', 'shop1');

    const imageInput = document.getElementById('itemImage');
    Object.defineProperty(imageInput, 'files', {
      value: [{ name: 'burger.jpg' }],
      configurable: true
    });

    mockGetVendorId.mockResolvedValue('v1');
    mockUpload.mockResolvedValue({ error: new Error('upload failed') });

    await addMenuItem();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Image upload failed', 'error');
  });

  test('addMenuItem shows error when insert fails', async () => {
    document.body.innerHTML = `
      <input id="itemName" value="Burger">
      <input id="itemPrice" value="50">
      <textarea id="itemDescription">Nice</textarea>
      <input id="itemImage">
    `;
    sessionStorage.setItem('username', 'shop1');

    const imageInput = document.getElementById('itemImage');
    Object.defineProperty(imageInput, 'files', {
      value: [],
      configurable: true
    });

    mockGetVendorId.mockResolvedValue('v1');
    mockInsert.mockResolvedValue({ error: new Error('insert failed') });

    await addMenuItem();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Failed to add item', 'error');
  });

  test('toggleSoldOut shows error toast on failure', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'failed' } });

    await toggleSoldOut(1, false);

    expect(mockToast).toHaveBeenCalledWith('Update failed', 'error');
  });

  test('toggleSoldOut updates item and reloads menu on success', async () => {
    document.body.innerHTML = `<div id="vendorMenu"></div>`;
    sessionStorage.setItem('username', 'shop1');

    mockUpdateEq.mockResolvedValue({ error: null });
    mockGetVendorId.mockResolvedValue('v1');
    mockOrder.mockResolvedValue({ data: [], error: null });

    await toggleSoldOut(1, false);

    expect(mockToast).toHaveBeenCalledWith('Item updated');
  });

  test('deleteMenuItem stops when confirm is false', async () => {
    global.confirm.mockReturnValue(false);

    await deleteMenuItem(1);

    expect(mockDeleteEq).not.toHaveBeenCalled();
  });

  test('deleteMenuItem shows error on failure', async () => {
    global.confirm.mockReturnValue(true);
    mockDeleteEq.mockResolvedValue({ error: { message: 'failed' } });

    await deleteMenuItem(1);

    expect(mockToast).toHaveBeenCalledWith('Delete failed', 'error');
  });

  test('deleteMenuItem shows success and reloads on success', async () => {
    global.confirm.mockReturnValue(true);
    document.body.innerHTML = `<div id="vendorMenu"></div>`;
    sessionStorage.setItem('username', 'shop1');

    mockDeleteEq.mockResolvedValue({ error: null });
    mockGetVendorId.mockResolvedValue('v1');
    mockOrder.mockResolvedValue({ data: [], error: null });

    await deleteMenuItem(1);

    expect(mockToast).toHaveBeenCalledWith('Item deleted');
  });
});