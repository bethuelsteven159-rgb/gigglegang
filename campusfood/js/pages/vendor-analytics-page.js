import { requireRole } from '../shared/guards.js';
import { renderVendorName } from '../vendor/dashboard.js';
import {
  loadVendorAnalytics,
  exportVendorAnalyticsCSV
} from '../vendor/analytics.js';
import { logout } from '../shared/session.js';

export async function initVendorAnalyticsPage() {
  if (!requireRole('vendor')) return;

  renderVendorName();
  await loadVendorAnalytics();

  const refreshBtn = document.getElementById('refreshAnalyticsBtn');
  const exportBtn = document.getElementById('exportAnalyticsBtn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadVendorAnalytics);
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportVendorAnalyticsCSV);
  }

  window.logout = logout;
}