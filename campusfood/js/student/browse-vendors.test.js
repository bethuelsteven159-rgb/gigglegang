/**
 * @jest-environment jsdom
 */

import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals';

let tableResults;
let queriesByTable;

let mockFrom;
let mockUpdateCartDisplay;
let mockSetCart;
let mockLoadStudentMenu;

function makeQuery(table) {
  const query = {
    table,
    selected: null,
    filters: [],

    select: jest.fn((columns) => {
      query.selected = columns;
      return query;
    }),

    eq: jest.fn((column, value) => {
      query.filters.push([column, value]);
      return query;
    }),

    then: jest.fn((resolve, reject) => {
      return Promise.resolve(
        tableResults[table] || {
          data: [],
          error: null
        }
      ).then(resolve, reject);
    })
  };

  if (!queriesByTable[table]) {
    queriesByTable[table] = [];
  }

  queriesByTable[table].push(query);

  return query;
}

async function loadBrowseVendorsModule({
  vendorsResult = {
    data: [],
    error: null
  },

  menuResult = {
    data: [],
    error: null
  },

  reviewsResult = {
    data: [],
    error: null
  },

  ordersResult = {
    data: [],
    error: null
  }
} = {}) {
  jest.resetModules();

  queriesByTable = {};

  tableResults = {
    vendors: vendorsResult,
    menu: menuResult,
    reviews: reviewsResult,
    orders: ordersResult
  };

  mockFrom = jest.fn((table) => makeQuery(table));

  mockUpdateCartDisplay = jest.fn();
  mockSetCart = jest.fn();
  mockLoadStudentMenu = jest.fn();

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

  return await import('./browse-vendors.js');
}

function setupFullDOM() {
  document.body.innerHTML = `
    <div id="vendorsView" style="display:block">
      <div id="vendorsContainer"></div>
    </div>

    <div id="menuView" style="display:none">
      <h2>Available Menu</h2>
      <div id="menuContainer"></div>
    </div>

    <button id="browseByMenuBtn" class="btn"></button>
    <button id="browseByVendorBtn" class="btn btn-primary"></button>

    <div id="searchContainer" style="display:none">
      <input id="searchInput" value="">
    </div>

    <div id="filterPanel" style="display:none">
      <select id="priceFilter">
        <option value=""></option>
        <option value="low-high">Low to high</option>
        <option value="high-low">High to low</option>
      </select>

      <select id="ratingFilter">
        <option value=""></option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5+</option>
      </select>

      <button id="mostOrderedBtn"></button>
      <button id="resetFiltersBtn"></button>
    </div>

    <div id="toast"></div>
  `;
}

