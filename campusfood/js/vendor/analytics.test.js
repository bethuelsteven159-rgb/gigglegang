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

let mockGetVendorId;
let mockFrom;

let mockSelect;
let mockEq;
let mockOrder;
let mockGte;
let mockLte;

let chartInstances;

function setupAnalyticsDOM({
  from = '',
  to = '',
  group = 'month'
} = {}) {
  document.body.innerHTML = `
    <div id="analyticsStatus"></div>

    <input id="filterFrom" value="${from}">
    <input id="filterTo" value="${to}">

    <select id="filterGroup">
      <option value="day" ${group === 'day' ? 'selected' : ''}>Day</option>
      <option value="week" ${group === 'week' ? 'selected' : ''}>Week</option>
      <option value="month" ${group === 'month' ? 'selected' : ''}>Month</option>
    </select>

    <div id="totalSales"></div>
    <div id="completedOrders"></div>
    <div id="averageOrder"></div>
    <div id="peakHour"></div>

    <canvas id="chartSales"></canvas>
    <canvas id="chartPeak"></canvas>
    <canvas id="chartStatus"></canvas>

    <div id="vendorOrdersTableContainer"></div>
  `;
}

async function loadAnalyticsModule({
  vendorId = 'v1',

  ordersResult = {
    data: [],
    error: null
  }
} = {}) {
  jest.resetModules();

  chartInstances = [];

  mockGetVendorId = jest.fn().mockResolvedValue(vendorId);

  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    gte: jest.fn(() => query),
    lte: jest.fn(() => query),

    then: jest.fn((resolve, reject) => {
      return Promise.resolve(ordersResult).then(resolve, reject);
    })
  };

  mockSelect = query.select;
  mockEq = query.eq;
  mockOrder = query.order;
  mockGte = query.gte;
  mockLte = query.lte;

  mockFrom = jest.fn(() => query);

  jest.unstable_mockModule('../config/supabase.js', () => ({
    sb: {
      from: mockFrom
    }
  }));

  jest.unstable_mockModule('../shared/auth-helpers.js', () => ({
    getVendorId: mockGetVendorId
  }));

  global.Chart = jest.fn(function ChartMock(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.destroy = jest.fn();

    chartInstances.push(this);

    return this;
  });

  return await import('./analytics.js');
}

