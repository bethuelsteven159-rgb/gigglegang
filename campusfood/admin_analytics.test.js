/**
 * @jest-environment jsdom
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest, describe, test, expect, afterEach } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function setupDOM() {
  document.body.innerHTML = `
    <span id="adminName"></span>

    <input type="date" id="filterFrom">
    <input type="date" id="filterTo">

    <select id="filterVendor">
      <option value="">All vendors</option>
    </select>

    <select id="filterGroup">
      <option value="day">Day</option>
      <option value="week">Week</option>
      <option value="month" selected>Month</option>
    </select>

    <div id="statRevenue">—</div>
    <div id="statOrders">—</div>
    <div id="statVendors">—</div>

    <canvas id="chartSales"></canvas>
    <canvas id="chartPeak"></canvas>
    <canvas id="chartShare"></canvas>

    <div id="tableContainer"></div>
    <div id="toast"></div>
  `;

  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
  }));
}

function makeSupabaseMock({
  orders = [
    {
      id: 1,
      vendor_id: 'v1',
      total_price: 120,
      created_at: '2026-05-01T10:30:00',
      vendors: { username: 'Kota Palace' },
    },
    {
      id: 2,
      vendor_id: 'v1',
      total_price: 180,
      created_at: '2026-05-02T11:00:00',
      vendors: { username: 'Kota Palace' },
    },
    {
      id: 3,
      vendor_id: 'v2',
      total_price: 150.5,
      created_at: '2026-05-03T12:15:00',
      vendors: { username: 'Burger Spot' },
    },
  ],

  vendors = [
    { id: 'v1', username: 'Kota Palace' },
    { id: 'v2', username: 'Burger Spot' },
  ],

  session = {
    user: {
      email: 'admin@test.com',
    },
  },

  admin = {
    email: 'admin@test.com',
  },

  ordersError = null,
} = {}) {
  const adminQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: admin,
      error: null,
    }),
  };

  const vendorsQuery = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: vendors,
      error: null,
    }),
  };

  const ordersQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),

    then: jest.fn((resolve, reject) => {
      return Promise.resolve({
        data: orders,
        error: ordersError,
      }).then(resolve, reject);
    }),
  };

  const supabase = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session },
      }),
      signOut: jest.fn().mockResolvedValue({}),
    },

    from: jest.fn((tableName) => {
      if (tableName === 'admins') return adminQuery;
      if (tableName === 'vendors') return vendorsQuery;
      if (tableName === 'orders') return ordersQuery;

      throw new Error(`Unexpected table: ${tableName}`);
    }),
  };

  return {
    supabase,
    adminQuery,
    vendorsQuery,
    ordersQuery,
  };
}

function loadAdminAnalytics(options = {}) {
  setupDOM();

  const mocks = makeSupabaseMock(options);

  global.createClient = jest.fn(() => mocks.supabase);

  global.Chart = jest.fn(function ChartMock(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.destroy = jest.fn();
    return this;
  });

  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();

  jest.spyOn(global, 'setTimeout').mockImplementation(() => 1);

  const sourcePath = path.join(__dirname, 'admin_analytics.js');

  let sourceCode = fs.readFileSync(sourcePath, 'utf8');

  sourceCode = sourceCode.replace(
    /import\s+\{\s*createClient\s*\}\s+from\s+['"][^'"]+['"];\s*/,
    ''
  );

  const runScript = new Function(
    'createClient',
    'Chart',
    'window',
    'document',
    'console',
    'Blob',
    'URL',
    'setTimeout',
    sourceCode
  );

  runScript(
    global.createClient,
    global.Chart,
    window,
    document,
    console,
    Blob,
    URL,
    setTimeout
  );

  return mocks;
}

async function flushPromises() {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe('admin_analytics.js', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    delete window.loadAnalytics;
    delete window.exportCSV;
    delete window.exportPDF;
    delete window.logout;
  });

  test('loads admin analytics data and renders stats, table, and charts', async () => {
    loadAdminAnalytics();

    await flushPromises();

    expect(document.getElementById('adminName').textContent).toBe('admin@test.com');

    expect(document.getElementById('filterVendor').children.length).toBe(3);
    expect(document.getElementById('filterVendor').textContent).toContain('Kota Palace');
    expect(document.getElementById('filterVendor').textContent).toContain('Burger Spot');

    expect(document.getElementById('statRevenue').textContent).toMatch(/R450[,.]50/);
    expect(document.getElementById('statOrders').textContent).toBe('3');
    expect(document.getElementById('statVendors').textContent).toBe('2');

    expect(document.getElementById('tableContainer').textContent).toContain('Kota Palace');
    expect(document.getElementById('tableContainer').textContent).toContain('Burger Spot');
    expect(document.getElementById('tableContainer').textContent).toContain('Total');

    expect(global.Chart).toHaveBeenCalledTimes(3);

    const chartTypes = global.Chart.mock.calls.map((call) => call[1].type);
    expect(chartTypes).toEqual(['line', 'bar', 'doughnut']);
  });

  test('applies vendor filter when filterVendor has a selected value', async () => {
    const { ordersQuery } = loadAdminAnalytics();

    await flushPromises();

    ordersQuery.eq.mockClear();

    document.getElementById('filterVendor').value = 'v1';

    await window.loadAnalytics();

    expect(ordersQuery.eq).toHaveBeenCalledWith('status', 'Completed');
    expect(ordersQuery.eq).toHaveBeenCalledWith('vendor_id', 'v1');
  });

  test('shows empty state when there are no completed orders', async () => {
    loadAdminAnalytics({
      orders: [],
    });

    await flushPromises();

    expect(document.getElementById('statRevenue').textContent).toMatch(/R0[,.]00/);
    expect(document.getElementById('statOrders').textContent).toBe('0');
    expect(document.getElementById('statVendors').textContent).toBe('0');

    expect(document.getElementById('tableContainer').textContent).toContain(
      'No data for this period'
    );

    expect(document.getElementById('toast').textContent).toContain(
      'No completed orders in this period'
    );
  });

  test('exports vendor breakdown CSV', async () => {
    loadAdminAnalytics();

    await flushPromises();

    const realCreateElement = document.createElement.bind(document);
    const anchor = realCreateElement('a');
    anchor.click = jest.fn();

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName.toLowerCase() === 'a') {
        return anchor;
      }

      return realCreateElement(tagName);
    });

    window.exportCSV('table');

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toMatch(/^vendor_breakdown_/);
    expect(anchor.download).toMatch(/\.csv$/);
    expect(anchor.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    expect(document.getElementById('toast').textContent).toBe('CSV downloaded');
  });

  test('exportPDF opens the print dialog', async () => {
    loadAdminAnalytics();

    await flushPromises();

    window.print = jest.fn();

    window.exportPDF();

    expect(window.print).toHaveBeenCalled();

    expect(document.getElementById('toast').textContent).toContain(
      'Opening print dialog'
    );
  });
});
