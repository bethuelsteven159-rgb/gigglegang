import { jest } from '@jest/globals';

const mockToast = jest.fn();
const mockGetVendorId = jest.fn();

const mockOrdersEq = jest.fn();
const mockReviewsEq = jest.fn();

const mockOrdersSelect = jest.fn(() => ({
  eq: mockOrdersEq
}));

const mockReviewsSelect = jest.fn(() => ({
  eq: mockReviewsEq
}));

const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn(() => ({
  eq: mockUpdateEq
}));

const mockFrom = jest.fn((table) => {
  if (table === 'orders') {
    return {
      select: mockOrdersSelect,
      update: mockUpdate
    };
  }

  if (table === 'reviews') {
    return {
      select: mockReviewsSelect
    };
  }

  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    from: mockFrom
  }
}));

jest.unstable_mockModule('../shared/notifications.js', () => ({
  toast: mockToast
}));

jest.unstable_mockModule('../shared/auth-helpers.js', () => ({
  getVendorId: mockGetVendorId
}));

const {
  loadVendorOrders,
  updateOrderStatus
} = await import('./orders.js');

describe('vendor/orders.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    mockToast.mockReset();
    mockGetVendorId.mockReset();

    mockOrdersEq.mockReset();
    mockReviewsEq.mockReset();
    mockOrdersSelect.mockClear();
    mockReviewsSelect.mockClear();

    mockUpdateEq.mockReset();
    mockUpdate.mockClear();
    mockFrom.mockClear();

    global.console.error = jest.fn();
  });

  test('loadVendorOrders returns early if container is missing', async () => {
    await loadVendorOrders();

    expect(mockGetVendorId).not.toHaveBeenCalled();
  });

  test('loadVendorOrders shows vendor not found when vendorId is missing', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue(null);

    await loadVendorOrders();

    expect(document.getElementById('ordersBody').innerHTML).toContain('Vendor not found');
  });

  test('loadVendorOrders shows failure message when orders query fails', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrdersEq.mockResolvedValue({
      data: null,
      error: { message: 'orders failed' }
    });

    await loadVendorOrders();

    expect(console.error).toHaveBeenCalled();
    expect(document.getElementById('ordersBody').innerHTML).toContain('Failed to load orders');
  });

  test('loadVendorOrders shows empty state when there are no orders', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrdersEq.mockResolvedValue({
      data: [],
      error: null
    });
    mockReviewsEq.mockResolvedValue({
      data: [],
      error: null
    });

    await loadVendorOrders();

    expect(document.getElementById('ordersBody').innerHTML).toContain('No orders yet');
  });

  test('loadVendorOrders renders orders and review button', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrdersEq.mockResolvedValue({
      data: [
        {
          id: '1',
          order_number: '101',
          student_username: 'bethuel',
          items: [{ name: 'Burger' }],
          total_price: 50,
          status: 'Order Placed',
          created_at: '2026-04-20T10:00:00Z'
        },
        {
          id: '2',
          order_number: '102',
          student_username: 'john',
          items: [{ name: 'Pizza' }],
          total_price: 70,
          status: 'Completed',
          created_at: '2026-04-20T11:00:00Z'
        }
      ],
      error: null
    });

    mockReviewsEq.mockResolvedValue({
      data: [
        {
          id: 'r1',
          order_id: '2',
          rating: 5,
          review_text: 'Great'
        }
      ],
      error: null
    });

    await loadVendorOrders();

    const html = document.getElementById('ordersBody').innerHTML;
    expect(html).toContain('#101');
    expect(html).toContain('#102');
    expect(html).toContain('bethuel');
    expect(html).toContain('Burger');
    expect(html).toContain('Pizza');
    expect(html).toContain('R50');
    expect(html).toContain('R70');
    expect(html).toContain('View Review');
    expect(html).toContain('select onchange=');
  });

  test('loadVendorOrders shows toast when reviews fail to load', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrdersEq.mockResolvedValue({
      data: [],
      error: null
    });
    mockReviewsEq.mockResolvedValue({
      data: null,
      error: { message: 'reviews failed' }
    });

    await loadVendorOrders();

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('Could not load reviews', 'error');
  });

  test('updateOrderStatus shows error when order is not found', async () => {
    await updateOrderStatus('missing', 'Being Prepared');

    expect(mockToast).toHaveBeenCalledWith('Order not found', 'error');
  });

  test('updateOrderStatus rejects backward movement', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrdersEq.mockResolvedValue({
      data: [
        {
          id: '1',
          order_number: '101',
          student_username: 'bethuel',
          items: [{ name: 'Burger' }],
          total_price: 50,
          status: 'Being Prepared',
          created_at: '2026-04-20T10:00:00Z'
        }
      ],
      error: null
    });
    mockReviewsEq.mockResolvedValue({
      data: [],
      error: null
    });

    await loadVendorOrders();
    await updateOrderStatus('1', 'Order Placed');

    expect(mockToast).toHaveBeenCalledWith('Order status cannot move backward', 'error');
  });

  test('updateOrderStatus rejects locked completed order', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrdersEq.mockResolvedValue({
      data: [
        {
          id: '1',
          order_number: '101',
          student_username: 'bethuel',
          items: [{ name: 'Burger' }],
          total_price: 50,
          status: 'Completed',
          created_at: '2026-04-20T10:00:00Z'
        }
      ],
      error: null
    });
    mockReviewsEq.mockResolvedValue({
      data: [],
      error: null
    });

    await loadVendorOrders();
    await updateOrderStatus('1', 'Ready for Collection');

    expect(mockToast).toHaveBeenCalledWith(
      'This order is locked and cannot be changed',
      'error'
    );
  });

  test('updateOrderStatus shows error when update fails', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');
    mockOrdersEq.mockResolvedValue({
      data: [
        {
          id: '1',
          order_number: '101',
          student_username: 'bethuel',
          items: [{ name: 'Burger' }],
          total_price: 50,
          status: 'Order Placed',
          created_at: '2026-04-20T10:00:00Z'
        }
      ],
      error: null
    });
    mockReviewsEq.mockResolvedValue({
      data: [],
      error: null
    });

    mockUpdateEq.mockResolvedValue({
      error: { message: 'update failed' }
    });

    await loadVendorOrders();
    await updateOrderStatus('1', 'Being Prepared');

    expect(console.error).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('update failed', 'error');
  });

  test('updateOrderStatus succeeds and reloads orders', async () => {
    document.body.innerHTML = `<table><tbody id="ordersBody"></tbody></table>`;
    sessionStorage.setItem('username', 'shop1');

    mockGetVendorId.mockResolvedValue('v1');

    mockOrdersEq
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            order_number: '101',
            student_username: 'bethuel',
            items: [{ name: 'Burger' }],
            total_price: 50,
            status: 'Order Placed',
            created_at: '2026-04-20T10:00:00Z'
          }
        ],
        error: null
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            order_number: '101',
            student_username: 'bethuel',
            items: [{ name: 'Burger' }],
            total_price: 50,
            status: 'Being Prepared',
            created_at: '2026-04-20T10:00:00Z'
          }
        ],
        error: null
      });

    mockReviewsEq
      .mockResolvedValueOnce({
        data: [],
        error: null
      })
      .mockResolvedValueOnce({
        data: [],
        error: null
      });

    mockUpdateEq.mockResolvedValue({
      error: null
    });

    await loadVendorOrders();
    await updateOrderStatus('1', 'Being Prepared');

    expect(mockToast).toHaveBeenCalledWith('Order updated');
  });
});