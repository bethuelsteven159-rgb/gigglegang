import { jest } from '@jest/globals';

const mockToast = jest.fn();

jest.unstable_mockModule('../shared/notifications.js', () => ({
  toast: mockToast
}));

const {
  getCart,
  setCart,
  addToCart,
  removeFromCart,
  updateCartDisplay
} = await import('./cart.js');

describe('student/cart.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    mockToast.mockReset();
    setCart([]);
  });

  test('getCart returns the current cart', () => {
    setCart([{ id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }]);

    expect(getCart()).toEqual([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);
  });

  test('setCart stores only arrays', () => {
    setCart([{ id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }]);
    expect(getCart().length).toBe(1);

    setCart('not-an-array');
    expect(getCart()).toEqual([]);
  });

  test('addToCart adds item, saves session cart, updates display, and shows toast', () => {
    document.body.innerHTML = `
      <div id="cartPanel" style="display:none"></div>
      <div id="cartItems"></div>
      <span id="cartTotal"></span>
    `;

    addToCart('1', 'Burger', 50, 'v1');

    expect(getCart()).toEqual([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);
    expect(JSON.parse(sessionStorage.getItem('cart'))).toEqual([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);
    expect(document.getElementById('cartPanel').style.display).toBe('block');
    expect(document.getElementById('cartItems').innerHTML).toContain('Burger');
    expect(document.getElementById('cartTotal').textContent).toBe('R50');
    expect(mockToast).toHaveBeenCalledWith('Burger added to cart');
  });

  test('removeFromCart removes item and updates session storage', () => {
    document.body.innerHTML = `
      <div id="cartPanel" style="display:none"></div>
      <div id="cartItems"></div>
      <span id="cartTotal"></span>
    `;

    setCart([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' },
      { id: '2', name: 'Chips', price: 20, vendor_id: 'v1' }
    ]);

    removeFromCart(0);

    expect(getCart()).toEqual([
      { id: '2', name: 'Chips', price: 20, vendor_id: 'v1' }
    ]);
    expect(JSON.parse(sessionStorage.getItem('cart'))).toEqual([
      { id: '2', name: 'Chips', price: 20, vendor_id: 'v1' }
    ]);
    expect(document.getElementById('cartItems').innerHTML).toContain('Chips');
    expect(document.getElementById('cartTotal').textContent).toBe('R20');
  });

  test('updateCartDisplay returns early if cart elements are missing', () => {
    setCart([{ id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }]);

    expect(() => updateCartDisplay()).not.toThrow();
  });

  test('updateCartDisplay hides cart panel when cart is empty', () => {
    document.body.innerHTML = `
      <div id="cartPanel" style="display:block"></div>
      <div id="cartItems"></div>
      <span id="cartTotal"></span>
    `;

    setCart([]);
    updateCartDisplay();

    expect(document.getElementById('cartPanel').style.display).toBe('none');
  });

  test('updateCartDisplay renders items and total when cart has items', () => {
    document.body.innerHTML = `
      <div id="cartPanel" style="display:none"></div>
      <div id="cartItems"></div>
      <span id="cartTotal"></span>
    `;

    setCart([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' },
      { id: '2', name: 'Chips', price: 20, vendor_id: 'v1' }
    ]);

    updateCartDisplay();

    expect(document.getElementById('cartPanel').style.display).toBe('block');
    expect(document.getElementById('cartItems').innerHTML).toContain('Burger');
    expect(document.getElementById('cartItems').innerHTML).toContain('Chips');
    expect(document.getElementById('cartItems').innerHTML).toContain('removeFromCart(0)');
    expect(document.getElementById('cartItems').innerHTML).toContain('removeFromCart(1)');
    expect(document.getElementById('cartTotal').textContent).toBe('R70');
  });
});