async function flushPromises() {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe('student/browse-vendors.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    jest.useFakeTimers();

    delete window.showVendorMenu;
    delete window.resetToAllMenu;
    delete window.addToCartFromVendor;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();

    delete window.showVendorMenu;
    delete window.resetToAllMenu;
    delete window.addToCartFromVendor;
  });

  test('loadVendorsList returns early if vendors container is missing', async () => {
    const { loadVendorsList } = await loadBrowseVendorsModule();

    await loadVendorsList();

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('loadVendorsList hides search/filter and shows empty message when there are no vendors', async () => {
    const { loadVendorsList } = await loadBrowseVendorsModule({
      vendorsResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="vendorsContainer"></div>
      <div id="searchContainer" style="display:block"></div>
      <div id="filterPanel" style="display:block"></div>
    `;

    await loadVendorsList();

    expect(document.getElementById('searchContainer').style.display).toBe('none');
    expect(document.getElementById('filterPanel').style.display).toBe('none');
    expect(document.getElementById('vendorsContainer').innerHTML).toContain(
      'No vendors available yet.'
    );

    expect(mockFrom).toHaveBeenCalledWith('vendors');
    expect(queriesByTable.vendors[0].selected).toBe('id, username');
    expect(queriesByTable.vendors[0].filters).toEqual([
      ['status', 'approved']
    ]);
  });

  test('loadVendorsList shows empty message when vendors query fails', async () => {
    const { loadVendorsList } = await loadBrowseVendorsModule({
      vendorsResult: {
        data: null,
        error: {
          message: 'Failed'
        }
      }
    });

    document.body.innerHTML = `
      <div id="vendorsContainer"></div>
      <div id="searchContainer"></div>
      <div id="filterPanel"></div>
    `;

    await loadVendorsList();

    expect(document.getElementById('vendorsContainer').innerHTML).toContain(
      'No vendors available yet.'
    );
  });

  test('loadVendorsList renders approved vendors', async () => {
    const { loadVendorsList } = await loadBrowseVendorsModule({
      vendorsResult: {
        data: [
          {
            id: 'v1',
            username: 'Kota Palace'
          },
          {
            id: 'v2',
            username: 'Burger Spot'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="vendorsContainer"></div>
      <div id="searchContainer"></div>
      <div id="filterPanel"></div>
    `;

    await loadVendorsList();

    const html = document.getElementById('vendorsContainer').innerHTML;

    expect(html).toContain('Kota Palace');
    expect(html).toContain('Burger Spot');
    expect(html).toContain('Click to view menu');
    expect(html).toContain("window.showVendorMenu('v1', 'Kota Palace')");
  });

  test('showVendorMenu returns early if menu container is missing', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule();

    await showVendorMenu('v1', 'Kota Palace');

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('showVendorMenu switches views and shows empty message when vendor has no menu', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    expect(document.getElementById('menuView').style.display).toBe('block');
    expect(document.getElementById('vendorsView').style.display).toBe('none');

    expect(document.getElementById('browseByMenuBtn').className).toBe(
      'btn btn-primary'
    );

    expect(document.getElementById('browseByVendorBtn').className).toBe('btn');
    expect(document.getElementById('browseByVendorBtn').style.background).toBe(
      'var(--surface-alt)'
    );

    expect(document.getElementById('searchContainer').style.display).toBe('block');
    expect(document.getElementById('filterPanel').style.display).toBe('block');

    expect(document.getElementById('menuContainer').innerHTML).toContain(
      'No items available from Kota Palace yet.'
    );

    expect(mockFrom).toHaveBeenCalledWith('menu');
    expect(queriesByTable.menu[0].selected).toBe('*');
    expect(queriesByTable.menu[0].filters).toEqual([
      ['vendor_id', 'v1'],
      ['status', 'available']
    ]);
  });

  test('showVendorMenu renders vendor menu and restores saved cart', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: 'Nice burger',
            image_url: '',
            status: 'available'
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    sessionStorage.setItem(
      'cart',
      JSON.stringify([
        {
          id: 'old1',
          name: 'Chips',
          price: 20
        }
      ])
    );

    await showVendorMenu('v1', 'Kota Palace');

    const html = document.getElementById('menuContainer').innerHTML;

    expect(html).toContain('Burger');
    expect(html).toContain('R50');
    expect(html).toContain('Nice burger');
    expect(html).toContain('+ Add to Cart');

    expect(document.querySelector('#menuView h2').innerHTML).toContain(
      'Kota Palace Menu'
    );

    expect(mockSetCart).toHaveBeenCalledWith([
      {
        id: 'old1',
        name: 'Chips',
        price: 20
      }
    ]);

    expect(mockUpdateCartDisplay).toHaveBeenCalled();
  });

  test('showVendorMenu renders item image when image_url exists', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: 'Nice burger',
            image_url: 'burger.png',
            status: 'available'
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const html = document.getElementById('menuContainer').innerHTML;

    expect(html).toContain('img');
    expect(html).toContain('burger.png');
  });

  test('search filter shows only matching menu items', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          },
          {
            id: 'm2',
            name: 'Pizza',
            price: 80,
            description: '',
            image_url: ''
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const searchInput = document.getElementById('searchInput');

    searchInput.value = 'pizza';
    searchInput.oninput({
      target: searchInput
    });

    await flushPromises();

    const html = document.getElementById('menuContainer').innerHTML;

    expect(html).toContain('Pizza');
    expect(html).not.toContain('Burger');
  });

  test('search filter shows no match message', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const searchInput = document.getElementById('searchInput');

    searchInput.value = 'pizza';
    searchInput.oninput({
      target: searchInput
    });

    await flushPromises();

    expect(document.getElementById('menuContainer').innerHTML).toContain(
      'No items match your search or filters.'
    );
  });

  test('price filter sorts low to high', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Expensive Meal',
            price: 100,
            description: '',
            image_url: ''
          },
          {
            id: 'm2',
            name: 'Cheap Meal',
            price: 20,
            description: '',
            image_url: ''
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const priceFilter = document.getElementById('priceFilter');

    priceFilter.value = 'low-high';
    priceFilter.onchange({
      target: priceFilter
    });

    await flushPromises();

    const html = document.getElementById('menuContainer').innerHTML;

    expect(html.indexOf('Cheap Meal')).toBeLessThan(
      html.indexOf('Expensive Meal')
    );
  });

  test('price filter sorts high to low', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Cheap Meal',
            price: 20,
            description: '',
            image_url: ''
          },
          {
            id: 'm2',
            name: 'Expensive Meal',
            price: 100,
            description: '',
            image_url: ''
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const priceFilter = document.getElementById('priceFilter');

    priceFilter.value = 'high-low';
    priceFilter.onchange({
      target: priceFilter
    });

    await flushPromises();

    const html = document.getElementById('menuContainer').innerHTML;

    expect(html.indexOf('Expensive Meal')).toBeLessThan(
      html.indexOf('Cheap Meal')
    );
  });

  test('rating filter hides menu when vendor average is below selected rating', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [
          {
            rating: 2
          },
          {
            rating: 4
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const ratingFilter = document.getElementById('ratingFilter');

    ratingFilter.value = '4';
    ratingFilter.onchange({
      target: ratingFilter
    });

    await flushPromises();

    expect(document.getElementById('menuContainer').innerHTML).toContain(
      'No items match your search or filters.'
    );

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(queriesByTable.reviews[0].selected).toBe('rating');
    expect(queriesByTable.reviews[0].filters).toEqual([
      ['vendor_id', 'v1']
    ]);
  });

  test('rating filter keeps menu when vendor average meets selected rating', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [
          {
            rating: 5
          },
          {
            rating: 5
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const ratingFilter = document.getElementById('ratingFilter');

    ratingFilter.value = '4';
    ratingFilter.onchange({
      target: ratingFilter
    });

    await flushPromises();

    expect(document.getElementById('menuContainer').innerHTML).toContain(
      'Burger'
    );
  });

  test('rating filter hides menu when reviews query fails', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          }
        ],
        error: null
      },

      reviewsResult: {
        data: null,
        error: {
          message: 'Review error'
        }
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const ratingFilter = document.getElementById('ratingFilter');

    ratingFilter.value = '1';
    ratingFilter.onchange({
      target: ratingFilter
    });

    await flushPromises();

    expect(document.getElementById('menuContainer').innerHTML).toContain(
      'No items match your search or filters.'
    );
  });

  test('most ordered button sorts menu items by order count', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Pizza',
            price: 80,
            description: '',
            image_url: ''
          },
          {
            id: 'm2',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          }
        ],
        error: null
      },

      ordersResult: {
        data: [
          {
            items: [
              {
                id: 'm2'
              },
              {
                id: 'm2'
              }
            ]
          },
          {
            items: [
              {
                id: 'm1'
              }
            ]
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    await document.getElementById('mostOrderedBtn').onclick();

    const html = document.getElementById('menuContainer').innerHTML;

    expect(html.indexOf('Burger')).toBeLessThan(html.indexOf('Pizza'));

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(queriesByTable.orders[0].selected).toBe('items');
    expect(queriesByTable.orders[0].filters).toEqual([
      ['vendor_id', 'v1']
    ]);
  });

  test('most ordered button keeps menu when orders query fails', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Pizza',
            price: 80,
            description: '',
            image_url: ''
          },
          {
            id: 'm2',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          }
        ],
        error: null
      },

      ordersResult: {
        data: null,
        error: {
          message: 'Orders error'
        }
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    await document.getElementById('mostOrderedBtn').onclick();

    const html = document.getElementById('menuContainer').innerHTML;

    expect(html).toContain('Pizza');
    expect(html).toContain('Burger');
  });

  test('reset filters clears filter inputs and renders all items again', async () => {
    const { showVendorMenu } = await loadBrowseVendorsModule({
      menuResult: {
        data: [
          {
            id: 'm1',
            name: 'Burger',
            price: 50,
            description: '',
            image_url: ''
          },
          {
            id: 'm2',
            name: 'Pizza',
            price: 80,
            description: '',
            image_url: ''
          }
        ],
        error: null
      }
    });

    setupFullDOM();

    await showVendorMenu('v1', 'Kota Palace');

    const searchInput = document.getElementById('searchInput');
    const priceFilter = document.getElementById('priceFilter');
    const ratingFilter = document.getElementById('ratingFilter');

    searchInput.value = 'pizza';
    searchInput.oninput({
      target: searchInput
    });

    await flushPromises();

    document.getElementById('resetFiltersBtn').onclick();

    await flushPromises();

    const html = document.getElementById('menuContainer').innerHTML;

    expect(searchInput.value).toBe('');
    expect(priceFilter.value).toBe('');
    expect(ratingFilter.value).toBe('');

    expect(html).toContain('Burger');
    expect(html).toContain('Pizza');
  });

  test('resetToAllMenu clears vendor state, hides filters, clears search, and reloads all menu', async () => {
    const { resetToAllMenu } = await loadBrowseVendorsModule();

    setupFullDOM();

    document.querySelector('#menuView h2').innerHTML = 'Kota Palace Menu';
    document.getElementById('filterPanel').style.display = 'block';

    const searchInput = document.getElementById('searchInput');
    searchInput.value = 'burger';
    searchInput.oninput = jest.fn();

    resetToAllMenu();

    expect(document.querySelector('#menuView h2').innerHTML).toBe(
      'Available Menu'
    );

    expect(document.getElementById('filterPanel').style.display).toBe('none');
    expect(searchInput.value).toBe('');
    expect(searchInput.oninput).toBeNull();

    expect(mockLoadStudentMenu).toHaveBeenCalledTimes(1);
  });

  test('resetToAllMenu works when optional elements are missing', async () => {
    const { resetToAllMenu } = await loadBrowseVendorsModule();

    document.body.innerHTML = '';

    expect(() => {
      resetToAllMenu();
    }).not.toThrow();

    expect(mockLoadStudentMenu).toHaveBeenCalledTimes(1);
  });

  test('global functions are assigned on window', async () => {
    const module = await loadBrowseVendorsModule();

    expect(window.showVendorMenu).toBe(module.showVendorMenu);
    expect(window.resetToAllMenu).toBe(module.resetToAllMenu);
    expect(typeof window.addToCartFromVendor).toBe('function');
  });

  test('addToCartFromVendor adds item to session cart, updates cart display, and shows toast', async () => {
    await loadBrowseVendorsModule();

    document.body.innerHTML = `
      <div id="toast"></div>
    `;

    sessionStorage.setItem(
      'cart',
      JSON.stringify([
        {
          id: 'old1',
          name: 'Chips',
          price: 20,
          vendor_id: 'v1'
        }
      ])
    );

    window.addToCartFromVendor('m1', 'Burger', 50, 'v1');

    expect(JSON.parse(sessionStorage.getItem('cart'))).toEqual([
      {
        id: 'old1',
        name: 'Chips',
        price: 20,
        vendor_id: 'v1'
      },
      {
        id: 'm1',
        name: 'Burger',
        price: 50,
        vendor_id: 'v1'
      }
    ]);

    expect(mockUpdateCartDisplay).toHaveBeenCalledTimes(1);

    expect(document.getElementById('toast').textContent).toBe(
      'Burger added to cart'
    );

    expect(document.getElementById('toast').className).toBe('show success');

    jest.advanceTimersByTime(3000);

    expect(document.getElementById('toast').className).toBe('');
  });

  test('addToCartFromVendor works when toast is missing', async () => {
    await loadBrowseVendorsModule();

    document.body.innerHTML = '';

    expect(() => {
      window.addToCartFromVendor('m1', 'Burger', 50, 'v1');
    }).not.toThrow();

    expect(JSON.parse(sessionStorage.getItem('cart'))).toEqual([
      {
        id: 'm1',
        name: 'Burger',
        price: 50,
        vendor_id: 'v1'
      }
    ]);

    expect(mockUpdateCartDisplay).toHaveBeenCalledTimes(1);
  });
});
