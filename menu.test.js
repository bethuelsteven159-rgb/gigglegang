import { jest } from '@jest/globals';

// ── Supabase mock ─────────────────────────────────────────────────────────────

// vendor query chain: .from('vendors').select().eq()
const mockVendorEq = jest.fn();
const mockVendorSelect = jest.fn(() => ({ eq: mockVendorEq }));

// menu query chain: .from('menu').select().eq('vendor_id',…).eq('status',…)
const mockMenuStatusEq = jest.fn();
const mockMenuVendorEq = jest.fn(() => ({ eq: mockMenuStatusEq }));
const mockMenuSelect = jest.fn(() => ({ eq: mockMenuVendorEq }));

const mockFrom = jest.fn((table) => {
  if (table === 'vendors') return { select: mockVendorSelect };
  if (table === 'menu')    return { select: mockMenuSelect };
  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: { from: mockFrom }
}));

// ── Cart mock ─────────────────────────────────────────────────────────────────

const mockSetCart = jest.fn();
const mockUpdateCartDisplay = jest.fn();

jest.unstable_mockModule('./cart.js', () => ({
  setCart: mockSetCart,
  updateCartDisplay: mockUpdateCartDisplay
}));

// ── Import SUT ────────────────────────────────────────────────────────────────

const { loadStudentMenu } = await import('./menu.js');

// ── Test suite ────────────────────────────────────────────────────────────────

describe('student/menu.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    mockFrom.mockClear();
    mockVendorSelect.mockClear();
    mockVendorEq.mockReset();
    mockMenuSelect.mockClear();
    mockMenuVendorEq.mockClear();
    mockMenuStatusEq.mockReset();

    mockSetCart.mockReset();
    mockUpdateCartDisplay.mockReset();

    global.console.error = jest.fn();
  });

  // ── early returns ───────────────────────────────────────────────────────────

  test('returns early when #menuContainer is missing', async () => {
    await loadStudentMenu();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ── error / empty states ────────────────────────────────────────────────────

  test('shows failure message when vendor fetch errors', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({ data: null, error: { message: 'db error' } });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML)
      .toContain('Failed to load menu');
  });

  test('shows failure message when vendors is null', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({ data: null, error: null });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML)
      .toContain('Failed to load menu');
  });

  test('shows empty message when no vendors exist', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({ data: [], error: null });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML)
      .toContain('No menu available yet');
  });

  test('shows empty message when vendors have no available items', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({ data: [], error: null });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML)
      .toContain('No menu available yet');
  });

  // ── rendering ───────────────────────────────────────────────────────────────

  test('renders menu items from multiple vendors', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [
        { id: 'v1', username: 'ShopA' },
        { id: 'v2', username: 'ShopB' }
      ],
      error: null
    });
    // First call → ShopA items, second call → ShopB items
    mockMenuStatusEq
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Burger', price: 50, description: 'Tasty', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
        error: null
      })
      .mockResolvedValueOnce({
        data: [{ id: 2, name: 'Pizza', price: 70, description: 'Cheesy', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v2', status: 'available' }],
        error: null
      });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('Burger');
    expect(html).toContain('ShopA');
    expect(html).toContain('R50');
    expect(html).toContain('Pizza');
    expect(html).toContain('ShopB');
    expect(html).toContain('R70');
  });

  test('renders Add to Cart button for each item', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{ id: 1, name: 'Burger', price: 50, description: '', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
      error: null
    });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML)
      .toContain('Add to Cart');
  });

  test('renders item image when image_url is present', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{ id: 1, name: 'Burger', price: 50, description: '', image_url: 'https://img.test/burger.jpg', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
      error: null
    });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML)
      .toContain('burger.jpg');
  });

  test('skips image tag when image_url is empty', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{ id: 1, name: 'Burger', price: 50, description: '', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
      error: null
    });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML)
      .not.toContain('<img');
  });

  // ── allergen & dietary badges ───────────────────────────────────────────────

  test('renders allergen badges for items that have allergens', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{
        id: 1, name: 'Peanut Burger', price: 50, description: '',
        image_url: '', vendor_id: 'v1', status: 'available',
        allergens: ['peanuts', 'dairy'],
        dietary_labels: []
      }],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('🥜 Peanuts');
    expect(html).toContain('🥛 Dairy');
  });

  test('renders dietary badges for items that have dietary labels', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{
        id: 1, name: 'Halal Wrap', price: 40, description: '',
        image_url: '', vendor_id: 'v1', status: 'available',
        allergens: [],
        dietary_labels: ['halal', 'vegetarian']
      }],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('✓ Halal');
    expect(html).toContain('✓ Vegetarian');
  });

  test('renders no badges when allergens and dietary_labels are empty', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{
        id: 1, name: 'Plain Item', price: 30, description: '',
        image_url: '', vendor_id: 'v1', status: 'available',
        allergens: [], dietary_labels: []
      }],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).not.toContain('menu-badges');
  });

  // ── cart restoration ────────────────────────────────────────────────────────

  test('restores cart from sessionStorage after rendering', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{ id: 1, name: 'Burger', price: 50, description: '', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
      error: null
    });

    const savedCart = [{ id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }];
    sessionStorage.setItem('cart', JSON.stringify(savedCart));

    await loadStudentMenu();

    expect(mockSetCart).toHaveBeenCalledWith(savedCart);
    expect(mockUpdateCartDisplay).toHaveBeenCalled();
  });

  test('does not call setCart when sessionStorage has no cart', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{ id: 1, name: 'Burger', price: 50, description: '', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
      error: null
    });

    await loadStudentMenu();

    expect(mockSetCart).not.toHaveBeenCalled();
  });

  test('handles malformed cart JSON without crashing', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{ id: 1, name: 'Burger', price: 50, description: '', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
      error: null
    });
    sessionStorage.setItem('cart', 'INVALID_JSON{{{');

    await expect(loadStudentMenu()).resolves.not.toThrow();
    expect(mockSetCart).not.toHaveBeenCalled();
  });

  // ── menu error handling per vendor ──────────────────────────────────────────

  test('skips vendors whose menu fetch errors and still renders others', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [
        { id: 'v1', username: 'GoodShop' },
        { id: 'v2', username: 'BrokenShop' }
      ],
      error: null
    });
    mockMenuStatusEq
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Wrap', price: 35, description: '', image_url: '', allergens: [], dietary_labels: [], vendor_id: 'v1', status: 'available' }],
        error: null
      })
      .mockResolvedValueOnce({ data: null, error: { message: 'timeout' } });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('Wrap');
    expect(html).not.toContain('BrokenShop');
  });

