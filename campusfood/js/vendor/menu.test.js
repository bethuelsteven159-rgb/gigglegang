import { jest } from '@jest/globals';

const mockToast        = jest.fn();
const mockGetVendorId  = jest.fn();
const mockOrder        = jest.fn();
const mockSingle       = jest.fn();
const mockEq           = jest.fn(() => ({ order: mockOrder, single: mockSingle }));
const mockSelect       = jest.fn(() => ({ eq: mockEq }));
const mockInsert       = jest.fn();
const mockUpdateEq     = jest.fn();
const mockUpdate       = jest.fn(() => ({ eq: mockUpdateEq }));
const mockDeleteEq     = jest.fn();
const mockDelete       = jest.fn(() => ({ eq: mockDeleteEq }));
const mockUpload       = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockStorageFrom  = jest.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }));
const mockFrom         = jest.fn((table) => {
  if (table === 'menu') return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: { from: mockFrom, storage: { from: mockStorageFrom } }
}));
jest.unstable_mockModule('../shared/notifications.js', () => ({ toast: mockToast }));
jest.unstable_mockModule('../shared/auth-helpers.js',  () => ({ getVendorId: mockGetVendorId }));

const {
  loadVendorMenu, openAddModal, closeAddModal, addMenuItem,
  toggleSoldOut, deleteMenuItem, openEditModal, closeEditModal, saveEdit
} = await import('./menu.js');

