import { jest } from '@jest/globals';

const mockToast = jest.fn();
const mockGetCart = jest.fn();
const mockSetCart = jest.fn();

const mockStartPaystackPayment = jest.fn();
const mockVerifyPaystackReference = jest.fn();

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

jest.unstable_mockModule('./cart.js', () => ({
  getCart: mockGetCart,
  setCart: mockSetCart
}));

jest.unstable_mockModule('./payment.js', () => ({
  startPaystackPayment: mockStartPaystackPayment,
  verifyPaystackReference: mockVerifyPaystackReference
}));

const {
  placeOrder,
  completePaidOrderAfterPayment
} = await import('./checkout.js');

describe('student/checkout.js', () => {
  beforeEach(() => {
    sessionStorage.clear();

    document.body.innerHTML = '';

    mockToast.mockReset();
    mockGetCart.mockReset();
    mockSetCart.mockReset();

    mockStartPaystackPayment.mockReset();
    mockVerifyPaystackReference.mockReset();

    mockAuthGetUser.mockReset();
    mockStudentsMaybeSingle.mockReset();
    mockVendorsMaybeSingle.mockReset();
    mockOrdersInsert.mockReset();
    mockStudentsInsertMaybeSingle.mockReset();
    mockFrom.mockClear();

    global.console.error = jest.fn();

    // Reset URL between tests
    window.history.pushState({}, '', '/student_orders.html');
  });

  test('shows error when cart is empty', async () => {
    mockGetCart.mockReturnValue([]);

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Your cart is empty', 'error');
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
  });

  test('shows error when username is missing', async () => {
    mockGetCart.mockReturnValue([
      { id: '1', name: 'Burger', price: 50, vendor_id: 'v1' }
    ]);

    await placeOrder();

    expect(mockToast).toHaveBeenCalledWith('Please login again', 'error');
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
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
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
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

    expect(mockToast).toHaveBeenCalledWith(
      'Please order from one vendor at a time',
      'error'
    );
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
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
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
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

    expect(mockToast).toHaveBeenCalledWith(
      'Vendor not found. Please try again.',
      'error'
    );
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
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

    expect(mockToast).toHaveBeenCalledWith(
      'This vendor is not available at the moment',
      'error'
    );
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
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

    await placeOrder();

    expect(sessionStorage.getItem('studentId')).toBe('u1');
    expect(mockStartPaystackPayment).toHaveBeenCalledWith({
      email: 'bethuel@example.com',
      amount: 50,
      orderId: expect.stringMatching(/^ORD-/)
    });
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
    expect(mockStartPaystackPayment).not.toHaveBeenCalled();
  });

  test('starts Paystack payment when everything is valid', async () => {
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

    await placeOrder();

    expect(mockStartPaystackPayment).toHaveBeenCalledWith({
      email: 'bethuel@example.com',
      amount: 50,
      orderId: expect.stringMatching(/^ORD-/)
    });

    const pendingOrder = JSON.parse(
      sessionStorage.getItem('pending_paystack_order')
    );

    expect(pendingOrder).toMatchObject({
      student_id: 's1',
      student_username: 'bethuel',
      student_email: 'bethuel@example.com',
      vendor_id: 'v1',
      total_price: 50,
      status: 'Order Placed',
      items: [
        {
          id: '1',
          name: 'Burger',
          price: 50
        }
      ]
    });

    expect(mockOrdersInsert).not.toHaveBeenCalled();
    expect(mockSetCart).not.toHaveBeenCalled();
  });

  test('shows message when payment reference is missing', async () => {
    document.body.innerHTML = `
      <p id="paymentStatus"></p>
      <a id="continueBtn" hidden>Go to dashboard</a>
    `;

    window.history.pushState({}, '', '/payment_success.html');

    await completePaidOrderAfterPayment();

    expect(document.getElementById('paymentStatus').textContent).toBe(
      'No payment reference found.'
    );
    expect(mockVerifyPaystackReference).not.toHaveBeenCalled();
    expect(mockOrdersInsert).not.toHaveBeenCalled();
  });

  test('shows message when pending order is missing', async () => {
    document.body.innerHTML = `
      <p id="paymentStatus"></p>
      <a id="continueBtn" hidden>Go to dashboard</a>
    `;

    window.history.pushState(
      {},
      '',
      '/payment_success.html?reference=test-ref-123'
    );

    await completePaidOrderAfterPayment();

    expect(document.getElementById('paymentStatus').textContent).toBe(
      'No pending order found. Please place the order again.'
    );
    expect(mockVerifyPaystackReference).not.toHaveBeenCalled();
    expect(mockOrdersInsert).not.toHaveBeenCalled();
  });

  test('shows error when payment verification fails', async () => {
    document.body.innerHTML = `
      <p id="paymentStatus"></p>
      <a id="continueBtn" hidden>Go to dashboard</a>
    `;

    window.history.pushState(
      {},
      '',
      '/payment_success.html?reference=test-ref-123'
    );

    sessionStorage.setItem(
      'pending_paystack_order',
      JSON.stringify({
        order_number: 'ORD-123',
        student_id: 's1',
        student_username: 'bethuel',
        student_email: 'bethuel@example.com',
        vendor_id: 'v1',
        items: [{ id: '1', name: 'Burger', price: 50 }],
        total_price: 50,
        status: 'Order Placed',
        created_at: new Date().toISOString()
      })
    );

    mockVerifyPaystackReference.mockResolvedValue({
      status: false,
      data: { status: 'failed' }
    });

    await completePaidOrderAfterPayment();

    expect(mockVerifyPaystackReference).toHaveBeenCalledWith('test-ref-123');
    expect(document.getElementById('paymentStatus').textContent).toBe(
      'Payment was not successful.'
    );
    expect(mockOrdersInsert).not.toHaveBeenCalled();
  });

  test('shows error when payment amount does not match order amount', async () => {
    document.body.innerHTML = `
      <p id="paymentStatus"></p>
      <a id="continueBtn" hidden>Go to dashboard</a>
    `;

    window.history.pushState(
      {},
      '',
      '/payment_success.html?reference=test-ref-123'
    );

    sessionStorage.setItem(
      'pending_paystack_order',
      JSON.stringify({
        order_number: 'ORD-123',
        student_id: 's1',
        student_username: 'bethuel',
        student_email: 'bethuel@example.com',
        vendor_id: 'v1',
        items: [{ id: '1', name: 'Burger', price: 50 }],
        total_price: 50,
        status: 'Order Placed',
        created_at: new Date().toISOString()
      })
    );

    mockVerifyPaystackReference.mockResolvedValue({
      status: true,
      data: {
        status: 'success',
        amount: 4000
      }
    });

    await completePaidOrderAfterPayment();

    expect(document.getElementById('paymentStatus').textContent).toBe(
      'Payment amount mismatch. Please contact support.'
    );
    expect(mockOrdersInsert).not.toHaveBeenCalled();
  });

  test('creates order after successful payment verification', async () => {
    document.body.innerHTML = `
      <p id="paymentStatus"></p>
      <a id="continueBtn" hidden>Go to dashboard</a>
    `;

    window.history.pushState(
      {},
      '',
      '/payment_success.html?reference=test-ref-123'
    );

    const pendingOrder = {
      order_number: 'ORD-123',
      student_id: 's1',
      student_username: 'bethuel',
      student_email: 'bethuel@example.com',
      vendor_id: 'v1',
      items: [{ id: '1', name: 'Burger', price: 50 }],
      total_price: 50,
      status: 'Order Placed',
      created_at: new Date().toISOString()
    };

    sessionStorage.setItem(
      'pending_paystack_order',
      JSON.stringify(pendingOrder)
    );
    sessionStorage.setItem('cart', JSON.stringify(pendingOrder.items));

    mockVerifyPaystackReference.mockResolvedValue({
      status: true,
      data: {
        status: 'success',
        amount: 5000
      }
    });

    mockOrdersInsert.mockResolvedValue({
      error: null
    });

    await completePaidOrderAfterPayment();

    expect(mockVerifyPaystackReference).toHaveBeenCalledWith('test-ref-123');
    expect(mockOrdersInsert).toHaveBeenCalledWith([pendingOrder]);

    expect(sessionStorage.getItem('pending_paystack_order')).toBeNull();
    expect(sessionStorage.getItem('cart')).toBeNull();

    expect(mockSetCart).toHaveBeenCalledWith([]);

    expect(document.getElementById('paymentStatus').textContent).toBe(
      'Payment successful. Your order has been placed.'
    );
    expect(document.getElementById('continueBtn').hidden).toBe(false);
  });

  test('shows error when order creation fails after successful payment', async () => {
    document.body.innerHTML = `
      <p id="paymentStatus"></p>
      <a id="continueBtn" hidden>Go to dashboard</a>
    `;

    window.history.pushState(
      {},
      '',
      '/payment_success.html?reference=test-ref-123'
    );

    const pendingOrder = {
      order_number: 'ORD-123',
      student_id: 's1',
      student_username: 'bethuel',
      student_email: 'bethuel@example.com',
      vendor_id: 'v1',
      items: [{ id: '1', name: 'Burger', price: 50 }],
      total_price: 50,
      status: 'Order Placed',
      created_at: new Date().toISOString()
    };

    sessionStorage.setItem(
      'pending_paystack_order',
      JSON.stringify(pendingOrder)
    );

    mockVerifyPaystackReference.mockResolvedValue({
      status: true,
      data: {
        status: 'success',
        amount: 5000
      }
    });

    mockOrdersInsert.mockResolvedValue({
      error: { message: 'insert failed' }
    });

    await completePaidOrderAfterPayment();

    expect(console.error).toHaveBeenCalled();
    expect(document.getElementById('paymentStatus').textContent).toBe(
      'Payment succeeded, but order creation failed.'
    );

    expect(sessionStorage.getItem('pending_paystack_order')).not.toBeNull();
    expect(document.getElementById('continueBtn').hidden).toBe(true);
  });
});