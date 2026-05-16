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
let mockRequestPaystackRefund;

let mockAuthGetUser;
let mockFrom;

let mockOrdersSelect;
let mockOrdersSelectEq;
let mockOrdersOrder;

let mockOrdersUpdate;
let mockOrdersUpdateEqFirst;
let mockOrdersUpdateEqSecond;
let mockOrdersUpdateIn;
let mockOrdersUpdateSelect;

let mockReviewsSelect;

let mockChannel;
let mockOn;
let mockSubscribe;
let mockRemoveChannel;

let realtimeCallback;
let intervalCallback;

async function loadDashboardModule({
  userResponse = {
    data: {
      user: {
        id: 's1'
      }
    },
    error: null
  },

  ordersResult = {
    data: [],
    error: null
  },

  reviewsResult = {
    data: [],
    error: null
  },

  updateResult = {
    data: [
      {
        id: '1'
      }
    ],
    error: null
  },

  refundResult = {
    data: {
      status: 'processed'
    }
  },

  refundError = null
} = {}) {
  jest.resetModules();

  realtimeCallback = null;

  mockToast = jest.fn();

  mockRequestPaystackRefund = refundError
    ? jest.fn().mockRejectedValue(refundError)
    : jest.fn().mockResolvedValue(refundResult);

  mockAuthGetUser = jest
    .fn()
    .mockResolvedValue(userResponse);

  mockOrdersOrder = jest
    .fn()
    .mockResolvedValue(ordersResult);

  mockOrdersSelectEq = jest.fn(() => ({
    order: mockOrdersOrder
  }));

  mockOrdersSelect = jest.fn(() => ({
    eq: mockOrdersSelectEq
  }));

  mockOrdersUpdateSelect = jest
    .fn()
    .mockResolvedValue(updateResult);

  mockOrdersUpdateIn = jest.fn(() => ({
    select: mockOrdersUpdateSelect
  }));

  mockOrdersUpdateEqSecond = jest.fn(() => ({
    in: mockOrdersUpdateIn
  }));

  mockOrdersUpdateEqFirst = jest.fn(() => ({
    eq: mockOrdersUpdateEqSecond
  }));

  mockOrdersUpdate = jest.fn(() => ({
    eq: mockOrdersUpdateEqFirst
  }));

  mockReviewsSelect = jest
    .fn()
    .mockResolvedValue(reviewsResult);

  mockSubscribe = jest.fn((statusCallback) => {
    if (typeof statusCallback === 'function') {
      statusCallback('SUBSCRIBED');
    }

    return {
      name: 'mock-dashboard-channel'
    };
  });

  mockOn = jest.fn((eventName, config, callback) => {
    realtimeCallback = callback;

    return {
      subscribe: mockSubscribe
    };
  });

  mockChannel = jest.fn(() => ({
    on: mockOn
  }));

  mockRemoveChannel = jest.fn();

  mockFrom = jest.fn((table) => {
    if (table === 'orders') {
      return {
        select: mockOrdersSelect,
        update: mockOrdersUpdate
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
      auth: {
        getUser: mockAuthGetUser
      },
      from: mockFrom,
      channel: mockChannel,
      removeChannel: mockRemoveChannel
    }
  }));

  jest.unstable_mockModule('../shared/notifications.js', () => ({
    toast: mockToast
  }));

  jest.unstable_mockModule('./payment.js', () => ({
    requestPaystackRefund: mockRequestPaystackRefund
  }));

  return await import('./dashboard.js');
}