test('filters vegan items correctly', async () => {

  document.body.innerHTML = `
    <select id="dietaryFilter">
      <option value=""></option>
      <option value="vegan">Vegan</option>
    </select>

    <div id="menuContainer"></div>
  `;

  mockVendorEq.mockResolvedValue({
    data: [{ id: 'v1', username: 'ShopA' }],
    error: null
  });

  mockMenuStatusEq.mockResolvedValue({
    data: [
      {
        id: 1,
        name: 'Vegan Wrap',
        price: 45,
        allergens: [],
        dietary_labels: ['vegan'],
        vendor_id: 'v1',
        status: 'available'
      },
      {
        id: 2,
        name: 'Chicken Burger',
        price: 60,
        allergens: [],
        dietary_labels: [],
        vendor_id: 'v1',
        status: 'available'
      }
    ],
    error: null
  });

  await loadStudentMenu();

  document.getElementById('dietaryFilter').value = 'vegan';

  document
    .getElementById('dietaryFilter')
    .dispatchEvent(new Event('change'));

  const html =
    document.getElementById('menuContainer').innerHTML;

  expect(html).toContain('Vegan Wrap');

  expect(html).not.toContain('Chicken Burger');
});
  // ── XSS / escaping ──────────────────────────────────────────────────────────

  test('escapes HTML in item name and description text content', async () => {
    document.body.innerHTML = `<div id="menuContainer"></div>`;
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA' }],
      error: null
    });
    mockMenuStatusEq.mockResolvedValue({
      data: [{
        id: 1,
        name: '<script>alert(1)</script>',
        price: 50,
        description: '<b>bad</b>',
        image_url: '',
        allergens: [],
        dietary_labels: [],
        vendor_id: 'v1',
        status: 'available'
      }],
      error: null
    });

    await loadStudentMenu();

    // The rendered text nodes should show escaped versions, not live HTML tags
    const container = document.getElementById('menuContainer');
    const nameDiv = container.querySelector('div[style*="font-weight"]');
    const descDiv = [...container.querySelectorAll('div')].find(d => d.textContent.includes('bad'));

    // textContent gives the decoded string — the key check is that no <script> element
    // was injected into the DOM
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).toContain('&lt;script&gt;');
    expect(nameDiv?.textContent).toContain('<script>alert(1)</script>');
  });
});