import { jest } from '@jest/globals';

const mockEqSecond = jest.fn();
const mockEqFirst = jest.fn(() => ({
  eq: mockEqSecond
}));
const mockSelect = jest.fn(() => ({
  eq: mockEqFirst
}));
const mockFrom = jest.fn(() => ({
  select: mockSelect
}));

const mockSetCart = jest.fn();
const mockUpdateCartDisplay = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    from: mockFrom
  }
}));

jest.unstable_mockModule('./cart.js', () => ({
  setCart: mockSetCart,
  updateCartDisplay: mockUpdateCartDisplay
}));

const { loadStudentMenu } = await import('./menu.js');

describe('student/menu.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    mockEqSecond.mockClear();
    mockEqFirst.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockSetCart.mockReset();
    mockUpdateCartDisplay.mockReset();
  });

  test('returns early if menu container is missing', async () => {
    await loadStudentMenu();

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('shows search and hides filter panel', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <div id="searchContainer" style="display:none"></div>
      <div id="filterPanel" style="display:block"></div>
      <input id="searchInput" value="old">
      <select id="allergenFilter"></select>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadStudentMenu();

    expect(document.getElementById('searchContainer').style.display).toBe('block');
    expect(document.getElementById('filterPanel').style.display).toBe('none');
    expect(document.getElementById('searchInput').value).toBe('');
  });

  test('shows failure message if vendors fail to load', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: null,
      error: { message: 'failed' }
    });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML).toContain('Failed to load menu');
  });

  test('shows empty message when there is no menu available', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadStudentMenu();

    expect(document.getElementById('menuContainer').innerHTML).toContain('No menu available yet.');
  });

  test('renders menu items from approved vendors', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Burger',
          price: 50,
          description: 'Tasty',
          image_url: '',
          allergens: [],
          dietary_labels: []
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('Burger');
    expect(html).toContain('R50');
    expect(html).toContain('shop1');
    expect(html).toContain('Tasty');
  });

  test('displays allergen badges when allergens array has values', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Burger',
          price: 50,
          description: 'Tasty',
          image_url: '',
          allergens: ['peanuts', 'gluten'],
          dietary_labels: []
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('🥜 Peanuts');
    expect(html).toContain('🌾 Gluten');
    expect(html).not.toContain('✓ Halal');
  });

  test('displays dietary badges when dietary_labels array has values', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Burger',
          price: 50,
          description: 'Tasty',
          image_url: '',
          allergens: [],
          dietary_labels: ['halal', 'vegetarian']
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('✓ Halal');
    expect(html).toContain('✓ Vegetarian');
    expect(html).not.toContain('🥜 Peanuts');
  });

  test('displays both allergen and dietary badges when both arrays have values', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Burger',
          price: 50,
          description: 'Tasty',
          image_url: '',
          allergens: ['eggs', 'dairy'],
          dietary_labels: ['halal']
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('🥚 Eggs');
    expect(html).toContain('🥛 Dairy');
    expect(html).toContain('✓ Halal');
  });

  test('shows no badges when both arrays are empty', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Burger',
          price: 50,
          description: 'Tasty',
          image_url: '',
          allergens: [],
          dietary_labels: []
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).not.toContain('allergen-badge');
    expect(html).not.toContain('dietary-badge');
  });

  test('shows no badges when arrays are null or undefined', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Burger',
          price: 50,
          description: 'Tasty',
          image_url: ''
          // no allergens or dietary_labels fields
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).not.toContain('allergen-badge');
    expect(html).not.toContain('dietary-badge');
  });

  test('filters menu items by allergen-free selection', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
      <select id="allergenFilter">
        <option value="">All</option>
        <option value="peanut-free">Peanut-Free</option>
      </select>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Item with Peanuts',
          price: 50,
          description: '',
          image_url: '',
          allergens: ['peanuts'],
          dietary_labels: []
        },
        {
          id: 'm2',
          name: 'Item without Peanuts',
          price: 50,
          description: '',
          image_url: '',
          allergens: [],
          dietary_labels: []
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const allergenFilter = document.getElementById('allergenFilter');
    allergenFilter.value = 'peanut-free';
    allergenFilter.onchange({ target: { value: 'peanut-free' } });

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('Item without Peanuts');
    expect(html).not.toContain('Item with Peanuts');
  });

  test('filters menu items by dietary preference (halal)', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
      <select id="allergenFilter">
        <option value="">All</option>
        <option value="halal">Halal</option>
      </select>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Halal Item',
          price: 50,
          description: '',
          image_url: '',
          allergens: [],
          dietary_labels: ['halal']
        },
        {
          id: 'm2',
          name: 'Non-Halal Item',
          price: 50,
          description: '',
          image_url: '',
          allergens: [],
          dietary_labels: []
        }
      ],
      error: null
    });

    await loadStudentMenu();

    const allergenFilter = document.getElementById('allergenFilter');
    allergenFilter.value = 'halal';
    allergenFilter.onchange({ target: { value: 'halal' } });

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('Halal Item');
    expect(html).not.toContain('Non-Halal Item');
  });

  test('restores saved cart after loading menu', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    sessionStorage.setItem('cart', JSON.stringify([{ id: '1', name: 'Burger', price: 50 }]));

    mockEqFirst.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadStudentMenu();

    expect(mockSetCart).toHaveBeenCalledWith([{ id: '1', name: 'Burger', price: 50 }]);
    expect(mockUpdateCartDisplay).toHaveBeenCalled();
  });

  test('search input filters rendered menu', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <input id="searchInput">
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'shop1' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { id: 'm1', name: 'Burger', price: 50, description: '', image_url: '', allergens: [], dietary_labels: [] },
        { id: 'm2', name: 'Pizza', price: 80, description: '', image_url: '', allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadStudentMenu();

    const searchInput = document.getElementById('searchInput');
    searchInput.oninput({ target: { value: 'bur' } });

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('Burger');
    expect(html).not.toContain('Pizza');
  });
});
