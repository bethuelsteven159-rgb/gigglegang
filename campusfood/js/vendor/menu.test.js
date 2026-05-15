import { jest } from '@jest/globals';

const mockToast       = jest.fn();
const mockGetVendorId = jest.fn();

const mockOrder     = jest.fn();
const mockSingle    = jest.fn();
const mockEq        = jest.fn(() => ({ order: mockOrder, single: mockSingle }));
const mockSelect    = jest.fn(() => ({ eq: mockEq }));
const mockInsert    = jest.fn();
const mockUpdateEq  = jest.fn();
const mockUpdate    = jest.fn(() => ({ eq: mockUpdateEq }));
const mockDeleteEq  = jest.fn();
const mockDelete    = jest.fn(() => ({ eq: mockDeleteEq }));
const mockUpload    = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockStorageFrom  = jest.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }));

const mockFrom = jest.fn((table) => {
  if (table === 'menu') return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: { from: mockFrom, storage: { from: mockStorageFrom } }
}));

jest.unstable_mockModule('../shared/notifications.js', () => ({ toast: mockToast }));
jest.unstable_mockModule('../shared/auth-helpers.js',  () => ({ getVendorId: mockGetVendorId }));

const {
  loadVendorMenu, addMenuItem, toggleSoldOut, deleteMenuItem,
  openEditModal, closeEditModal, saveEdit
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
    test('returns early if container is missing', async () => {
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

    test('shows failure message on query error', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({ data: null, error: { message: 'failed' } });
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

    test('renders items with allergen and dietary badges', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({
        data: [
          { id: 1, name: 'Burger', image_url: 'https://img.test/b.jpg', description: 'Tasty',
            price: 50, status: 'available', allergens: ['peanuts', 'gluten'], dietary_labels: ['halal'] },
          { id: 2, name: 'Pizza',  image_url: '', description: 'Cheesy',
            price: 70, status: 'sold_out',  allergens: [], dietary_labels: ['vegetarian'] }
        ],
        error: null
      });
      await loadVendorMenu();
      const html = document.getElementById('vendorMenu').innerHTML;
      expect(html).toContain('Burger');
      expect(html).toContain('Pizza');
      expect(html).toContain('R50');
      expect(html).toContain('R70');
      expect(html).toContain('🥜 Peanuts');
      expect(html).toContain('🌾 Gluten');
      expect(html).toContain('✓ Halal');
      expect(html).toContain('✓ Vegetarian');
      expect(html).toContain('Mark Sold Out');
      expect(html).toContain('Mark Available');
      expect(html).toContain('Edit');
      expect(html).toContain('Delete');
    });

    test('renders no badges when arrays are empty', async () => {
      document.body.innerHTML = `<div id="vendorMenu"></div>`;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({
        data: [{ id: 1, name: 'Plain', image_url: '', description: '', price: 30,
                 status: 'available', allergens: [], dietary_labels: [] }],
        error: null
      });
      await loadVendorMenu();
      expect(document.getElementById('vendorMenu').innerHTML).not.toContain('menu-badges');
    });
  });

  // ── addMenuItem ─────────────────────────────────────────────────────────────

  describe('addMenuItem', () => {
    test('shows error when fields are incomplete', async () => {
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

    test('shows error when vendor not found', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue(null);
      await addMenuItem();
      expect(mockToast).toHaveBeenCalledWith('Vendor not found', 'error');
    });

    test('inserts item with allergen and dietary arrays', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
        <input type="checkbox" id="containsPeanuts" checked>
        <input type="checkbox" id="containsGluten"  checked>
        <input type="checkbox" id="isHalal"          checked>
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

    test('inserts item with empty arrays when no checkboxes checked', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
        <div id="vendorMenu"></div>
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockInsert.mockResolvedValue({ error: null });
      mockOrder.mockResolvedValue({ data: [], error: null });
      await addMenuItem();
      expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({
        allergens: [], dietary_labels: []
      })]);
    });

    test('uploads image and inserts successfully', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
        <div id="vendorMenu"></div>
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files',
        { value: [{ name: 'burger.jpg' }], configurable: true });
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://img.test/burger.jpg' } });
      mockInsert.mockResolvedValue({ error: null });
      mockOrder.mockResolvedValue({ data: [], error: null });
      await addMenuItem();
      expect(mockUpload).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Item added successfully');
    });

    test('shows error when image upload fails', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files',
        { value: [{ name: 'burger.jpg' }], configurable: true });
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockUpload.mockResolvedValue({ error: new Error('upload failed') });
      await addMenuItem();
      expect(mockToast).toHaveBeenCalledWith('Image upload failed', 'error');
    });

    test('shows error when insert fails', async () => {
      document.body.innerHTML = `
        <input id="itemName" value="Burger">
        <input id="itemPrice" value="50">
        <textarea id="itemDescription">Nice</textarea>
        <input id="itemImage">
      `;
      Object.defineProperty(document.getElementById('itemImage'), 'files', { value: [], configurable: true });
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockInsert.mockResolvedValue({ error: new Error('insert failed') });
      await addMenuItem();
      expect(mockToast).toHaveBeenCalledWith('Failed to add item', 'error');
    });
  });

  // ── edit modal ──────────────────────────────────────────────────────────────

  describe('edit modal', () => {
    test('openEditModal populates fields and sets checkboxes', async () => {
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
      expect(document.getElementById('editItemDescription').value).toBe('Tasty');
      expect(document.getElementById('editContainsPeanuts').checked).toBe(true);
      expect(document.getElementById('editContainsGluten').checked).toBe(true);
      expect(document.getElementById('editIsHalal').checked).toBe(true);
    });

    test('openEditModal shows error toast when fetch fails', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
      await openEditModal(99);
      expect(mockToast).toHaveBeenCalledWith('Failed to load item', 'error');
    });

    test('saveEdit updates item with allergen and dietary arrays', async () => {
      document.body.innerHTML = `
        <div id="editModal" data-item-id="1"></div>
        <div id="vendorMenu"></div>
        <input id="editItemName" value="Updated Burger">
        <input id="editItemPrice" value="55">
        <input id="editItemDescription" value="More Tasty">
        <input type="checkbox" id="editContainsPeanuts" checked>
        <input type="checkbox" id="editContainsDairy"   checked>
        <input type="checkbox" id="editIsVegan"          checked>
      `;
      mockUpdateEq.mockResolvedValue({ error: null });
      mockGetVendorId.mockResolvedValue('v1');
      mockOrder.mockResolvedValue({ data: [], error: null });
      await saveEdit();
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        allergens: ['peanuts', 'dairy'],
        dietary_labels: ['vegan']
      }));
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 1);
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

    test('saveEdit shows error toast on update failure', async () => {
      document.body.innerHTML = `
        <div id="editModal" data-item-id="1"></div>
        <input id="editItemName" value="Burger">
        <input id="editItemPrice" value="50">
        <input id="editItemDescription" value="Tasty">
      `;
      mockUpdateEq.mockResolvedValue({ error: { message: 'failed' } });
      await saveEdit();
      expect(mockToast).toHaveBeenCalledWith('Update failed', 'error');
    });

    test('closeEditModal hides the modal', () => {
      document.body.innerHTML = `<div id="editModal"></div>`;
      closeEditModal();
      expect(document.getElementById('editModal').hidden).toBe(true);
    });
  });

  // ── toggleSoldOut ───────────────────────────────────────────────────────────

  describe('toggleSoldOut', () => {
    test('shows error toast on failure', async () => {
      mockUpdateEq.mockResolvedValue({ error: { message: 'failed' } });
      await toggleSoldOut(1, false);
      expect(mockToast).toHaveBeenCalledWith('Update failed', 'error');
    });

    test('updates status and reloads on success', async () => {
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
    test('stops when confirm is false', async () => {
      global.confirm.mockReturnValue(false);
      await deleteMenuItem(1);
      expect(mockDeleteEq).not.toHaveBeenCalled();
    });

    test('shows error on failure', async () => {
      global.confirm.mockReturnValue(true);
      mockDeleteEq.mockResolvedValue({ error: { message: 'failed' } });
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
