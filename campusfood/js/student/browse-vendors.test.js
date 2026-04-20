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

const mockUpdateCartDisplay = jest.fn();
const mockSetCart = jest.fn();
const mockLoadStudentMenu = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    from: mockFrom
  }
}));

jest.unstable_mockModule('./cart.js', () => ({
  updateCartDisplay: mockUpdateCartDisplay,
  setCart: mockSetCart
}));

jest.unstable_mockModule('./menu.js', () => ({
  loadStudentMenu: mockLoadStudentMenu
}));

const {
  loadVendorsList,
  showVendorMenu,
  resetToAllMenu
} = await import('./browse-vendors.js');

describe('student/browse-vendors.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    mockEqSecond.mockClear();
    mockEqFirst.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockUpdateCartDisplay.mockReset();
    mockSetCart.mockReset();
    mockLoadStudentMenu.mockReset();
  });

  test('loadVendorsList returns early if vendors container is missing', async () => {
    await loadVendorsList();

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('loadVendorsList hides search/filter and shows empty message when no vendors', async () => {
    document.body.innerHTML = `
      <div id="vendorsContainer"></div>
      <div id="searchContainer" style="display:block"></div>
      <div id="filterPanel" style="display:block"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadVendorsList();

    expect(document.getElementById('searchContainer').style.display).toBe('none');
    expect(document.getElementById('filterPanel').style.display).toBe('none');
    expect(document.getElementById('vendorsContainer').innerHTML).toContain('No vendors available yet.');
  });

  test('loadVendorsList renders approved vendors', async () => {
    document.body.innerHTML = `
      <div id="vendorsContainer"></div>
      <div id="searchContainer"></div>
      <div id="filterPanel"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [
        { id: 'v1', username: 'shop1' },
        { id: 'v2', username: 'shop2' }
      ],
      error: null
    });

    await loadVendorsList();

    const html = document.getElementById('vendorsContainer').innerHTML;
    expect(html).toContain('shop1');
    expect(html).toContain('shop2');
    expect(html).toContain('Click to view menu');
  });

  test('showVendorMenu returns early if menu container is missing', async () => {
    await showVendorMenu('v1', 'shop1');

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('showVendorMenu switches views and shows empty message when vendor has no menu', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <div id="menuView" style="display:none"><h2>Available Menu</h2></div>
      <div id="vendorsView" style="display:block"></div>
      <button id="browseByMenuBtn" class="btn"></button>
      <button id="browseByVendorBtn" class="btn btn-primary"></button>
      <div id="searchContainer" style="display:none"></div>
      <div id="filterPanel" style="display:none"></div>
    `;

    mockEqSecond.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await showVendorMenu('v1', 'shop1');

    expect(document.getElementById('menuView').style.display).toBe('block');
    expect(document.getElementById('vendorsView').style.display).toBe('none');
    expect(document.getElementById('browseByMenuBtn').className).toBe('btn btn-primary');
    expect(document.getElementById('browseByVendorBtn').className).toBe('btn');
    expect(document.getElementById('searchContainer').style.display).toBe('block');
    expect(document.getElementById('filterPanel').style.display).toBe('block');
    expect(document.getElementById('menuContainer').innerHTML).toContain('No items available from shop1 yet.');
  });

  test('showVendorMenu renders vendor menu and restores saved cart', async () => {
    document.body.innerHTML = `
      <div id="menuContainer"></div>
      <div id="menuView"><h2>Available Menu</h2></div>
      <div id="vendorsView"></div>
      <button id="browseByMenuBtn" class="btn"></button>
      <button id="browseByVendorBtn" class="btn btn-primary"></button>
      <div id="searchContainer" style="display:none"></div>
      <div id="filterPanel" style="display:none"></div>
      <input id="searchInput" value="abc">
      <select id="priceFilter"><option value=""></option></select>
      <select id="ratingFilter"><option value=""></option></select>
      <button id="mostOrderedBtn"></button>
      <button id="resetFiltersBtn"></button>
    `;

    sessionStorage.setItem('cart', JSON.stringify([{ id: '1', name: 'Burger', price: 50 }]));

    mockEqSecond.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          name: 'Burger',
          price: 50,
          description: 'Nice',
          image_url: '',
          status: 'available'
        }
      ],
      error: null
    });

    await showVendorMenu('v1', 'shop1');

    const html = document.getElementById('menuContainer').innerHTML;
    expect(html).toContain('Burger');
    expect(html).toContain('R50');
    expect(html).toContain('Nice');

    expect(document.querySelector('#menuView h2').innerHTML).toContain('shop1 Menu');
    expect(mockSetCart).toHaveBeenCalledWith([{ id: '1', name: 'Burger', price: 50 }]);
    expect(mockUpdateCartDisplay).toHaveBeenCalled();
  });

  test('resetToAllMenu clears heading, hides filters, clears search, and reloads full menu', () => {
    document.body.innerHTML = `
      <div id="menuView"><h2>Old Heading</h2></div>
      <div id="filterPanel" style="display:block"></div>
      <input id="searchInput" value="burger">
    `;

    document.getElementById('searchInput').oninput = () => {};

    resetToAllMenu();

    expect(document.querySelector('#menuView h2').innerHTML).toBe('Available Menu');
    expect(document.getElementById('filterPanel').style.display).toBe('none');
    expect(document.getElementById('searchInput').value).toBe('');
    expect(document.getElementById('searchInput').oninput).toBeNull();
    expect(mockLoadStudentMenu).toHaveBeenCalled();
  });
});