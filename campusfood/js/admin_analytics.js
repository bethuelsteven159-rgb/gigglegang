import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://mslvqduxmkuusuyaewej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbHZxZHV4bWt1dXN1eWFld2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODkzNDcsImV4cCI6MjA5MTU2NTM0N30.VxvR39nI5lNK_JZ6fwctQJgAH06YhbCTd8bXuiLpJgs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '../index.html'; return null; }

  const { data: admin, error } = await supabase
    .from('admins')
    .select('email')
    .eq('email', session.user.email)
    .single();

  if (error || !admin) {
    showToast('Access denied — admin only', 'error');
    window.location.href = '../index.html';
    return null;
  }

  document.getElementById('adminName').textContent = session.user.email;
  return session;
}

window.logout = async () => {
  await supabase.auth.signOut();
  window.location.href = '../index.html';
};

let chartSales = null;
let chartPeak  = null;
let chartShare = null;

let cachedSalesRows = [];
let cachedPeakRows  = [];
let cachedTableRows = [];

const PALETTE = [
  '#f97316','#3b82f6','#10b981','#8b5cf6',
  '#ef4444','#f59e0b','#06b6d4','#ec4899',
];

function initDateDefaults() {
  const to   = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  document.getElementById('filterTo').value   = to.toISOString().split('T')[0];
  document.getElementById('filterFrom').value = from.toISOString().split('T')[0];
}

async function loadVendorOptions() {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, username')
    .order('username');
  if (error) { console.error(error); return; }

  const sel = document.getElementById('filterVendor');
  data.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.username;
    sel.appendChild(opt);
  });
}

window.loadAnalytics = async () => {
  const from     = document.getElementById('filterFrom').value;
  const to       = document.getElementById('filterTo').value;
  const vendorId = document.getElementById('filterVendor').value;
  const groupBy  = document.getElementById('filterGroup').value;

  let query = supabase
    .from('orders')
    .select('id, vendor_id, total_price, created_at, vendors(name)')
    .eq('status', 'Completed')
    .gte('created_at', from + 'T00:00:00')
    .lte('created_at', to   + 'T23:59:59');

  if (vendorId) query = query.eq('vendor_id', vendorId);

  const { data: orders, error } = await query;
  if (error) {
    showToast('Failed to load orders', 'error');
    console.error(error);
    return;
  }

  if (!orders || orders.length === 0) {
    showToast('No completed orders in this period', 'info');
    clearCharts();
    renderTable([]);
    updateStats(0, 0, 0);
    return;
  }

  const salesData = buildSalesByVendorDate(orders, groupBy);
  cachedSalesRows = salesData.raw;
  drawSalesChart(salesData);

  const peakData = buildPeakHours(orders);
  cachedPeakRows = peakData.raw;
  drawPeakChart(peakData);

  const shareData = buildRevenueShare(orders);
  cachedTableRows = shareData.raw;
  drawShareChart(shareData);
  renderTable(shareData.raw);

  const totalRevenue  = orders.reduce((s, o) => s + (o.total_price ?? 0), 0);
  const activeVendors = new Set(orders.map(o => o.vendor_id)).size;
  updateStats(totalRevenue, orders.length, activeVendors);
};

function buildSalesByVendorDate(orders, groupBy) {
  const map = {};
  const raw = [];

  orders.forEach(o => {
    const vendor = o.vendors?.name ?? o.vendor_id;
    const key    = dateKey(o.created_at, groupBy);
    if (!map[vendor]) map[vendor] = {};
    map[vendor][key] = (map[vendor][key] ?? 0) + (o.total_price ?? 0);
    raw.push({ vendor, date: key, amount: o.total_price ?? 0 });
  });

  const allDates = [...new Set(orders.map(o => dateKey(o.created_at, groupBy)))].sort();
  const vendors  = Object.keys(map);

  const datasets = vendors.map((v, i) => ({
    label: v,
    data: allDates.map(d => map[v][d] ?? 0),
    borderColor:     PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length] + '22',
    fill: true,
    tension: 0.35,
  }));

  return { labels: allDates, datasets, raw };
}

function buildPeakHours(orders) {
  const hours = Array(24).fill(0);
  const raw   = [];

  orders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    hours[h] += 1;
    raw.push({ hour: h });
  });

  const labels   = hours.map((_, i) => `${String(i).padStart(2,'0')}:00`);
  const datasets = [{
    label: 'Orders',
    data: hours,
    backgroundColor: hours.map(v => v === Math.max(...hours) ? '#f97316' : '#f9731640'),
    borderColor: '#f97316',
    borderWidth: 1,
    borderRadius: 4,
  }];

  return { labels, datasets, raw };
}

