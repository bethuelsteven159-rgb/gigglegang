import { requireRole } from '../shared/guards.js';
import { renderVendorName } from '../vendor/dashboard.js';
import { loadVendorOrders, updateOrderStatus } from '../vendor/orders.js';
import { logout } from '../shared/session.js';

export function initVendorOrdersPage() {
  requireRole('vendor');

  renderVendorName();
  loadVendorOrders();

  // expose for inline HTML
  window.updateOrderStatus = updateOrderStatus;
  window.logout = logout;
}
