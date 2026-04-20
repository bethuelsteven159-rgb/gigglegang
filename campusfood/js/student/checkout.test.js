import { jest } from '@jest/globals';

const mockToast = jest.fn();
const mockLoadStudentOrderHistory = jest.fn();
const mockGetCart = jest.fn();
const mockSetCart = jest.fn();
const mockUpdateCartDisplay = jest.fn();

const mockAuthGetUser = jest.fn();
const mockStudentsMaybeSingle = jest.fn();
const mockVendorsMaybeSingle = jest.fn();
const mockOrdersInsert = jest.fn();
const mockStudentsInsertMaybeSingle = jest.fn();

const mockFrom = jest.fn((table) => {
  if (table === 'students') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: mockStudentsMaybeSingle
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          maybeSingle: mockStudentsInsertMaybeSingle
        }))
      }))
    };
  }

  if (table === 'vendors') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: mockVendorsMaybeSingle
        }))
      }))
    };
  }

  if (table === 'orders') {
    return {
      insert: mockOrdersInsert
    };
  }

  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    auth: {
      getUser: mockAuthGetUser
    },
    from: mockFrom
  }
}));

jest.unstable_mockModule('../shared/notifications.js', () => ({
  toast: mockToast
}));

jest.unstable_mockModule('./history.js', () => ({
  loadStudentOrderHistory: mockLoadStudentOrderHistory
}));

jest.unstable_mockModule('./cart.js', () => ({
  getCart: mockGetCart,
  setCart: mockSetCart,
  updateCartDisplay: mockUpdateCartDisplay
}));

const { placeOrder } = await import('./checkout.js');

describe('student/checkout.js', () => {
  beforeEach(() => {
    sessionStorage.clear();

    mockToast.mockReset();
    mockLoadStudentOrderHistory.mockReset();
    mockGetCart.mockReset();
    mockSetCart.mockReset();
    mockUpdateCartDisplay.mockReset();
    mockAuthGetUser.mockReset();
    mockStudentsMaybeSingle.mockReset();
    mockVendorsMaybeSingle.mockReset();
    mockOrdersInsert.mockReset();
    mockStudentsInsertMaybeSingle.mockReset();
    mockFrom.mockClear();

    global.console.error = jest.fn();
  });

  test('shows error when cart is empty', async () => {
    mockGetCart.mockReturnValue([]);

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Your cart is empty', 'error');
  });

  test('shows error when username is missing', async () => {
    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Please login again', 'error');
  });

  test('shows error when auth user is missing', async () => {
    sessionStorage.setItem('username', 'bethuel');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Please login again', 'error');
  });

  test('shows error when ordering from multiple vendors', async () => {
    sessionStorage.setItem('username', 'bethuel');
    sessionStorage.setItem('studentId', 's1');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' },
      { id: '2', name: 'Pizza', price: 70, vendor_id: 'v2' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Please order from one vendor at a time', 'error');
  });

  test('shows error when vendor lookup fails', async () => {
    sessionStorage.setItem('username', 'bethuel');
    sessionStorage.setItem('studentId', 's1');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    mockVendorsMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'vendor failed' }
    });

    await placeOrder();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Error checking vendor', 'error');
  });

  test('shows error when vendor does not exist', async () => {
    sessionStorage.setItem('username', 'bethuel');
    sessionStorage.setItem('studentId', 's1');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    mockVendorsMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Vendor not found. Please try again.', 'error');
  });

  test('shows error when vendor is not approved', async () => {
    sessionStorage.setItem('username', 'bethuel');
    sessionStorage.setItem('studentId', 's1');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    mockVendorsMaybeSingle.mockResolvedValue({
      data: { id: 'v1', username: 'shop1', status: 'pending' },
      error: null
    });

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('This vendor is not available at the moment', 'error');
  });

  test('creates student profile when studentId is missing and student does not exist', async () => {
    sessionStorage.setItem('username', 'bethuel');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    mockStudentsMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    mockStudentsInsertMaybeSingle.mockResolvedValue({
      data: { id: 'u1' },
      error: null
    });

    mockVendorsMaybeSingle.mockResolvedValue({
      data: { id: 'v1', username: 'shop1', status: 'approved' },
      error: null
    });

    mockOrdersInsert.mockResolvedValue({
      error: null
    });

    await placeOrder();

    expect(sessionStorage.getItem('studentId')).toBe('u1');
  });

  test('shows error when student creation fails', async () => {
    sessionStorage.setItem('username', 'bethuel');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    mockStudentsMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    mockStudentsInsertMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'create failed' }
    });

    await placeOrder();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      'Failed to create student profile: create failed',
      'error'
    );
  });

  test('places order successfully when everything is valid', async () => {
    sessionStorage.setItem('username', 'bethuel');
    sessionStorage.setItem('studentId', 's1');
    sessionStorage.setItem(
      'cart',
      JSON.stringify([{ id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }])
    );

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    mockVendorsMaybeSingle.mockResolvedValue({
      data: { id: 'v1', username: 'shop1', status: 'approved' },
      error: null
    });

    mockOrdersInsert.mockResolvedValue({
      error: null
    });

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Order placed successfully!');
    expect(mockSetCart).toHaveBeenCalledWith([]);
    expect(sessionStorage.getItem('cart')).toBeNull();
    expect(mockUpdateCartDisplay).toHaveBeenCalled();
    expect(mockLoadStudentOrderHistory).toHaveBeenCalled();
  });

  test('shows error when order insertion fails', async () => {
    sessionStorage.setItem('username', 'bethuel');
    sessionStorage.setItem('studentId', 's1');

    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'bethuel@example.com' } },
      error: null
    });

    mockVendorsMaybeSingle.mockResolvedValue({
      data: { id: 'v1', username: 'shop1', status: 'approved' },
      error: null
    });

    mockOrdersInsert.mockResolvedValue({
      error: { message: 'insert failed' }
    });

    await placeOrder();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Failed to place order: insert failed', 'error');
  });
});