function buildRevenueShare(orders) {
  const map = {};
  orders.forEach(o => {
    const v = o.vendors?.name ?? o.vendor_id;
    map[v]  = (map[v] ?? 0) + (o.total_price ?? 0);
  });

  const raw    = Object.entries(map).map(([vendor, total]) => ({
    vendor,
    total,
    orders: orders.filter(o => (o.vendors?.name ?? o.vendor_id) === vendor).length,
  }));
  const labels = raw.map(r => r.vendor);
  const data   = raw.map(r => r.total);
  const colors = raw.map((_, i) => PALETTE[i % PALETTE.length]);

  return {
    labels,
    datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
    raw,
  };
}

function dateKey(iso, groupBy) {
  const d = new Date(iso);
  if (groupBy === 'day')  return d.toISOString().split('T')[0];
  if (groupBy === 'week') return `${d.getFullYear()}-W${isoWeek(d)}`;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function isoWeek(d) {
  const tmp    = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return String(Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)).padStart(2,'0');
}

function drawSalesChart({ labels, datasets }) {
  if (chartSales) chartSales.destroy();
  chartSales = new Chart(document.getElementById('chartSales'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => 'R' + v.toLocaleString() } },
        x: { ticks: { font: { size: 11 } } },
      },
    },
  });
}

function drawPeakChart({ labels, datasets }) {
  if (chartPeak) chartPeak.destroy();
  chartPeak = new Chart(document.getElementById('chartPeak'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
      },
    },
  });
}

function drawShareChart({ labels, datasets }) {
  if (chartShare) chartShare.destroy();
  chartShare = new Chart(document.getElementById('chartShare'), {
    type: 'doughnut',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` R${ctx.raw.toLocaleString()}` } },
      },
    },
  });
}

function clearCharts() {
  ['chartSales','chartPeak','chartShare'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}

function renderTable(rows) {
  const container = document.getElementById('tableContainer');
  if (!rows.length) {
    container.innerHTML = '<div class="loading-msg">No data for this period.</div>';
    return;
  }

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Vendor</th>
          <th>Orders</th>
          <th>Revenue</th>
          <th>% of total</th>
        </tr>
      </thead>
      <tbody>
        ${rows.sort((a,b) => b.total - a.total).map(r => `
          <tr>
            <td>${r.vendor}</td>
            <td>${r.orders}</td>
            <td>R${r.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            <td>${grandTotal ? ((r.total / grandTotal) * 100).toFixed(1) + '%' : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td><strong>${rows.reduce((s,r) => s + r.orders, 0)}</strong></td>
          <td><strong>R${grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong></td>
          <td><strong>100%</strong></td>
        </tr>
      </tfoot>
    </table>`;
}

function updateStats(revenue, orders, vendors) {
  document.getElementById('statRevenue').textContent = 'R' + revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 });
  document.getElementById('statOrders').textContent  = orders;
  document.getElementById('statVendors').textContent = vendors;
}

window.exportCSV = (type) => {
  const from = document.getElementById('filterFrom').value;
  const to   = document.getElementById('filterTo').value;
  let rows = [];
  let filename = '';

  if (type === 'sales') {
    rows = [['Vendor','Date','Amount (R)'], ...cachedSalesRows.map(r => [r.vendor, r.date, r.amount])];
    filename = `sales_report_${from}_${to}.csv`;
  } else if (type === 'peak') {
    rows = [['Hour','Order count'], ...cachedPeakRows.map(r => [`${r.hour}:00`, 1])];
    filename = `peak_hours_${from}_${to}.csv`;
  } else if (type === 'share' || type === 'table') {
    rows = [['Vendor','Orders','Revenue (R)'], ...cachedTableRows.map(r => [r.vendor, r.orders, r.total])];
    filename = `vendor_breakdown_${from}_${to}.csv`;
  }

  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded', 'success');
};

window.exportPDF = () => {
  showToast('Opening print dialog — choose "Save as PDF"', 'info');
  window.print();
};

function showToast(msg, kind = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${kind} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

(async () => {
  const session = await requireAdmin();
  if (!session) return;
  initDateDefaults();
  await loadVendorOptions();
  await loadAnalytics();
})();
