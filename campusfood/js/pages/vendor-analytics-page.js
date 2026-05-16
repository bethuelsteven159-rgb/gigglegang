import { requireRole } from "../shared/guards.js";
import { renderVendorName } from "../vendor/dashboard.js";
import {
  loadVendorAnalytics,
  exportVendorAnalyticsCSV
} from "../vendor/analytics.js";
import { logout } from "../shared/session.js";

export async function initVendorAnalyticsPage() {
  if (!requireRole("vendor")) return;

  renderVendorName();

  const applyBtn = document.getElementById("applyVendorAnalyticsBtn");
  const refreshBtn = document.getElementById("refreshAnalyticsBtn");
  const exportBtn = document.getElementById("exportAnalyticsBtn");

  if (applyBtn) {
    applyBtn.addEventListener("click", loadVendorAnalytics);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadVendorAnalytics);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportVendorAnalyticsCSV);
  }

  window.logout = logout;
  window.loadVendorAnalytics = loadVendorAnalytics;
  window.exportVendorAnalyticsCSV = exportVendorAnalyticsCSV;

  await loadVendorAnalytics();
}
