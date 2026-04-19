import { renderVendorName } from '../vendor/dashboard.js';
import { requireRole } from '../shared/guards.js';

export function initVendorDashboardPage() {
  requireRole('vendor');
  renderVendorName();
}
