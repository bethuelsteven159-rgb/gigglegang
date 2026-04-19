import { renderAdminName } from '../admin/dashboard.js';
import { requireRole } from '../shared/guards.js';
import {
  loadVendors,
  updateVendorStatus,
  deleteVendor,
  createVendor
} from '../admin/vendors.js';
import { logout } from '../shared/session.js';

export function initAdminVendorsPage() {
  // Protect page
  requireRole('admin');

  // Show username
  renderAdminName();

  // Load vendors
  loadVendors();

  // 🔥 THIS is the part you were asking about
  window.createVendor = createVendor;
  window.updateVendorStatus = updateVendorStatus;
  window.deleteVendor = deleteVendor;
  window.logout = logout;
}
