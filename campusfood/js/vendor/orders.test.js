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

let mockToast;
let mockGetVendorId;

let mockFrom;

let mockOrdersSelect;
let mockOrdersEq;

let mockReviewsSelect;
let mockReviewsEq;

let mockUpdate;
let mockUpdateEq;

async function loadOrdersModule({
  vendorId = 'v1',

  ordersResult = {
    data: [],
    error: null
  },

  reviewsResult = {
    data: [],
    error: null
  },

  updateResult = {
    error: null
  }
} = {}) {
  jest.resetModules();

  mockToast = jest.fn();
  mockGetVendorId = jest.fn().mockResolvedValue(vendorId);

  mockOrdersEq = jest.fn().mockResolvedValue(ordersResult);
  mockReviewsEq = jest.fn().mockResolvedValue(reviewsResult);

  mockOrdersSelect = jest.fn(() => ({
    eq: mockOrdersEq
  }));

  mockReviewsSelect = jest.fn(() => ({
    eq: mockReviewsEq
  }));

  mockUpdateEq = jest.fn().mockResolvedValue(updateResult);

  mockUpdate = jest.fn(() => ({
    eq: mockUpdateEq
  }));

  mockFrom = jest.fn((table) => {
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

  return await import('./orders.js');
}

function setupOrdersDOM() {
  document.body.innerHTML = `
    <table>
      <tbody id="ordersBody"></tbody>
    </table>

    <div id="vendorReviewModal" style="display:none"></div>
    <div id="reviewModalOrderNumber"></div>
    <div id="reviewModalStudent"></div>
    <div id="reviewModalRating"></div>
    <div id="reviewModalText"></div>
    <div id="reviewModalItems"></div>
  `;
}

describe('vendor/orders.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    sessionStorage.setItem('username', 'shop1');

    jest.spyOn(console, 'error').mockImplementation(() => {});

    delete window.openVendorReviewModal;
    delete window.closeVendorReviewModal;
  });

  afterEach(() => {
    jest.restoreAllMocks();

    delete window.openVendorReviewModal;
    delete window.closeVendorReviewModal;
  });

  test('assigns review modal functions to window', async () => {
    await loadOrdersModule();

    expect(typeof window.openVendorReviewModal).toBe('function');
    expect(typeof window.closeVendorReviewModal).toBe('function');
  });

  test('loadVendorOrders returns early if orders table body is missing', async () => {
    const { loadVendorOrders } = await loadOrdersModule();

    await loadVendorOrders();

    expect(mockGetVendorId).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('loadVendorOrders shows vendor not found when vendor id is missing', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      vendorId: null
    });

    setupOrdersDOM();

    await loadVendorOrders();

    expect(mockGetVendorId).toHaveBeenCalledWith('shop1');
    expect(document.getElementById('ordersBody').innerHTML).toContain(
      'Vendor not found'
    );
  });

  test('loadVendorOrders shows failure message when orders query fails', async () => {
    const ordersError = {
      message: 'orders failed'
    };

    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: null,
        error: ordersError
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    expect(console.error).toHaveBeenCalledWith(
      'Vendor orders load error:',
      ordersError
    );

    expect(document.getElementById('ordersBody').innerHTML).toContain(
      'Failed to load orders'
    );
  });

  test('loadVendorOrders shows empty state when vendor has no orders', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    expect(document.getElementById('ordersBody').innerHTML).toContain(
      'No orders yet'
    );

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockOrdersSelect).toHaveBeenCalledWith('*');
    expect(mockOrdersEq).toHaveBeenCalledWith('vendor_id', 'v1');

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockReviewsSelect).toHaveBeenCalledWith('*');
    expect(mockReviewsEq).toHaveBeenCalledWith('vendor_id', 'v1');
  });

  test('loadVendorOrders renders orders, actions, refunds, and reviews', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '101',
            student_username: 'Bethuel',
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Order Placed',
            created_at: '2026-05-16T10:00:00Z'
          },
          {
            id: '2',
            order_number: '102',
            student_username: 'John',
            items: [
              {
                title: 'Pizza'
              },
              {}
            ],
            total_price: 70,
            status: 'Completed',
            refund_status: 'refunded',
            created_at: '2026-05-16T11:00:00Z'
          },
          {
            id: '3',
            order_number: '103',
            student_username: '',
            items: 'Manual item text',
            total_price: null,
            status: 'Cancelled',
            refund_status: 'failed',
            created_at: '2026-05-16T12:00:00Z'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [
          {
            id: 'r1',
            order_id: '2',
            rating: 5,
            review_text: 'Great food'
          }
        ],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    const html = document.getElementById('ordersBody').innerHTML;

    expect(html).toContain('#101');
    expect(html).toContain('Bethuel');
    expect(html).toContain('Burger');
    expect(html).toContain('R50');
    expect(html).toContain('select onchange="updateOrderStatus');

    expect(html).toContain('#102');
    expect(html).toContain('Pizza, Item');
    expect(html).toContain('Completed');
    expect(html).toContain('Refunded');
    expect(html).toContain('status-completed');
    expect(html).toContain('View Review');

    expect(html).toContain('#103');
    expect(html).toContain('Unknown');
    expect(html).toContain('Manual item text');
    expect(html).toContain('R0');
    expect(html).toContain('Cancelled');
    expect(html).toContain('Refund failed');
    expect(html).toContain('status-cancelled');
  });

  test('loadVendorOrders sorts active statuses before completed and cancelled', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '4',
            order_number: '104',
            status: 'Completed',
            created_at: '2026-05-16T14:00:00Z'
          },
          {
            id: '2',
            order_number: '102',
            status: 'Being Prepared',
            created_at: '2026-05-16T12:00:00Z'
          },
          {
            id: '1',
            order_number: '101',
            status: 'Order Placed',
            created_at: '2026-05-16T11:00:00Z'
          },
          {
            id: '3',
            order_number: '103',
            status: 'Ready for Collection',
            created_at: '2026-05-16T13:00:00Z'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    const html = document.getElementById('ordersBody').innerHTML;

    expect(html.indexOf('#101')).toBeLessThan(html.indexOf('#102'));
    expect(html.indexOf('#102')).toBeLessThan(html.indexOf('#103'));
    expect(html.indexOf('#103')).toBeLessThan(html.indexOf('#104'));
  });

  test('loadVendorOrders sorts same status by newest date first', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '101',
            status: 'Order Placed',
            created_at: '2026-05-16T10:00:00Z'
          },
          {
            id: '2',
            order_number: '102',
            status: 'Order Placed',
            created_at: '2026-05-16T12:00:00Z'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    const html = document.getElementById('ordersBody').innerHTML;

    expect(html.indexOf('#102')).toBeLessThan(html.indexOf('#101'));
  });

  test('loadVendorOrders shows toast when reviews fail to load', async () => {
    const reviewsError = {
      message: 'reviews failed'
    };

    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: null,
        error: reviewsError
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    expect(console.error).toHaveBeenCalledWith(
      'Vendor reviews load error:',
      reviewsError
    );

    expect(mockToast).toHaveBeenCalledWith('Could not load reviews', 'error');
  });

  test('openVendorReviewModal fills and opens modal for matching review', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '101',
            student_username: 'Bethuel',
            items: [
              {
                name: 'Burger'
              },
              {
                title: 'Chips'
              },
              {}
            ],
            total_price: 50,
            status: 'Completed'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [
          {
            id: 'r1',
            order_id: '1',
            rating: 4,
            review_text: 'Good food'
          }
        ],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    window.openVendorReviewModal('1');

    expect(document.getElementById('vendorReviewModal').style.display).toBe('flex');
    expect(document.getElementById('reviewModalOrderNumber').textContent).toBe('#101');
    expect(document.getElementById('reviewModalStudent').textContent).toBe('Bethuel');
    expect(document.getElementById('reviewModalRating').textContent).toBe('★★★★☆ (4/5)');
    expect(document.getElementById('reviewModalText').textContent).toBe('Good food');
    expect(document.getElementById('reviewModalItems').textContent).toBe(
      'Burger, Chips, Item'
    );
  });

  test('openVendorReviewModal uses fallback values', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '',
            student_username: '',
            items: '',
            total_price: 0,
            status: 'Completed'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [
          {
            id: 'r1',
            order_id: '1',
            rating: 0,
            review_text: '   '
          }
        ],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    window.openVendorReviewModal('1');

    expect(document.getElementById('reviewModalOrderNumber').textContent).toBe('#1');
    expect(document.getElementById('reviewModalStudent').textContent).toBe('Unknown');
    expect(document.getElementById('reviewModalRating').textContent).toBe('☆☆☆☆☆ (0/5)');
    expect(document.getElementById('reviewModalText').textContent).toBe(
      'No written comment.'
    );
    expect(document.getElementById('reviewModalItems').textContent).toBe('No items');
  });

  test('openVendorReviewModal returns early if order or review is missing', async () => {
    const { loadVendorOrders } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            status: 'Completed'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    window.openVendorReviewModal('1');
    window.openVendorReviewModal('missing');

    expect(document.getElementById('vendorReviewModal').style.display).toBe('none');
  });

  test('closeVendorReviewModal hides modal', async () => {
    await loadOrdersModule();

    setupOrdersDOM();

    document.getElementById('vendorReviewModal').style.display = 'flex';

    window.closeVendorReviewModal();

    expect(document.getElementById('vendorReviewModal').style.display).toBe('none');
  });

  test('closeVendorReviewModal does not fail when modal is missing', async () => {
    await loadOrdersModule();

    document.body.innerHTML = '';

    expect(() => {
      window.closeVendorReviewModal();
    }).not.toThrow();
  });

  test('updateOrderStatus shows error when order is not found', async () => {
    const { updateOrderStatus } = await loadOrdersModule();

    await updateOrderStatus('missing', 'Being Prepared');

    expect(mockToast).toHaveBeenCalledWith('Order not found', 'error');
  });

  test('updateOrderStatus rejects locked completed order', async () => {
    const { loadVendorOrders, updateOrderStatus } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            status: 'Completed'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();
    await updateOrderStatus('1', 'Ready for Collection');

    expect(mockToast).toHaveBeenCalledWith(
      'This order is locked and cannot be changed',
      'error'
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('updateOrderStatus rejects locked cancelled order', async () => {
    const { loadVendorOrders, updateOrderStatus } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            status: 'Cancelled'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();
    await updateOrderStatus('1', 'Being Prepared');

    expect(mockToast).toHaveBeenCalledWith(
      'This order is locked and cannot be changed',
      'error'
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('updateOrderStatus rejects backward movement and reloads orders', async () => {
    const { loadVendorOrders, updateOrderStatus } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            status: 'Being Prepared'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    mockOrdersEq.mockClear();

    await updateOrderStatus('1', 'Order Placed');

    expect(mockToast).toHaveBeenCalledWith(
      'Order status cannot move backward',
      'error'
    );

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockOrdersEq).toHaveBeenCalled();
  });

  test('updateOrderStatus shows update error message', async () => {
    const updateError = {
      message: 'update failed'
    };

    const { loadVendorOrders, updateOrderStatus } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            status: 'Order Placed'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      },

      updateResult: {
        error: updateError
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();
    await updateOrderStatus('1', 'Being Prepared');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Being Prepared',
        updated_at: expect.any(String)
      })
    );

    expect(mockUpdateEq).toHaveBeenCalledWith('id', '1');

    expect(console.error).toHaveBeenCalledWith(
      'Update order status error:',
      updateError
    );

    expect(mockToast).toHaveBeenCalledWith('update failed', 'error');
  });

  test('updateOrderStatus uses fallback error message when update error has no message', async () => {
    const { loadVendorOrders, updateOrderStatus } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            status: 'Order Placed'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      },

      updateResult: {
        error: {}
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();
    await updateOrderStatus('1', 'Being Prepared');

    expect(mockToast).toHaveBeenCalledWith('Failed to update order', 'error');
  });

  test('updateOrderStatus succeeds and reloads orders', async () => {
    const { loadVendorOrders, updateOrderStatus } = await loadOrdersModule({
      ordersResult: {
        data: [
          {
            id: '1',
            status: 'Order Placed'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      },

      updateResult: {
        error: null
      }
    });

    setupOrdersDOM();

    await loadVendorOrders();

    mockOrdersEq.mockClear();
    mockReviewsEq.mockClear();

    await updateOrderStatus('1', 'Being Prepared');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Being Prepared',
        updated_at: expect.any(String)
      })
    );

    expect(mockUpdateEq).toHaveBeenCalledWith('id', '1');
    expect(mockToast).toHaveBeenCalledWith('Order updated');

    expect(mockOrdersEq).toHaveBeenCalled();
    expect(mockReviewsEq).toHaveBeenCalled();
  });
});
