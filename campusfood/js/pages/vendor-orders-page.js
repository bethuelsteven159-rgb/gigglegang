import { requireRole } from '../shared/guards.js';
import { renderVendorName } from '../vendor/dashboard.js';
import {
  loadVendorOrders,
  updateOrderStatus
} from '../vendor/orders.js';
import { logout } from '../shared/session.js';

export async function initVendorOrdersPage() {
  if (!requireRole('vendor')) return;

  renderVendorName();
  await loadVendorOrders();

  window.updateOrderStatus = updateOrderStatus;
  window.logout = logout;
}
