import { jest } from '@jest/globals';

const mockToast = jest.fn();

const mockAuthGetUser = jest.fn();
const mockOrder = jest.fn();

const mockOrdersSelectEq = jest.fn(() => ({
  order: mockOrder
}));

const mockOrdersUpdateIn = jest.fn(() => ({
  select: jest.fn()
}));

const mockOrdersUpdateEqSecond = jest.fn(() => ({
  in: mockOrdersUpdateIn
}));

const mockOrdersUpdateEqFirst = jest.fn(() => ({
  eq: mockOrdersUpdateEqSecond
}));

const mockOrdersUpdate = jest.fn(() => ({
  eq: mockOrdersUpdateEqFirst
}));

const mockOrdersSelect = jest.fn(() => ({
  eq: mockOrdersSelectEq
}));

const mockFrom = jest.fn((table) => {
  if (table === 'orders') {
    return {
      select: mockOrdersSelect,
      update: mockOrdersUpdate
    };
  }

  return {};
});

const mockSubscribe = jest.fn();
const mockOn = jest.fn(() => ({
  subscribe: mockSubscribe
}));
const mockChannel = jest.fn(() => ({
  on: mockOn
}));
const mockRemoveChannel = jest.fn();

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

const {
  renderStudentName,
  cancelStudentOrder,
  initStudentDashboardLiveOrders
} = await import('./dashboard.js');

describe('student/dashboard.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();

    mockToast.mockReset();
    mockAuthGetUser.mockReset();
    mockOrder.mockReset();

    mockOrdersSelectEq.mockClear();
    mockOrdersUpdateIn.mockClear();
    mockOrdersUpdateEqSecond.mockClear();
    mockOrdersUpdateEqFirst.mockClear();
    mockOrdersUpdate.mockClear();
    mockOrdersSelect.mockClear();
    mockFrom.mockClear();

    mockSubscribe.mockReset();
    mockOn.mockClear();
    mockChannel.mockClear();
    mockRemoveChannel.mockReset();

    global.console.error = jest.fn();
    global.console.log = jest.fn();
    global.setInterval = jest.fn(() => 123);
    global.clearInterval = jest.fn();

    delete window.cancelStudentOrder;
  });

  test('renderStudentName fills both name fields', () => {
    sessionStorage.setItem('username', 'Bethuel');
    document.body.innerHTML = `
      <div id="studentName"></div>
      <div id="studentNameWelcome"></div>
    `;

    renderStudentName();

    expect(document.getElementById('studentName').textContent).toBe('Bethuel');
    expect(document.getElementById('studentNameWelcome').textContent).toBe('Bethuel');
  });

  test('renderStudentName falls back to Student', () => {
    document.body.innerHTML = `
      <div id="studentName"></div>
      <div id="studentNameWelcome"></div>
    `;

    renderStudentName();

    expect(document.getElementById('studentName').textContent).toBe('Student');
    expect(document.getElementById('studentNameWelcome').textContent).toBe('Student');
  });

  test('cancelStudentOrder shows error if order not found', async () => {
    await cancelStudentOrder('missing');

    expect(mockToast).toHaveBeenCalledWith('Order not found', 'error');
  });

  test('initStudentDashboardLiveOrders stops when user cannot be found', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    await initStudentDashboardLiveOrders();

    expect(mockChannel).not.toHaveBeenCalled();
    expect(window.cancelStudentOrder).toBeUndefined();
  });

  test('initStudentDashboardLiveOrders renders empty state when there are no active orders', async () => {
    document.body.innerHTML = `<div id="liveOrdersContainer"></div>`;

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 's1' } },
      error: null
    });

    mockOrder.mockResolvedValue({
      data: [],
      error: null
    });

    await initStudentDashboardLiveOrders();

    expect(document.getElementById('liveOrdersContainer').innerHTML).toContain(
      'You have no active orders right now.'
    );
    expect(mockChannel).toHaveBeenCalledWith('student-dashboard-orders-s1');
    expect(window.cancelStudentOrder).toBe(cancelStudentOrder);
  });

  test('initStudentDashboardLiveOrders renders active orders only', async () => {
    document.body.innerHTML = `<div id="liveOrdersContainer"></div>`;

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 's1' } },
      error: null
    });

    mockOrder.mockResolvedValue({
      data: [
        {
          id: '1',
          order_number: '100',
          vendors: { username: 'shop1' },
          items: [{ name: 'Burger' }],
          total_price: 50,
          status: 'Order Placed',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          order_number: '200',
          vendors: { username: 'shop2' },
          items: [{ name: 'Pizza' }],
          total_price: 70,
          status: 'Completed',
          created_at: new Date().toISOString()
        }
      ],
      error: null
    });

    await initStudentDashboardLiveOrders();

    const html = document.getElementById('liveOrdersContainer').innerHTML;
    expect(html).toContain('Order #100');
    expect(html).toContain('shop1');
    expect(html).toContain('Burger');
    expect(html).toContain('R50');
    expect(html).toContain('Cancel Order');
    expect(html).not.toContain('Order #200');
  });
});