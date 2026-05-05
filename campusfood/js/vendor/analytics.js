import { sb } from "../config/supabase.js";
import { getVendorId } from 'page/shared/auth-helpers.js';

let latestAnalyticsRows = [];

function isCompletedOrder(status) {
  if (!status) return false;

  const normalizedStatus = String(status).toLowerCase();

  return normalizedStatus === 'completed' || normalizedStatus === 'delivered';
}

function formatMoney(amount) {
  return `R${Number(amount || 0).toFixed(2)}`;
}

function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function showAnalyticsStatus(message, type = 'info') {
  const status = document.getElementById('analyticsStatus');
  if (!status) return;

  status.textContent = message;
  status.className = `analytics-status ${type}`;
}

function groupSalesByDate(orders) {
  const salesByDate = {};

  orders.forEach((order) => {
    const date = new Date(order.created_at).toLocaleDateString('en-ZA');

    if (!salesByDate[date]) {
      salesByDate[date] = 0;
    }

    salesByDate[date] += Number(order.total_price || 0);
  });

  return salesByDate;
}

function groupOrdersByHour(orders) {
  const ordersByHour = {};

  for (let hour = 0; hour < 24; hour++) {
    ordersByHour[formatHour(hour)] = 0;
  }

  orders.forEach((order) => {
    const hour = new Date(order.created_at).getHours();
    const hourLabel = formatHour(hour);

    ordersByHour[hourLabel] += 1;
  });

  return ordersByHour;
}

function getPeakHour(ordersByHour) {
  let peakHour = null;
  let highestOrders = 0;

  Object.entries(ordersByHour).forEach(([hour, count]) => {
    if (count > highestOrders) {
      highestOrders = count;
      peakHour = hour;
    }
  });

  return highestOrders === 0 ? null : peakHour;
}

function renderSimpleBarChart(containerId, data, valueFormatter = (value) => value) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const entries = Object.entries(data);

  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-message">No data available yet.</p>';
    return;
  }

  const maxValue = Math.max(...entries.map(([, value]) => Number(value)));

  if (maxValue === 0) {
    container.innerHTML = '<p class="empty-message">No activity found yet.</p>';
    return;
  }

  container.innerHTML = entries
    .map(([label, value]) => {
      const width = Math.max((Number(value) / maxValue) * 100, 4);

      return `
        <div class="bar-row">
          <div class="bar-label">${label}</div>

          <div class="bar-track">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>

          <div class="bar-value">${valueFormatter(value)}</div>
        </div>
      `;
    })
    .join('');
}

function updateSummaryCards(completedOrders, allOrders) {
  const totalSales = completedOrders.reduce((sum, order) => {
    return sum + Number(order.total_price || 0);
  }, 0);

  const averageOrder =
    completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

  const ordersByHour = groupOrdersByHour(allOrders);
  const peakHour = getPeakHour(ordersByHour);

  const totalSalesEl = document.getElementById('totalSales');
  const completedOrdersEl = document.getElementById('completedOrders');
  const averageOrderEl = document.getElementById('averageOrder');
  const peakHourEl = document.getElementById('peakHour');

  if (totalSalesEl) totalSalesEl.textContent = formatMoney(totalSales);
  if (completedOrdersEl) completedOrdersEl.textContent = completedOrders.length;
  if (averageOrderEl) averageOrderEl.textContent = formatMoney(averageOrder);
  if (peakHourEl) peakHourEl.textContent = peakHour || '--:00';
}

export async function loadVendorAnalytics() {
  showAnalyticsStatus('Loading analytics...', 'info');

  const username = sessionStorage.getItem('username');
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    showAnalyticsStatus('Vendor not found. Please log in again.', 'error');
    return;
  }

  const { data, error } = await sb
    .from('orders')
    .select('id, order_number, total_price, status, created_at, vendor_id')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Analytics error:', error);
    showAnalyticsStatus('Could not load analytics. Please try again.', 'error');
    return;
  }

  const allOrders = data || [];
  const completedOrders = allOrders.filter((order) =>
    isCompletedOrder(order.status)
  );

  latestAnalyticsRows = completedOrders;

  updateSummaryCards(completedOrders, allOrders);

  const salesByDate = groupSalesByDate(completedOrders);
  const ordersByHour = groupOrdersByHour(allOrders);

  renderSimpleBarChart(
    'salesOverTimeChart',
    salesByDate,
    (value) => formatMoney(value)
  );

  renderSimpleBarChart(
    'peakHoursChart',
    ordersByHour,
    (value) => `${value} orders`
  );

  if (allOrders.length === 0) {
    showAnalyticsStatus('No orders found yet.', 'info');
    return;
  }

  showAnalyticsStatus('Analytics loaded successfully.', 'success');
}

export function exportVendorAnalyticsCSV() {
  if (!latestAnalyticsRows || latestAnalyticsRows.length === 0) {
    showAnalyticsStatus('No completed sales available to export.', 'error');
    return;
  }

  const headers = [
    'Order Number',
    'Status',
    'Total Price',
    'Created At'
  ];

  const rows = latestAnalyticsRows.map((order) => [
    order.order_number || order.id,
    order.status,
    Number(order.total_price || 0).toFixed(2),
    new Date(order.created_at).toLocaleString('en-ZA')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'vendor-analytics-report.csv';
  link.click();

  URL.revokeObjectURL(url);

  showAnalyticsStatus('CSV report exported successfully.', 'success');
}