describe('vendor/analytics.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';

    sessionStorage.clear();
    sessionStorage.setItem('username', 'shop1');

    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();

    delete global.Chart;
  });

  test('loadVendorAnalytics shows error when vendor is not found', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      vendorId: null
    });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    expect(mockGetVendorId).toHaveBeenCalledWith('shop1');
    expect(mockFrom).not.toHaveBeenCalled();

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'Vendor not found. Please log in again.'
    );

    expect(document.getElementById('analyticsStatus').className).toBe(
      'analytics-status error'
    );
  });

  test('loadVendorAnalytics queries vendor orders without date filters', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    expect(mockFrom).toHaveBeenCalledWith('orders');

    expect(mockSelect).toHaveBeenCalledWith(
      'id, order_number, total_price, status, created_at, vendor_id'
    );

    expect(mockEq).toHaveBeenCalledWith('vendor_id', 'v1');

    expect(mockOrder).toHaveBeenCalledWith('created_at', {
      ascending: true
    });

    expect(mockGte).not.toHaveBeenCalled();
    expect(mockLte).not.toHaveBeenCalled();
  });

  test('loadVendorAnalytics applies from and to date filters', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    setupAnalyticsDOM({
      from: '2026-05-01',
      to: '2026-05-16',
      group: 'day'
    });

    await loadVendorAnalytics();

    expect(mockGte).toHaveBeenCalledWith(
      'created_at',
      '2026-05-01T00:00:00'
    );

    expect(mockLte).toHaveBeenCalledWith(
      'created_at',
      '2026-05-16T23:59:59'
    );
  });

  test('loadVendorAnalytics renders summary cards, charts, and order table', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-16T10:30:00Z',
            vendor_id: 'v1'
          },
          {
            id: 'o2',
            order_number: '101',
            total_price: 70,
            status: 'Delivered',
            created_at: '2026-05-16T10:45:00Z',
            vendor_id: 'v1'
          },
          {
            id: 'o3',
            order_number: '102',
            total_price: 30,
            status: 'Being Prepared',
            created_at: '2026-05-16T12:00:00Z',
            vendor_id: 'v1'
          }
        ],
        error: null
      }
    });

    setupAnalyticsDOM({
      group: 'day'
    });

    await loadVendorAnalytics();

    expect(document.getElementById('totalSales').textContent).toBe('R120.00');
    expect(document.getElementById('completedOrders').textContent).toBe('2');
    expect(document.getElementById('averageOrder').textContent).toBe('R60.00');
    expect(document.getElementById('peakHour').textContent).toBe('10:00');

    expect(global.Chart).toHaveBeenCalledTimes(3);

    const chartTypes = global.Chart.mock.calls.map((call) => call[1].type);

    expect(chartTypes).toEqual(['bar', 'bar', 'doughnut']);

    const html = document.getElementById('vendorOrdersTableContainer').innerHTML;

    expect(html).toContain('100');
    expect(html).toContain('101');
    expect(html).toContain('102');
    expect(html).toContain('Completed');
    expect(html).toContain('Delivered');
    expect(html).toContain('Being Prepared');
    expect(html).toContain('R50.00');
    expect(html).toContain('R70.00');
    expect(html).toContain('R30.00');

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'Analytics loaded successfully.'
    );

    expect(document.getElementById('analyticsStatus').className).toBe(
      'analytics-status success'
    );
  });

  test('loadVendorAnalytics treats completed and delivered statuses case-insensitively', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            total_price: 100,
            status: ' completed ',
            created_at: '2026-05-16T09:00:00Z',
            vendor_id: 'v1'
          },
          {
            id: 'o2',
            order_number: '101',
            total_price: 50,
            status: 'DELIVERED',
            created_at: '2026-05-16T10:00:00Z',
            vendor_id: 'v1'
          },
          {
            id: 'o3',
            order_number: '102',
            total_price: 200,
            status: 'Cancelled',
            created_at: '2026-05-16T11:00:00Z',
            vendor_id: 'v1'
          }
        ],
        error: null
      }
    });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    expect(document.getElementById('totalSales').textContent).toBe('R150.00');
    expect(document.getElementById('completedOrders').textContent).toBe('2');
    expect(document.getElementById('averageOrder').textContent).toBe('R75.00');
  });

  test('loadVendorAnalytics renders empty state when there are no orders', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [],
        error: null
      }
    });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    expect(document.getElementById('totalSales').textContent).toBe('R0.00');
    expect(document.getElementById('completedOrders').textContent).toBe('0');
    expect(document.getElementById('averageOrder').textContent).toBe('R0.00');
    expect(document.getElementById('peakHour').textContent).toBe('--:00');

    expect(document.getElementById('vendorOrdersTableContainer').innerHTML).toContain(
      'No orders found for this selected period.'
    );

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'No orders found for this selected period.'
    );

    expect(document.getElementById('analyticsStatus').className).toBe(
      'analytics-status info'
    );
  });

  test('loadVendorAnalytics handles Supabase query error', async () => {
    const error = {
      message: 'orders failed'
    };

    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: null,
        error
      }
    });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    expect(console.error).toHaveBeenCalledWith('Analytics error:', error);

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'Could not load analytics. Please try again.'
    );

    expect(document.getElementById('analyticsStatus').className).toBe(
      'analytics-status error'
    );
  });

  test('loadVendorAnalytics escapes order table values', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '<script>alert("x")</script>',
            total_price: 40,
            status: '<b>Completed</b>',
            created_at: '2026-05-16T10:00:00Z',
            vendor_id: 'v1'
          }
        ],
        error: null
      }
    });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    const html = document.getElementById('vendorOrdersTableContainer').innerHTML;

    expect(html).toContain(
      '&lt;script&gt;alert("x")&lt;/script&gt;'
    );

    expect(html).toContain('&lt;b&gt;Completed&lt;/b&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Completed</b>');
  });

  test('loadVendorAnalytics still works when optional DOM elements are missing', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-16T10:00:00Z',
            vendor_id: 'v1'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="analyticsStatus"></div>
    `;

    await loadVendorAnalytics();

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'Analytics loaded successfully.'
    );
  });

  test('loadVendorAnalytics still completes when Chart is undefined', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-16T10:00:00Z',
            vendor_id: 'v1'
          }
        ],
        error: null
      }
    });

    delete global.Chart;

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'Analytics loaded successfully.'
    );
  });

  test('loadVendorAnalytics destroys old charts before rendering new ones', async () => {
    const { loadVendorAnalytics } = await loadAnalyticsModule({
      ordersResult: {
        data: [
          {
            id: 'o1',
            order_number: '100',
            total_price: 50,
            status: 'Completed',
            created_at: '2026-05-16T10:00:00Z',
            vendor_id: 'v1'
          }
        ],
        error: null
      }
    });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    const firstChartInstances = [...chartInstances];

    await loadVendorAnalytics();

    expect(firstChartInstances[0].destroy).toHaveBeenCalledTimes(1);
    expect(firstChartInstances[1].destroy).toHaveBeenCalledTimes(1);
    expect(firstChartInstances[2].destroy).toHaveBeenCalledTimes(1);

    expect(global.Chart).toHaveBeenCalledTimes(6);
  });

  test('exportVendorAnalyticsCSV shows error when there are no completed rows', async () => {
    const { exportVendorAnalyticsCSV } = await loadAnalyticsModule();

    setupAnalyticsDOM();

    exportVendorAnalyticsCSV();

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'No completed sales available to export.'
    );

    expect(document.getElementById('analyticsStatus').className).toBe(
      'analytics-status error'
    );

    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  test('exportVendorAnalyticsCSV downloads completed orders after analytics load', async () => {
    const { loadVendorAnalytics, exportVendorAnalyticsCSV } =
      await loadAnalyticsModule({
        ordersResult: {
          data: [
            {
              id: 'o1',
              order_number: '100',
              total_price: 50,
              status: 'Completed',
              created_at: '2026-05-16T10:00:00Z',
              vendor_id: 'v1'
            },
            {
              id: 'o2',
              order_number: '101',
              total_price: 80,
              status: 'Being Prepared',
              created_at: '2026-05-16T11:00:00Z',
              vendor_id: 'v1'
            }
          ],
          error: null
        }
      });

    setupAnalyticsDOM();

    await loadVendorAnalytics();

    const realCreateElement = document.createElement.bind(document);
    const anchor = realCreateElement('a');
    anchor.click = jest.fn();

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (String(tagName).toLowerCase() === 'a') {
        return anchor;
      }

      return realCreateElement(tagName);
    });

    exportVendorAnalyticsCSV();

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('vendor-analytics-report.csv');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    expect(document.getElementById('analyticsStatus').textContent).toBe(
      'CSV report exported successfully.'
    );

    expect(document.getElementById('analyticsStatus').className).toBe(
      'analytics-status success'
    );
  });
});
