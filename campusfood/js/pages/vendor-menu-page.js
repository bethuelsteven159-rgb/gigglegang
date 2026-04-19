import { renderVendorName } from '../vendor/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { loadVendorMenu, addMenuItem, toggleSoldOut, deleteMenuItem } from '../vendor/menu.js';
import { logout } from '../shared/session.js';

export function initVendorMenuPage() {
  // Protect page
  requireRole('vendor');

  // Show username
  renderVendorName();

  // Load menu items
  loadVendorMenu();

  // Expose functions used by inline onclick in HTML
  window.addMenuItem = addMenuItem;
  window.toggleSoldOut = toggleSoldOut;
  window.deleteMenuItem = deleteMenuItem;
  window.logout = logout;
}
