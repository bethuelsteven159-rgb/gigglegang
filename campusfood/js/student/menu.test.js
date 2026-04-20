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
          image_url: ''
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
        { id: 'm1', name: 'Burger', price: 50, description: '', image_url: '' },
        { id: 'm2', name: 'Pizza', price: 80, description: '', image_url: '' }
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