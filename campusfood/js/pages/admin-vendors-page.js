import { renderAdminName } from '../admin/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { loadVendors, updateVendorStatus, deleteVendor } from '../admin/vendors.js';
import { logout } from '../shared/session.js';

export function initAdminVendorsPage() {
  requireRole('admin');
  renderAdminName();
  loadVendors();

  window.logout = logout;
  window.updateVendorStatus = updateVendorStatus;
  window.deleteVendor = deleteVendor;
}