describe('vendor/menu.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    mockToast.mockReset();
    mockGetVendorId.mockReset();
    mockOrder.mockReset();
    mockSingle.mockReset();
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

  // ── loadVendorMenu ──────────────────────────────────────────────────────────

  describe('loadVendorMenu', () => {
    test('returns early when container missing', async () => {
      await loadVendorMenu();
      expect(mockGetVendorId).not.toHaveBeenCalled();
    });

    test('shows vendor not found when vendorId is null', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue(null);
      await loadVendorMenu();
      expect(document.getElementById('vendorMenu').innerHTML).toContain('Vendor not found');
    });

    test('shows failure on query error', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({ data: null, error: { message: 'fail' } });
      await loadVendorMenu();
      expect(document.getElementById('vendorMenu').innerHTML).toContain('Failed to load menu');
    });

    test('shows empty message when no items', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({ data: [], error: null });
      await loadVendorMenu();
      expect(document.getElementById('vendorMenu').innerHTML).toContain('No items yet.');
    });

    test('renders badges from array allergens/dietary_labels', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({
        data: [{ id: 1, name: 'Burger', image_url: '', description: 'Tasty',
                 price: 50, status: 'available',
                 allergens: ['peanuts', 'gluten'], dietary_labels: ['halal'] }],
        error: null
      });
      await loadVendorMenu();
      const html = document.getElementById('vendorMenu').innerHTML;
      expect(html).toContain('🥜 Peanuts');
      expect(html).toContain('🌾 Gluten');
      expect(html).toContain('✓ Halal');
    });

    test('renders badges when allergens/dietary_labels stored as JSON strings', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({
        data: [{ id: 1, name: 'Wrap', image_url: '', description: 'Nice',
                 price: 40, status: 'available',
                 allergens: '["dairy","eggs"]', dietary_labels: '["vegetarian"]' }],
        error: null
      });
      await loadVendorMenu();
      const html = document.getElementById('vendorMenu').innerHTML;
      expect(html).toContain('🥛 Dairy');
      expect(html).toContain('🥚 Eggs');
      expect(html).toContain('✓ Vegetarian');
    });

    test('renders no badges when arrays are empty', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({
        data: [{ id: 1, name: 'Plain', image_url: '', description: '',
                 price: 30, status: 'available', allergens: [], dietary_labels: [] }],
        error: null
      });
      await loadVendorMenu();
      expect(document.getElementById('vendorMenu').innerHTML).not.toContain('menu-badges');
    });
  });

  // ── add modal ───────────────────────────────────────────────────────────────

  describe('add modal', () => {
    test('openAddModal shows the modal and clears fields', () => {
      document.body.innerHTML = `
        <div id="addModal" hidden style="display:none"></div>
        <input id="itemName" value="old">
        <input id="itemPrice" value="99">
        <input id="itemDescription" value="old desc">
        <input id="itemImage">
      `;
      openAddModal();
      expect(document.getElementById('addModal').hidden).toBe(false);
      expect(document.getElementById('itemName').value).toBe('');
      expect(document.getElementById('itemPrice').value).toBe('');
    });

    test('closeAddModal hides the modal', () => {
      document.body.innerHTML = `<div id="addModal"></div>`;
      closeAddModal();
      expect(document.getElementById('addModal').hidden).toBe(true);
    });
  });

  // ── addMenuItem ─────────────────────────────────────────────────────────────

  describe('addMenuItem', () => {
    test('shows error when fields incomplete', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      await addMenuItem();
      expect(mockToast).toHaveBeenCalledWith('Fill in all fields', 'error');
    });

    test('inserts item with allergen and dietary arrays', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
        <input type="checkbox" id="addContainsPeanuts" checked>
        <input type="checkbox" id="addContainsGluten"  checked>
        <input type="checkbox" id="addIsHalal"          checked>
        <div id="addModal"></div>
        <div id="vendorMenu"></div>
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockInsert.mockResolvedValue({ error: null });
      mockOrder.mockResolvedValue({ data: [], error: null });
      await addMenuItem();
      expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({
        allergens: ['peanuts', 'gluten'],
        dietary_labels: ['halal']
      })]);
      expect(mockToast).toHaveBeenCalledWith('Item added successfully');
    });

    test('closes add modal after successful insert', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
        <div id="addModal"></div>
        <div id="vendorMenu"></div>
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockInsert.mockResolvedValue({ error: null });
      mockOrder.mockResolvedValue({ data: [], error: null });
      await addMenuItem();
      expect(document.getElementById('addModal').hidden).toBe(true);
    });

    test('shows error when vendor not found', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      mockGetVendorId.mockResolvedValue(null);
      await addMenuItem();
      expect(mockToast).toHaveBeenCalledWith('Vendor not found', 'error');
    });

    test('shows error when insert fails', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      mockGetVendorId.mockResolvedValue('v1');
      mockInsert.mockResolvedValue({ error: new Error('insert failed') });
      await addMenuItem();
      expect(mockToast).toHaveBeenCalledWith('Failed to add item', 'error');
    });
  });

  // ── edit modal ──────────────────────────────────────────────────────────────

  describe('edit modal', () => {
    test('openEditModal populates fields and checkboxes', async () => {
      document.body.innerHTML = `
        <div id="editModal"></div>
        <input id="editItemName">
        <input id="editItemPrice">
        <input id="editItemDescription">
        <input type="checkbox" id="editContainsPeanuts">
        <input type="checkbox" id="editContainsGluten">
        <input type="checkbox" id="editIsHalal">
      `;
      mockSingle.mockResolvedValue({
        data: { name: 'Burger', price: 50, description: 'Tasty',
                allergens: ['peanuts', 'gluten'], dietary_labels: ['halal'] },
        error: null
      });
      await openEditModal(1);
      expect(document.getElementById('editItemName').value).toBe('Burger');
      expect(document.getElementById('editItemPrice').value).toBe('50');
      expect(document.getElementById('editContainsPeanuts').checked).toBe(true);
      expect(document.getElementById('editIsHalal').checked).toBe(true);
    });

    test('openEditModal handles JSON string allergens', async () => {
      document.body.innerHTML = `
        <div id="editModal"></div>
        <input id="editItemName">
        <input id="editItemPrice">
        <input id="editItemDescription">
        <input type="checkbox" id="editContainsDairy">
        <input type="checkbox" id="editIsVegan">
      `;
      mockSingle.mockResolvedValue({
        data: { name: 'Wrap', price: 40, description: 'Nice',
                allergens: '["dairy"]', dietary_labels: '["vegan"]' },
        error: null
      });
      await openEditModal(2);
      expect(document.getElementById('editContainsDairy').checked).toBe(true);
      expect(document.getElementById('editIsVegan').checked).toBe(true);
    });

    test('openEditModal shows error toast on fetch failure', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
      await openEditModal(99);
      expect(mockToast).toHaveBeenCalledWith('Failed to load item', 'error');
    });

    test('saveEdit updates item with correct arrays', async () => {
      document.body.innerHTML = `
        <div id="editModal" data-item-id="1"></div>
        <div id="vendorMenu"></div>
        <input id="editItemName" value="Updated">
        <input id="editItemPrice" value="55">
        <input id="editItemDescription" value="Better">
        <input type="checkbox" id="editContainsPeanuts" checked>
        <input type="checkbox" id="editIsVegan" checked>
      `;
      mockUpdateEq.mockResolvedValue({ error: null });
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({ data: [], error: null });
      await saveEdit();
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        allergens: ['peanuts'], dietary_labels: ['vegan']
      }));
      expect(mockToast).toHaveBeenCalledWith('Item updated successfully');
    });

    test('saveEdit shows error when fields incomplete', async () => {
      document.body.innerHTML = `
        <div id="editModal" data-item-id="1"></div>
        <input id="editItemName" value="">
        <input id="editItemPrice" value="50">
        <input id="editItemDescription" value="Tasty">
      `;
      await saveEdit();
      expect(mockToast).toHaveBeenCalledWith('Fill in all fields', 'error');
    });

    test('closeEditModal hides modal', () => {
      document.body.innerHTML = `<div id="editModal"></div>`;
      closeEditModal();
      expect(document.getElementById('editModal').hidden).toBe(true);
    });
  });

  // ── toggleSoldOut ───────────────────────────────────────────────────────────

  describe('toggleSoldOut', () => {
    test('shows error on failure', async () => {
      mockUpdateEq.mockResolvedValue({ error: { message: 'fail' } });
      await toggleSoldOut(1, false);
      expect(mockToast).toHaveBeenCalledWith('Update failed', 'error');
    });

    test('updates status and reloads', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockUpdateEq.mockResolvedValue({ error: null });
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({ data: [], error: null });
      await toggleSoldOut(1, false);
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'sold_out' });
      expect(mockToast).toHaveBeenCalledWith('Item updated');
    });
  });

  // ── deleteMenuItem ──────────────────────────────────────────────────────────

  describe('deleteMenuItem', () => {
    test('stops when confirm is cancelled', async () => {
      global.confirm.mockReturnValue(false);
      await deleteMenuItem(1);
      expect(mockDeleteEq).not.toHaveBeenCalled();
    });

    test('shows error on failure', async () => {
      global.confirm.mockReturnValue(true);
      mockDeleteEq.mockResolvedValue({ error: { message: 'fail' } });
      await deleteMenuItem(1);
      expect(mockToast).toHaveBeenCalledWith('Delete failed', 'error');
    });

    test('shows success and reloads', async () => {
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
});
