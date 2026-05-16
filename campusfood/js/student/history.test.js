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

let mockAuthGetUser;
let mockFrom;

let mockOrdersSelect;
let mockOrdersEq;
let mockOrdersOrder;

let mockReviewsSelect;
let mockReviewsSelectEq;
let mockReviewsUpdate;
let mockReviewsUpdateEq;
let mockReviewsInsert;
let mockReviewsDelete;
let mockReviewsDeleteEq;

let mockChannel;
let mockOn;
let mockSubscribe;
let mockRemoveChannel;

let realtimeCallback;

async function loadHistoryModule({
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
    error: null
  },

  insertResult = {
    error: null
  },

  deleteResult = {
    error: null
  }
} = {}) {
  jest.resetModules();

  realtimeCallback = null;

  mockAuthGetUser = jest.fn().mockResolvedValue(userResponse);

  mockOrdersOrder = jest.fn().mockResolvedValue(ordersResult);

  mockOrdersEq = jest.fn(() => ({
    order: mockOrdersOrder
  }));

  mockOrdersSelect = jest.fn(() => ({
    eq: mockOrdersEq
  }));

  mockReviewsSelectEq = jest.fn().mockResolvedValue(reviewsResult);

  mockReviewsSelect = jest.fn(() => ({
    eq: mockReviewsSelectEq
  }));

  mockReviewsUpdateEq = jest.fn().mockResolvedValue(updateResult);

  mockReviewsUpdate = jest.fn(() => ({
    eq: mockReviewsUpdateEq
  }));

  mockReviewsInsert = jest.fn().mockResolvedValue(insertResult);

  mockReviewsDeleteEq = jest.fn().mockResolvedValue(deleteResult);

  mockReviewsDelete = jest.fn(() => ({
    eq: mockReviewsDeleteEq
  }));

  mockSubscribe = jest.fn((statusCallback) => {
    if (typeof statusCallback === 'function') {
      statusCallback('SUBSCRIBED');
    }

    return {
      name: 'orders-channel'
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
        select: mockOrdersSelect
      };
    }

    if (table === 'reviews') {
      return {
        select: mockReviewsSelect,
        update: mockReviewsUpdate,
        insert: mockReviewsInsert,
        delete: mockReviewsDelete
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

  return await import('./history.js');
}

function setupHistoryDOM() {
  document.body.innerHTML = `
    <div id="toastContainer"></div>

    <table>
      <tbody id="historyBody"></tbody>
    </table>

    <div id="reviewModal" style="display:none"></div>

    <div id="reviewOrderNumber"></div>
    <div id="reviewVendorName"></div>
    <div id="reviewItems"></div>
    <div id="reviewTotal"></div>
    <div id="reviewOrderInfo"></div>

    <textarea id="reviewText"></textarea>

    <button class="star" data-value="1">☆</button>
    <button class="star" data-value="2">☆</button>
    <button class="star" data-value="3">☆</button>
    <button class="star" data-value="4">☆</button>
    <button class="star" data-value="5">☆</button>

    <button class="tag">Fast</button>
    <button class="tag">Hot food</button>
  `;
}

async function flushPromises() {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe('student/history.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';

    jest.useFakeTimers();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    Reflect.deleteProperty(window, 'Notification');
    Reflect.deleteProperty(global, 'Notification');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();

    Reflect.deleteProperty(window, 'Notification');
    Reflect.deleteProperty(global, 'Notification');
  });

  test('loadStudentOrderHistory returns early when history table is missing', async () => {
    const { loadStudentOrderHistory } = await loadHistoryModule();

    await loadStudentOrderHistory();

    expect(mockAuthGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('loadStudentOrderHistory shows Student not found when user is missing', async () => {
    const { loadStudentOrderHistory } = await loadHistoryModule({
      userResponse: {
        data: {
          user: null
        },
        error: null
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    expect(console.error).toHaveBeenCalledWith(
      'Could not get logged in user:',
      null
    );

    expect(document.getElementById('historyBody').innerHTML).toContain(
      'Student not found'
    );
  });

  test('loadStudentOrderHistory shows Student not found when auth returns an error', async () => {
    const authError = {
      message: 'Auth failed'
    };

    const { loadStudentOrderHistory } = await loadHistoryModule({
      userResponse: {
        data: {
          user: null
        },
        error: authError
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    expect(console.error).toHaveBeenCalledWith(
      'Could not get logged in user:',
      authError
    );

    expect(document.getElementById('historyBody').innerHTML).toContain(
      'Student not found'
    );
  });

  test('loadStudentOrderHistory shows failed message when orders query fails', async () => {
    const ordersError = {
      message: 'orders failed'
    };

    const { loadStudentOrderHistory } = await loadHistoryModule({
      ordersResult: {
        data: null,
        error: ordersError
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    expect(console.error).toHaveBeenCalledWith(
      'Student history load error:',
      ordersError
    );

    expect(document.getElementById('historyBody').innerHTML).toContain(
      'Failed to load orders'
    );
  });

  test('loadStudentOrderHistory logs review errors but still renders orders', async () => {
    const reviewsError = {
      message: 'reviews failed'
    };

    const { loadStudentOrderHistory } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            vendors: {
              username: 'Kota Palace'
            },
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-01T10:00:00Z'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: null,
        error: reviewsError
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    expect(console.error).toHaveBeenCalledWith(
      'Student reviews load error:',
      reviewsError
    );

    expect(document.getElementById('historyBody').innerHTML).toContain(
      'Kota Palace'
    );
  });

  test('loadStudentOrderHistory shows empty row when there are no orders', async () => {
    const { loadStudentOrderHistory } = await loadHistoryModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    expect(document.getElementById('historyBody').innerHTML).toContain(
      'No orders yet'
    );

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockOrdersSelect).toHaveBeenCalledWith('*, vendors(username)');
    expect(mockOrdersEq).toHaveBeenCalledWith('student_id', 's1');
    expect(mockOrdersOrder).toHaveBeenCalledWith('created_at', {
      ascending: false
    });

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockReviewsSelect).toHaveBeenCalledWith('*');
    expect(mockReviewsSelectEq).toHaveBeenCalledWith('student_id', 's1');
  });

  test('loadStudentOrderHistory renders orders with Review, Edit Review, and Locked states', async () => {
    const { loadStudentOrderHistory } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            vendor_id: 'v1',
            vendors: {
              username: 'Kota Palace'
            },
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-01T10:00:00Z'
          },
          {
            id: 'o2',
            order_number: '200',
            vendor_id: 'v2',
            vendors: {
              username: 'Burger Spot'
            },
            items: [
              {
                title: 'Pizza'
              },
              {}
            ],
            total_price: 80,
            status: 'Delivered',
            created_at: '2026-05-02T10:00:00Z'
          },
          {
            id: 'o3',
            order_number: '',
            vendor_id: 'v3',
            vendors: null,
            items: null,
            total_price: null,
            status: 'Being Prepared',
            created_at: null
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [
          {
            id: 'r1',
            order_id: 'o2',
            rating: 4,
            review_text: 'Good'
          }
        ],
        error: null
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    const html = document.getElementById('historyBody').innerHTML;

    expect(html).toContain('#100');
    expect(html).toContain('Kota Palace');
    expect(html).toContain('Burger');
    expect(html).toContain('R50');
    expect(html).toContain('Completed');
    expect(html).toContain('Review');

    expect(html).toContain('#200');
    expect(html).toContain('Burger Spot');
    expect(html).toContain('Pizza, Item');
    expect(html).toContain('Edit Review');

    expect(html).toContain('#o3');
    expect(html).toContain('Unknown');
    expect(html).toContain('R0');
    expect(html).toContain('Locked');
  });

  test('subscribeToOrderUpdates returns early without student id', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    subscribeToOrderUpdates(null);

    expect(mockChannel).not.toHaveBeenCalled();
  });

  test('subscribeToOrderUpdates removes old channel before creating a new one', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    subscribeToOrderUpdates('s1');
    subscribeToOrderUpdates('s1');

    expect(mockRemoveChannel).toHaveBeenCalledWith({
      name: 'orders-channel'
    });

    expect(mockChannel).toHaveBeenCalledWith('orders-realtime-s1');
  });

  test('subscribeToOrderUpdates logs realtime subscription status', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    subscribeToOrderUpdates('s1');

    expect(console.log).toHaveBeenCalledWith(
      'Student order realtime status:',
      'SUBSCRIBED'
    );
  });

  test('realtime callback ignores missing old or new order', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    subscribeToOrderUpdates('s1');

    realtimeCallback({
      old: null,
      new: {
        status: 'Completed'
      }
    });

    expect(document.getElementById('toastContainer')).toBeNull();
  });

  test('realtime callback ignores unchanged status', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    setupHistoryDOM();

    subscribeToOrderUpdates('s1');

    realtimeCallback({
      old: {
        id: 'o1',
        status: 'Completed'
      },
      new: {
        id: 'o1',
        status: 'Completed'
      }
    });

    expect(document.getElementById('toastContainer').children.length).toBe(0);
  });

  test('realtime callback shows Being Prepared toast and reloads history', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule({
      ordersResult: {
        data: [],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupHistoryDOM();

    subscribeToOrderUpdates('s1');

    realtimeCallback({
      old: {
        id: 'o1',
        order_number: '100',
        status: 'Order Placed'
      },
      new: {
        id: 'o1',
        order_number: '100',
        status: 'Being Prepared'
      }
    });

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Order #100 is now being prepared'
    );

    expect(mockAuthGetUser).toHaveBeenCalled();
  });

  test('realtime callback shows Ready for Collection toast', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    setupHistoryDOM();

    subscribeToOrderUpdates('s1');

    realtimeCallback({
      old: {
        id: 'o1',
        order_number: '100',
        status: 'Being Prepared'
      },
      new: {
        id: 'o1',
        order_number: '100',
        status: 'Ready for Collection'
      }
    });

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Order #100 is ready for collection'
    );
  });

  test('realtime callback shows Completed toast and browser notification', async () => {
    const NotificationMock = jest.fn();
    NotificationMock.permission = 'granted';

    window.Notification = NotificationMock;
    global.Notification = NotificationMock;

    const { subscribeToOrderUpdates } = await loadHistoryModule();

    setupHistoryDOM();

    subscribeToOrderUpdates('s1');

    realtimeCallback({
      old: {
        id: 'o1',
        order_number: '100',
        status: 'Ready for Collection'
      },
      new: {
        id: 'o1',
        order_number: '100',
        status: 'Completed'
      }
    });

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Order #100 has been completed'
    );

    expect(NotificationMock).toHaveBeenCalledWith(
      'Order Completed',
      expect.objectContaining({
        body: 'Order #100 is complete. You can now leave a review.'
      })
    );
  });

  test('realtime callback shows generic updated toast', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    setupHistoryDOM();

    subscribeToOrderUpdates('s1');

    realtimeCallback({
      old: {
        id: 'o1',
        status: 'Order Placed'
      },
      new: {
        id: 'o1',
        status: 'Cancelled'
      }
    });

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Order #o1 is now: Cancelled'
    );
  });

  test('toast disappears after timers finish', async () => {
    const { subscribeToOrderUpdates } = await loadHistoryModule();

    setupHistoryDOM();

    subscribeToOrderUpdates('s1');

    realtimeCallback({
      old: {
        id: 'o1',
        status: 'Order Placed'
      },
      new: {
        id: 'o1',
        status: 'Cancelled'
      }
    });

    const toast = document.querySelector('.toast');

    expect(toast).not.toBeNull();

    jest.advanceTimersByTime(50);

    expect(toast.classList.contains('show')).toBe(true);

    jest.advanceTimersByTime(4500);

    expect(toast.classList.contains('show')).toBe(false);

    jest.advanceTimersByTime(300);

    expect(document.querySelector('.toast')).toBeNull();
  });

  test('openModal does nothing when order is not found', async () => {
    const { openModal } = await loadHistoryModule();

    setupHistoryDOM();

    openModal('missing');

    expect(document.getElementById('reviewModal').style.display).toBe('none');
  });

  test('openModal fills modal for new review', async () => {
    const { loadStudentOrderHistory, openModal } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            vendor_id: 'v1',
            vendors: {
              username: 'Kota Palace'
            },
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-01T10:00:00Z'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    openModal('o1');

    expect(document.getElementById('reviewModal').style.display).toBe('flex');
    expect(document.getElementById('reviewOrderNumber').textContent).toBe('#100');
    expect(document.getElementById('reviewVendorName').textContent).toBe('Kota Palace');
    expect(document.getElementById('reviewItems').textContent).toBe('Burger');
    expect(document.getElementById('reviewTotal').textContent).toBe('R50');
    expect(document.getElementById('reviewOrderInfo').textContent).toContain(
      'reviewing this completed order'
    );
  });

  test('openModal fills modal for existing review', async () => {
    const { loadStudentOrderHistory, openModal } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '',
            vendor_id: 'v1',
            vendors: null,
            items: null,
            total_price: null,
            status: 'Completed',
            created_at: null
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [
          {
            id: 'r1',
            order_id: 'o1',
            rating: 3,
            review_text: 'Good food'
          }
        ],
        error: null
      }
    });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    openModal('o1');

    expect(document.getElementById('reviewText').value).toBe('Good food');
    expect(document.getElementById('reviewOrderNumber').textContent).toBe('#o1');
    expect(document.getElementById('reviewVendorName').textContent).toBe('Unknown vendor');
    expect(document.getElementById('reviewItems').textContent).toBe('No items');
    expect(document.getElementById('reviewTotal').textContent).toBe('R0');
    expect(document.getElementById('reviewOrderInfo').textContent).toContain(
      'editing your review'
    );

    const stars = [...document.querySelectorAll('.star')].map(star => star.textContent);
    expect(stars).toEqual(['★', '★', '★', '☆', '☆']);
  });

  test('closeModal hides modal and clears review state', async () => {
    const { closeModal } = await loadHistoryModule();

    setupHistoryDOM();

    document.getElementById('reviewModal').style.display = 'flex';
    document.getElementById('reviewText').value = 'Nice food';
    document.querySelectorAll('.tag').forEach(tag => {
      tag.classList.add('active');
    });

    closeModal();

    expect(document.getElementById('reviewModal').style.display).toBe('none');
    expect(document.getElementById('reviewText').value).toBe('');

    document.querySelectorAll('.tag').forEach(tag => {
      expect(tag.classList.contains('active')).toBe(false);
    });
  });

  test('closeModal works when optional elements are missing', async () => {
    const { closeModal } = await loadHistoryModule();

    document.body.innerHTML = '';

    expect(() => {
      closeModal();
    }).not.toThrow();
  });

  test('initStudentHistoryPage binds click events and loads history', async () => {
    const { initStudentHistoryPage } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            vendor_id: 'v1',
            vendors: {
              username: 'Kota Palace'
            },
            items: [
              {
                name: 'Burger'
              }
            ],
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-01T10:00:00Z'
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupHistoryDOM();

    initStudentHistoryPage();

    await flushPromises();

    document.querySelector('.reviewBtn').click();

    expect(document.getElementById('reviewModal').style.display).toBe('flex');

    document.querySelector('.star[data-value="4"]').click();

    const stars = [...document.querySelectorAll('.star')].map(star => star.textContent);
    expect(stars).toEqual(['★', '★', '★', '★', '☆']);

    document.querySelector('.tag').click();

    expect(document.getElementById('reviewText').value).toBe('Fast');
    expect(document.querySelector('.tag').classList.contains('active')).toBe(true);
  });

  test('tag click does nothing when review text box is missing', async () => {
    const { initStudentHistoryPage } = await loadHistoryModule();

    document.body.innerHTML = `
      <button class="tag">Fast</button>
    `;

    initStudentHistoryPage();

    expect(() => {
      document.querySelector('.tag').click();
    }).not.toThrow();
  });

  test('submitReview shows error when current order is missing', async () => {
    const { submitReview } = await loadHistoryModule();

    setupHistoryDOM();

    await submitReview();

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Could not submit review'
    );
  });

  test('submitReview shows error when order is not completed', async () => {
    const { loadStudentOrderHistory, openModal, submitReview } =
      await loadHistoryModule({
        ordersResult: {
          data: [
            {
              id: 'o1',
              order_number: '100',
              vendor_id: 'v1',
              status: 'Being Prepared',
              items: [
                {
                  id: 'm1',
                  name: 'Burger'
                }
              ]
            }
          ],
          error: null
        },

        reviewsResult: {
          data: [],
          error: null
        }
      });

    setupHistoryDOM();

    await loadStudentOrderHistory();
    openModal('o1');

    await submitReview();

    expect(document.getElementById('toastContainer').textContent).toContain(
      'You can only review completed orders'
    );
  });

  test('submitReview shows error when rating is missing', async () => {
    const { loadStudentOrderHistory, openModal, submitReview } =
      await loadHistoryModule({
        ordersResult: {
          data: [
            {
              id: 'o1',
              order_number: '100',
              vendor_id: 'v1',
              status: 'Completed',
              items: [
                {
                  id: 'm1',
                  name: 'Burger'
                }
              ]
            }
          ],
          error: null
        },

        reviewsResult: {
          data: [],
          error: null
        }
      });

    setupHistoryDOM();

    await loadStudentOrderHistory();
    openModal('o1');

    await submitReview();

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Please choose a rating'
    );
  });

  test('submitReview inserts a new review successfully', async () => {
    const { initStudentHistoryPage, submitReview } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            vendor_id: 'v1',
            status: 'Completed',
            menu_id: 'm-direct',
            items: [
              {
                id: 'm1',
                name: 'Burger'
              }
            ]
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      },

      insertResult: {
        error: null
      }
    });

    setupHistoryDOM();

    initStudentHistoryPage();

    await flushPromises();

    document.querySelector('.reviewBtn').click();
    document.querySelector('.star[data-value="5"]').click();
    document.getElementById('reviewText').value = 'Excellent';

    await submitReview();

    expect(mockReviewsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        order_id: 'o1',
        student_id: 's1',
        vendor_id: 'v1',
        menu_id: 'm-direct',
        rating: 5,
        review_text: 'Excellent',
        created_at: expect.any(String)
      })
    ]);

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Review submitted'
    );
  });

  test('submitReview inserts menu id from single order item', async () => {
    const { initStudentHistoryPage, submitReview } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            vendor_id: 'v1',
            status: 'Completed',
            items: [
              {
                menu_id: 'm-from-item',
                name: 'Burger'
              }
            ]
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupHistoryDOM();

    initStudentHistoryPage();

    await flushPromises();

    document.querySelector('.reviewBtn').click();
    document.querySelector('.star[data-value="4"]').click();

    await submitReview();

    expect(mockReviewsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        menu_id: 'm-from-item'
      })
    ]);
  });

  test('submitReview inserts null menu id when order has multiple items and no menu_id', async () => {
    const { initStudentHistoryPage, submitReview } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            vendor_id: 'v1',
            status: 'Completed',
            items: [
              {
                id: 'm1',
                name: 'Burger'
              },
              {
                id: 'm2',
                name: 'Chips'
              }
            ]
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      }
    });

    setupHistoryDOM();

    initStudentHistoryPage();

    await flushPromises();

    document.querySelector('.reviewBtn').click();
    document.querySelector('.star[data-value="4"]').click();

    await submitReview();

    expect(mockReviewsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        menu_id: null
      })
    ]);
  });

  test('submitReview handles insert error', async () => {
    const insertError = {
      message: 'Insert failed'
    };

    const { initStudentHistoryPage, submitReview } = await loadHistoryModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            vendor_id: 'v1',
            status: 'Completed',
            items: [
              {
                id: 'm1',
                name: 'Burger'
              }
            ]
          }
        ],
        error: null
      },

      reviewsResult: {
        data: [],
        error: null
      },

      insertResult: {
        error: insertError
      }
    });

    setupHistoryDOM();

    initStudentHistoryPage();

    await flushPromises();

    document.querySelector('.reviewBtn').click();
    document.querySelector('.star[data-value="5"]').click();

    await submitReview();

    expect(console.error).toHaveBeenCalledWith(
      'submitReview insert error:',
      insertError
    );

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Failed to submit review'
    );
  });

  test('submitReview updates an existing review successfully', async () => {
    const { loadStudentOrderHistory, openModal, submitReview } =
      await loadHistoryModule({
        ordersResult: {
          data: [
            {
              id: 'o1',
              order_number: '100',
              vendor_id: 'v1',
              status: 'Completed',
              items: [
                {
                  id: 'm1',
                  name: 'Burger'
                }
              ]
            }
          ],
          error: null
        },

        reviewsResult: {
          data: [
            {
              id: 'r1',
              order_id: 'o1',
              rating: 3,
              review_text: 'Good'
            }
          ],
          error: null
        },

        updateResult: {
          error: null
        }
      });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    openModal('o1');

    document.getElementById('reviewText').value = 'Updated text';

    await submitReview();

    expect(mockReviewsUpdate).toHaveBeenCalledWith({
      rating: 3,
      review_text: 'Updated text'
    });

    expect(mockReviewsUpdateEq).toHaveBeenCalledWith('id', 'r1');

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Review updated'
    );
  });

  test('submitReview handles update error', async () => {
    const updateError = {
      message: 'Update failed'
    };

    const { loadStudentOrderHistory, openModal, submitReview } =
      await loadHistoryModule({
        ordersResult: {
          data: [
            {
              id: 'o1',
              vendor_id: 'v1',
              status: 'Completed'
            }
          ],
          error: null
        },

        reviewsResult: {
          data: [
            {
              id: 'r1',
              order_id: 'o1',
              rating: 3,
              review_text: 'Good'
            }
          ],
          error: null
        },

        updateResult: {
          error: updateError
        }
      });

    setupHistoryDOM();

    await loadStudentOrderHistory();
    openModal('o1');

    await submitReview();

    expect(console.error).toHaveBeenCalledWith(
      'submitReview update error:',
      updateError
    );

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Failed to update review'
    );
  });

  test('deleteReview shows error when no review is selected', async () => {
    const { deleteReview } = await loadHistoryModule();

    setupHistoryDOM();

    await deleteReview();

    expect(document.getElementById('toastContainer').textContent).toContain(
      'No review found'
    );
  });

  test('deleteReview deletes selected review successfully', async () => {
    const { loadStudentOrderHistory, openModal, deleteReview } =
      await loadHistoryModule({
        ordersResult: {
          data: [
            {
              id: 'o1',
              vendor_id: 'v1',
              status: 'Completed'
            }
          ],
          error: null
        },

        reviewsResult: {
          data: [
            {
              id: 'r1',
              order_id: 'o1',
              rating: 4,
              review_text: 'Good'
            }
          ],
          error: null
        },

        deleteResult: {
          error: null
        }
      });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    openModal('o1');

    await deleteReview();

    expect(mockReviewsDelete).toHaveBeenCalledTimes(1);
    expect(mockReviewsDeleteEq).toHaveBeenCalledWith('id', 'r1');

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Review deleted'
    );
  });

  test('deleteReview handles delete error', async () => {
    const deleteError = {
      message: 'Delete failed'
    };

    const { loadStudentOrderHistory, openModal, deleteReview } =
      await loadHistoryModule({
        ordersResult: {
          data: [
            {
              id: 'o1',
              vendor_id: 'v1',
              status: 'Completed'
            }
          ],
          error: null
        },

        reviewsResult: {
          data: [
            {
              id: 'r1',
              order_id: 'o1',
              rating: 4,
              review_text: 'Good'
            }
          ],
          error: null
        },

        deleteResult: {
          error: deleteError
        }
      });

    setupHistoryDOM();

    await loadStudentOrderHistory();

    openModal('o1');

    await deleteReview();

    expect(console.error).toHaveBeenCalledWith(
      'deleteReview error:',
      deleteError
    );

    expect(document.getElementById('toastContainer').textContent).toContain(
      'Failed to delete review'
    );
  });
});