describe('student/dashboard.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    intervalCallback = null;

    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => true)
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.spyOn(global, 'setInterval').mockImplementation((callback) => {
      intervalCallback = callback;
      return 123;
    });

    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});

    delete window.cancelStudentOrder;
  });

  afterEach(() => {
    jest.restoreAllMocks();

    delete window.cancelStudentOrder;
  });

  test('renderStudentName fills both name fields', async () => {
    const { renderStudentName } = await loadDashboardModule();

    sessionStorage.setItem('username', 'Bethuel');

    document.body.innerHTML = `
      <div id="studentName"></div>
      <div id="studentNameWelcome"></div>
    `;

    renderStudentName();

    expect(document.getElementById('studentName').textContent).toBe('Bethuel');
    expect(document.getElementById('studentNameWelcome').textContent).toBe('Bethuel');
  });

  test('renderStudentName falls back to Student', async () => {
    const { renderStudentName } = await loadDashboardModule();

    document.body.innerHTML = `
      <div id="studentName"></div>
      <div id="studentNameWelcome"></div>
    `;

    renderStudentName();

    expect(document.getElementById('studentName').textContent).toBe('Student');
    expect(document.getElementById('studentNameWelcome').textContent).toBe('Student');
  });

  test('renderStudentName does not fail when name elements are missing', async () => {
    const { renderStudentName } = await loadDashboardModule();

    document.body.innerHTML = '';

    expect(() => {
      renderStudentName();
    }).not.toThrow();
  });

  test('initStudentDashboardLiveOrders stops when user cannot be found', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      userResponse: {
        data: {
          user: null
        },
        error: null
      }
    });

    await initStudentDashboardLiveOrders();

    expect(console.error).toHaveBeenCalledWith(
      'Could not get logged in student:',
      null
    );

    expect(mockChannel).not.toHaveBeenCalled();
    expect(window.cancelStudentOrder).toBeUndefined();
  });

  test('initStudentDashboardLiveOrders renders empty state when there are no active orders', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    expect(document.getElementById('liveOrdersContainer').innerHTML).toContain(
      'You have no active orders right now.'
    );

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockOrdersSelect).toHaveBeenCalledWith('*, vendors(username)');
    expect(mockOrdersSelectEq).toHaveBeenCalledWith('student_id', 's1');
    expect(mockOrdersOrder).toHaveBeenCalledWith('created_at', {
      ascending: false
    });

    expect(mockChannel).toHaveBeenCalledWith('student-dashboard-orders-s1');
    expect(window.cancelStudentOrder).toBe(cancelStudentOrder);
  });

  test('initStudentDashboardLiveOrders renders active orders only', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '100',
            vendors: {
              username: 'shop1'
            },
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Order Placed',
            created_at: new Date().toISOString(),
            payment_reference: 'pay_ref_1'
          },
          {
            id: '2',
            order_number: '200',
            vendors: {
              username: 'shop2'
            },
            items: [
              {
                name: 'Pizza'
              }
            ],
            total_price: 70,
            status: 'Completed',
            created_at: new Date().toISOString()
          },
          {
            id: '3',
            order_number: '300',
            vendors: {
              username: 'shop3'
            },
            items: [
              {
                name: 'Chips'
              }
            ],
            total_price: 20,
            status: 'Cancelled',
            created_at: new Date().toISOString()
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    const html = document.getElementById('liveOrdersContainer').innerHTML;

    expect(html).toContain('Order #100');
    expect(html).toContain('shop1');
    expect(html).toContain('Burger');
    expect(html).toContain('R50');
    expect(html).toContain('Cancel Order');

    expect(html).not.toContain('Order #200');
    expect(html).not.toContain('shop2');
    expect(html).not.toContain('Pizza');

    expect(html).not.toContain('Order #300');
    expect(html).not.toContain('shop3');
  });

  test('initStudentDashboardLiveOrders renders fallback order values', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [
          {
            id: 'fallback-id',
            order_number: '',
            vendors: null,
            items: null,
            total_price: null,
            status: '',
            created_at: null,
            payment_reference: 'pay_ref_1'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    const html = document.getElementById('liveOrdersContainer').innerHTML;

    expect(html).toContain('Order #fallback-id');
    expect(html).toContain('Unknown vendor');
    expect(html).toContain('No items listed');
    expect(html).toContain('R0');
    expect(html).toContain('Unknown time');
    expect(html).toContain('Unknown');
    expect(html).toContain('status-pending');
  });

  test('initStudentDashboardLiveOrders renders item title and default item fallback', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '101',
            vendors: {
              username: 'Shop A'
            },
            items: [
              {
                title: 'Wrap'
              },
              {}
            ],
            total_price: 60,
            status: 'Being Prepared',
            created_at: new Date().toISOString(),
            payment_reference: 'pay_ref_1'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    const html = document.getElementById('liveOrdersContainer').innerHTML;

    expect(html).toContain('Wrap');
    expect(html).toContain('Item');
    expect(html).toContain('status-confirmed');
  });

  test('initStudentDashboardLiveOrders shows live orders error message when orders fail', async () => {
    const error = {
      message: 'Orders failed'
    };

    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: null,
        error
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    expect(console.error).toHaveBeenCalledWith('Load live orders error:', error);

    expect(document.getElementById('liveOrdersContainer').innerHTML).toContain(
      'Failed to load live orders.'
    );
  });

  test('loadLiveOrders shows logged-in student error when current student is missing during refresh', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    mockAuthGetUser.mockResolvedValueOnce({
      data: {
        user: null
      },
      error: null
    });

    await realtimeCallback({
      eventType: 'INSERT',
      new: {
        id: 'new-order'
      },
      old: null
    });

    expect(document.getElementById('liveOrdersContainer').innerHTML).toContain(
      'Could not find logged in student.'
    );
  });

  test('initStudentDashboardLiveOrders does not fail when live orders container is missing', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = '';

    await initStudentDashboardLiveOrders();

    expect(mockChannel).toHaveBeenCalledWith('student-dashboard-orders-s1');
  });

  test('initStudentDashboardLiveOrders renders top vendors when ratings exist', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: [
          {
            vendor_id: 'v1',
            rating: 5,
            vendors: {
              username: 'Kota Palace'
            }
          },
          {
            vendor_id: 'v1',
            rating: 3,
            vendors: {
              username: 'Kota Palace'
            }
          },
          {
            vendor_id: 'v2',
            rating: 5,
            vendors: {
              username: 'Burger Spot'
            }
          },
          {
            vendor_id: 'v3',
            rating: 2,
            vendors: null
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
      <div id="topVendorsContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    const html = document.getElementById('topVendorsContainer').innerHTML;

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockReviewsSelect).toHaveBeenCalledWith(`
      vendor_id,
      rating,
      vendors (
        username
      )
    `);

    expect(html).toContain('Burger Spot');
    expect(html).toContain('Kota Palace');
    expect(html).toContain('Unknown Vendor');

    expect(html).toContain('⭐ 5.0');
    expect(html).toContain('⭐ 4.0');
    expect(html).toContain('⭐ 2.0');

    expect(html).toContain('1 review');
    expect(html).toContain('2 reviews');

    expect(html).toContain('🥇');
    expect(html).toContain('🥈');
    expect(html).toContain('🥉');
  });

  test('initStudentDashboardLiveOrders limits top vendors to top 3', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: [
          {
            vendor_id: 'v1',
            rating: 5,
            vendors: {
              username: 'Vendor 1'
            }
          },
          {
            vendor_id: 'v2',
            rating: 4,
            vendors: {
              username: 'Vendor 2'
            }
          },
          {
            vendor_id: 'v3',
            rating: 3,
            vendors: {
              username: 'Vendor 3'
            }
          },
          {
            vendor_id: 'v4',
            rating: 2,
            vendors: {
              username: 'Vendor 4'
            }
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
      <div id="topVendorsContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    const html = document.getElementById('topVendorsContainer').innerHTML;

    expect(html).toContain('Vendor 1');
    expect(html).toContain('Vendor 2');
    expect(html).toContain('Vendor 3');
    expect(html).not.toContain('Vendor 4');
  });

  test('initStudentDashboardLiveOrders shows message when there are no vendor ratings', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
      <div id="topVendorsContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    expect(document.getElementById('topVendorsContainer').innerHTML).toContain(
      'No ratings available yet.'
    );
  });

  test('initStudentDashboardLiveOrders shows top vendors error message when reviews fail', async () => {
    const error = {
      message: 'Reviews failed'
    };

    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: null,
        error
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
      <div id="topVendorsContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    expect(console.error).toHaveBeenCalledWith('Top vendors error:', error);

    expect(document.getElementById('topVendorsContainer').innerHTML).toContain(
      'Failed to load top vendors.'
    );
  });

  test('initStudentDashboardLiveOrders does not fail when top vendors container is missing', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: [
          {
            vendor_id: 'v1',
            rating: 5,
            vendors: {
              username: 'Kota Palace'
            }
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    expect(mockReviewsSelect).not.toHaveBeenCalled();
  });

  test('renders refund status classes and labels', async () => {
    const fixedNow = new Date('2026-05-16T12:00:00Z').getTime();

    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '101',
            vendors: {
              username: 'Shop A'
            },
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Being Prepared',
            refund_status: 'refunded',
            created_at: new Date(fixedNow - 30 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            order_number: '102',
            vendors: {
              username: 'Shop B'
            },
            items: [
              {
                name: 'Pizza'
              }
            ],
            total_price: 70,
            status: 'Order Placed',
            refund_status: 'failed',
            created_at: new Date(fixedNow - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            order_number: '103',
            vendors: {
              username: 'Shop C'
            },
            items: [
              {
                name: 'Chips'
              }
            ],
            total_price: 25,
            status: 'Order Placed',
            refund_status: 'refund_requested',
            created_at: new Date(fixedNow - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '4',
            order_number: '104',
            vendors: {
              username: 'Shop D'
            },
            items: [
              {
                name: 'Juice'
              }
            ],
            total_price: 15,
            status: 'Ready for Collection',
            refund_status: 'manual_review',
            created_at: null
          },
          {
            id: '5',
            order_number: '105',
            vendors: {
              username: 'Shop E'
            },
            items: [
              {
                name: 'Water'
              }
            ],
            total_price: 10,
            status: 'Order Placed',
            refund_status: 'processing',
            created_at: new Date(fixedNow - 10 * 1000).toISOString()
          },
          {
            id: '6',
            order_number: '106',
            vendors: {
              username: 'Shop F'
            },
            items: [
              {
                name: 'Cake'
              }
            ],
            total_price: 30,
            status: 'Order Placed',
            refund_status: 'none',
            created_at: new Date(fixedNow).toISOString(),
            payment_reference: 'pay_ref_6'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    const html = document.getElementById('liveOrdersContainer').innerHTML;

    expect(html).toContain('Refunded');
    expect(html).toContain('Refund failed');
    expect(html).toContain('Refund requested');
    expect(html).toContain('manual review');
    expect(html).toContain('Refund processing');

    expect(html).toContain('status-completed');
    expect(html).toContain('status-cancelled');
    expect(html).toContain('status-confirmed');
    expect(html).toContain('status-pending');
    expect(html).toContain('status-approved');

    expect(html).toContain('30 min ago');
    expect(html).toContain('2 hr 0 min ago');
    expect(html).toContain('2 days ago');
    expect(html).toContain('Unknown time');
    expect(html).toContain('Just now');

    expect(html).toContain('Refund in progress');
    expect(html).toContain('Cancel Order');
  });

  test('renders singular day elapsed time', async () => {
    const fixedNow = new Date('2026-05-16T12:00:00Z').getTime();

    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [
          {
            id: '1',
            order_number: '101',
            vendors: {
              username: 'Shop A'
            },
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Order Placed',
            created_at: new Date(fixedNow - 25 * 60 * 60 * 1000).toISOString(),
            payment_reference: 'pay_ref_1'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    expect(document.getElementById('liveOrdersContainer').innerHTML).toContain(
      '1 day ago'
    );
  });

  test('initStudentDashboardLiveOrders removes old channel and clears old interval on reinitialisation', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await initStudentDashboardLiveOrders();

    expect(mockRemoveChannel).toHaveBeenCalledWith({
      name: 'mock-dashboard-channel'
    });

    expect(clearInterval).toHaveBeenCalledWith(123);
  });

  test('dashboard interval re-renders live orders', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    document.getElementById('liveOrdersContainer').innerHTML = '';

    expect(typeof intervalCallback).toBe('function');

    intervalCallback();

    expect(document.getElementById('liveOrdersContainer').innerHTML).toContain(
      'You have no active orders right now.'
    );
  });

  test('realtime subscription logs status', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    expect(console.log).toHaveBeenCalledWith(
      'Student dashboard realtime status:',
      'SUBSCRIBED'
    );
  });

  test('realtime callback shows completed order notification', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    await realtimeCallback({
      eventType: 'UPDATE',
      new: {
        id: '1',
        order_number: '100',
        status: 'Completed',
        refund_status: null
      },
      old: {
        id: '1',
        order_number: '100',
        status: 'Ready for Collection',
        refund_status: null
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Order #100 is completed ✅',
      'success'
    );
  });

  test('realtime callback shows ready for collection notification', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    await realtimeCallback({
      eventType: 'UPDATE',
      new: {
        id: '1',
        order_number: '100',
        status: 'Ready for Collection',
        refund_status: null
      },
      old: {
        id: '1',
        order_number: '100',
        status: 'Being Prepared',
        refund_status: null
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Order #100 is ready for collection 🛍️',
      'success'
    );
  });

  test('realtime callback shows being prepared notification', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    await realtimeCallback({
      eventType: 'UPDATE',
      new: {
        id: '1',
        order_number: '100',
        status: 'Being Prepared',
        refund_status: null
      },
      old: {
        id: '1',
        order_number: '100',
        status: 'Order Placed',
        refund_status: null
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Order #100 is being prepared 🍳',
      'success'
    );
  });

  test('realtime callback shows cancelled notification with refund label', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    await realtimeCallback({
      eventType: 'UPDATE',
      new: {
        id: '1',
        order_number: '100',
        status: 'Cancelled',
        refund_status: 'refunded'
      },
      old: {
        id: '1',
        order_number: '100',
        status: 'Being Prepared',
        refund_status: null
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Order #100 was cancelled. Refunded.',
      'success'
    );
  });

  test('realtime callback shows cancelled notification without refund label', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    await realtimeCallback({
      eventType: 'UPDATE',
      new: {
        id: '1',
        order_number: '100',
        status: 'Cancelled',
        refund_status: null
      },
      old: {
        id: '1',
        order_number: '100',
        status: 'Being Prepared',
        refund_status: null
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Order #100 was cancelled',
      'success'
    );
  });

  test('realtime callback shows generic status notification', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    await realtimeCallback({
      eventType: 'UPDATE',
      new: {
        id: '1',
        order_number: '100',
        status: 'Order Placed',
        refund_status: 'pending'
      },
      old: {
        id: '1',
        order_number: '100',
        status: 'Order Placed',
        refund_status: null
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Order #100 is now Order Placed',
      'success'
    );
  });

  test('realtime callback does not notify when status and refund status did not change', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    mockToast.mockClear();

    await realtimeCallback({
      eventType: 'UPDATE',
      new: {
        id: '1',
        order_number: '100',
        status: 'Order Placed',
        refund_status: null
      },
      old: {
        id: '1',
        order_number: '100',
        status: 'Order Placed',
        refund_status: null
      }
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  test('realtime callback does not notify on insert but still reloads orders', async () => {
    const { initStudentDashboardLiveOrders } = await loadDashboardModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    mockToast.mockClear();
    mockOrdersOrder.mockClear();

    await realtimeCallback({
      eventType: 'INSERT',
      new: {
        id: '1',
        order_number: '100',
        status: 'Order Placed'
      },
      old: null
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(mockOrdersOrder).toHaveBeenCalled();
  });

  test('cancelStudentOrder shows error if order is not found', async () => {
    const { cancelStudentOrder } = await loadDashboardModule();

    await cancelStudentOrder('missing');

    expect(mockToast).toHaveBeenCalledWith('Order not found', 'error');
  });

  test('cancelStudentOrder blocks cancellation when status cannot be cancelled', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Ready for Collection',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockToast).toHaveBeenCalledWith(
      'This order can no longer be cancelled',
      'error'
    );

    expect(mockRequestPaystackRefund).not.toHaveBeenCalled();
    expect(mockOrdersUpdate).not.toHaveBeenCalled();
  });

  test('cancelStudentOrder blocks cancellation when refund is already busy', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              refund_status: 'processing',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockToast).toHaveBeenCalledWith(
      'This order can no longer be cancelled',
      'error'
    );

    expect(mockRequestPaystackRefund).not.toHaveBeenCalled();
    expect(mockOrdersUpdate).not.toHaveBeenCalled();
  });

  test('cancelStudentOrder blocks cancellation when payment reference is missing', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString()
            }
          ],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockToast).toHaveBeenCalledWith(
      'Payment reference is missing. Please contact support before cancelling.',
      'error'
    );

    expect(mockRequestPaystackRefund).not.toHaveBeenCalled();
    expect(mockOrdersUpdate).not.toHaveBeenCalled();
  });

  test('cancelStudentOrder uses payment_id as payment reference', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_id: 'payment_id_1'
            }
          ],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockRequestPaystackRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment_id_1'
      })
    );
  });

  test('cancelStudentOrder uses paystack_reference as payment reference', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              paystack_reference: 'paystack_ref_1'
            }
          ],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockRequestPaystackRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'paystack_ref_1'
      })
    );
  });

  test('cancelStudentOrder shows error when student disappears before cancellation', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();

    mockAuthGetUser.mockResolvedValueOnce({
      data: {
        user: null
      },
      error: null
    });

    await cancelStudentOrder('1');

    expect(mockToast).toHaveBeenCalledWith(
      'Could not find logged in student',
      'error'
    );

    expect(mockRequestPaystackRefund).not.toHaveBeenCalled();
    expect(mockOrdersUpdate).not.toHaveBeenCalled();
  });

  test('cancelStudentOrder does not cancel when user rejects confirmation', async () => {
    window.confirm = jest.fn(() => false);

    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockRequestPaystackRefund).not.toHaveBeenCalled();
    expect(mockOrdersUpdate).not.toHaveBeenCalled();
  });

  test('cancelStudentOrder cancels order and requests refund', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        },

        updateResult: {
          data: [
            {
              id: '1'
            }
          ],
          error: null
        },

        refundResult: {
          data: {
            status: 'processed'
          }
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(window.confirm).toHaveBeenCalledWith(
      'Cancel this order and request a refund?'
    );

    expect(console.log).toHaveBeenCalledWith(
      'Cancelling order with refund:',
      '1',
      'for student:',
      's1'
    );

    expect(mockRequestPaystackRefund).toHaveBeenCalledWith({
      orderId: '1',
      paymentId: 'pay_ref_1',
      amount: 50,
      reason: 'Cancelled order 100'
    });

    expect(mockOrdersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Cancelled',
        refund_status: 'refunded'
      })
    );

    expect(mockOrdersUpdateEqFirst).toHaveBeenCalledWith('id', '1');
    expect(mockOrdersUpdateEqSecond).toHaveBeenCalledWith('student_id', 's1');

    expect(mockOrdersUpdateIn).toHaveBeenCalledWith('status', [
      'Order Placed',
      'Being Prepared'
    ]);

    expect(mockOrdersUpdateSelect).toHaveBeenCalled();

    expect(mockToast).toHaveBeenCalledWith(
      'Order cancelled and refund processed',
      'success'
    );
  });

  test('cancelStudentOrder shows requested message when refund is not immediately processed', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        },

        updateResult: {
          data: [
            {
              id: '1'
            }
          ],
          error: null
        },

        refundResult: {
          data: {
            status: 'pending'
          }
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockOrdersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Cancelled',
        refund_status: 'refund_requested'
      })
    );

    expect(mockToast).toHaveBeenCalledWith(
      'Order cancelled and refund requested',
      'success'
    );
  });

  test('cancelStudentOrder handles database update error after refund request', async () => {
    const dbError = {
      message: 'Database update failed'
    };

    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        },

        updateResult: {
          data: null,
          error: dbError
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockRequestPaystackRefund).toHaveBeenCalled();

    expect(console.error).toHaveBeenCalledWith(
      'Cancel order database update error:',
      dbError
    );

    expect(mockToast).toHaveBeenCalledWith(
      'Refund was requested, but the order could not be marked cancelled. Contact support.',
      'error'
    );
  });

  test('cancelStudentOrder handles empty update result after refund request', async () => {
    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        },

        updateResult: {
          data: [],
          error: null
        }
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockRequestPaystackRefund).toHaveBeenCalled();

    expect(mockToast).toHaveBeenCalledWith(
      'Refund was requested, but this order may have already changed. Contact support.',
      'error'
    );
  });

  test('cancelStudentOrder marks refund as failed when refund request throws', async () => {
    const refundError = new Error('Refund request failed');

    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        },

        refundError
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(console.error).toHaveBeenCalledWith(
      'Cancel order refund error:',
      refundError
    );

    expect(mockOrdersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        refund_status: 'failed'
      })
    );

    expect(mockOrdersUpdateEqFirst).toHaveBeenCalledWith('id', '1');
    expect(mockOrdersUpdateEqSecond).toHaveBeenCalledWith('student_id', 's1');

    expect(mockOrdersUpdateIn).toHaveBeenCalledWith('status', [
      'Order Placed',
      'Being Prepared'
    ]);

    expect(mockToast).toHaveBeenCalledWith(
      'Refund request failed',
      'error'
    );
  });

  test('cancelStudentOrder uses fallback refund error message when refund error has no message', async () => {
    const refundError = {};

    const { initStudentDashboardLiveOrders, cancelStudentOrder } =
      await loadDashboardModule({
        ordersResult: {
          data: [
            {
              id: '1',
              order_number: '100',
              vendors: {
                username: 'shop1'
              },
              items: [
                {
                  name: 'Burger'
                }
              ],
              total_price: 50,
              status: 'Order Placed',
              created_at: new Date().toISOString(),
              payment_reference: 'pay_ref_1'
            }
          ],
          error: null
        },

        refundError
      });

    document.body.innerHTML = `
      <div id="liveOrdersContainer"></div>
    `;

    await initStudentDashboardLiveOrders();
    await cancelStudentOrder('1');

    expect(mockToast).toHaveBeenCalledWith(
      'Refund request failed. Order was not cancelled.',
      'error'
    );
  });
});
