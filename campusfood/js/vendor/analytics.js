import { sb } from "../config/supabase.js";
import { getVendorId } from "../shared/auth-helpers.js";

let latestCompletedRows = [];
let latestAllRows = [];

let salesChart = null;
let peakChart = null;
let statusChart = null;

function isCompletedOrder(status) {
  if (!status) return false;

  const normalizedStatus = String(status).toLowerCase().trim();

  return normalizedStatus === "completed" || normalizedStatus === "delivered";
}

function formatMoney(amount) {
  return `R${Number(amount || 0).toFixed(2)}`;
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function showAnalyticsStatus(message, type = "info") {
  const status = document.getElementById("analyticsStatus");
  if (!status) return;

  status.textContent = message;
  status.className = `analytics-status ${type}`;
}

function getFilters() {
  const from = document.getElementById("filterFrom")?.value || "";
  const to = document.getElementById("filterTo")?.value || "";
  const group = document.getElementById("filterGroup")?.value || "month";

  return { from, to, group };
}

function getPeriodLabel(dateValue, group) {
  const date = new Date(dateValue);

  if (group === "day") {
    return date.toLocaleDateString("en-ZA");
  }

  if (group === "week") {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    weekStart.setDate(weekStart.getDate() + diff);

    return `Week of ${weekStart.toLocaleDateString("en-ZA")}`;
  }

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short"
  });
}

function groupSalesByPeriod(orders, group) {
  const salesByPeriod = {};

  orders.forEach((order) => {
    const label = getPeriodLabel(order.created_at, group);

    if (!salesByPeriod[label]) {
      salesByPeriod[label] = 0;
    }

    salesByPeriod[label] += Number(order.total_price || 0);
  });

  return salesByPeriod;
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

function groupOrdersByStatus(orders) {
  const statusMap = {};

  orders.forEach((order) => {
    const status = order.status || "Unknown";

    if (!statusMap[status]) {
      statusMap[status] = 0;
    }

    statusMap[status] += 1;
  });

  return statusMap;
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

function updateSummaryCards(completedOrders, allOrders) {
  const totalSales = completedOrders.reduce((sum, order) => {
    return sum + Number(order.total_price || 0);
  }, 0);

  const averageOrder =
    completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

  const ordersByHour = groupOrdersByHour(allOrders);
  const peakHour = getPeakHour(ordersByHour);

  const totalSalesEl = document.getElementById("totalSales");
  const completedOrdersEl = document.getElementById("completedOrders");
  const averageOrderEl = document.getElementById("averageOrder");
  const peakHourEl = document.getElementById("peakHour");

  if (totalSalesEl) totalSalesEl.textContent = formatMoney(totalSales);
  if (completedOrdersEl) completedOrdersEl.textContent = completedOrders.length;
  if (averageOrderEl) averageOrderEl.textContent = formatMoney(averageOrder);
  if (peakHourEl) peakHourEl.textContent = peakHour || "--:00";
}

function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

function renderChart(chart, canvasId, type, labels, values, label) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) return null;

  if (typeof Chart === "undefined") {
    showAnalyticsStatus("Chart.js is missing. Add the Chart.js script to the HTML.", "error");
    return null;
  }

  destroyChart(chart);

  return new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [
        {
          label,
          data: values
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales:
        type === "doughnut"
          ? {}
          : {
              y: {
                beginAtZero: true
              }
            },
      plugins: {
        legend: {
          display: type === "doughnut"
        }
      }
    }
  });
}

function renderCharts(completedOrders, allOrders, group) {
  const salesByPeriod = groupSalesByPeriod(completedOrders, group);
  const ordersByHour = groupOrdersByHour(allOrders);
  const statusBreakdown = groupOrdersByStatus(allOrders);

  salesChart = renderChart(
    salesChart,
    "chartSales",
    "bar",
    Object.keys(salesByPeriod),
    Object.values(salesByPeriod),
    "Revenue"
  );

  peakChart = renderChart(
    peakChart,
    "chartPeak",
    "bar",
    Object.keys(ordersByHour),
    Object.values(ordersByHour),
    "Orders"
  );

  statusChart = renderChart(
    statusChart,
    "chartStatus",
    "doughnut",
    Object.keys(statusBreakdown),
    Object.values(statusBreakdown),
    "Order status"
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderOrdersTable(orders) {
  const container = document.getElementById("vendorOrdersTableContainer");

  if (!container) return;

  if (!orders.length) {
    container.innerHTML = `
      <div class="loading-msg">
        No orders found for this selected period.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Order Number</th>
          <th>Status</th>
          <th>Total Price</th>
          <th>Created At</th>
        </tr>
      </thead>

      <tbody>
        ${orders
          .map((order) => {
            return `
              <tr>
                <td>${escapeHTML(order.order_number || order.id)}</td>
                <td>${escapeHTML(order.status || "Unknown")}</td>
                <td>${formatMoney(order.total_price)}</td>
                <td>${new Date(order.created_at).toLocaleString("en-ZA")}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

export async function loadVendorAnalytics() {
  showAnalyticsStatus("Loading analytics...", "info");

  const username = sessionStorage.getItem("username");
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    showAnalyticsStatus("Vendor not found. Please log in again.", "error");
    return;
  }

  const { from, to, group } = getFilters();

  let query = sb
    .from("orders")
    .select("id, order_number, total_price, status, created_at, vendor_id")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: true });

  if (from) {
    query = query.gte("created_at", `${from}T00:00:00`);
  }

  if (to) {
    query = query.lte("created_at", `${to}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Analytics error:", error);
    showAnalyticsStatus("Could not load analytics. Please try again.", "error");
    return;
  }

  const allOrders = data || [];

  const completedOrders = allOrders.filter((order) =>
    isCompletedOrder(order.status)
  );

  latestAllRows = allOrders;
  latestCompletedRows = completedOrders;

  updateSummaryCards(completedOrders, allOrders);
  renderCharts(completedOrders, allOrders, group);
  renderOrdersTable(allOrders);

  if (allOrders.length === 0) {
    showAnalyticsStatus("No orders found for this selected period.", "info");
    return;
  }

  showAnalyticsStatus("Analytics loaded successfully.", "success");
}

function downloadCSV(filename, headers, rows) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function exportVendorAnalyticsCSV() {
  if (!latestCompletedRows || latestCompletedRows.length === 0) {
    showAnalyticsStatus("No completed sales available to export.", "error");
    return;
  }

  const headers = [
    "Order Number",
    "Status",
    "Total Price",
    "Created At"
  ];

  const rows = latestCompletedRows.map((order) => [
    order.order_number || order.id,
    order.status,
    Number(order.total_price || 0).toFixed(2),
    new Date(order.created_at).toLocaleString("en-ZA")
  ]);

  downloadCSV("vendor-analytics-report.csv", headers, rows);

  showAnalyticsStatus("CSV report exported successfully.", "success");
}
