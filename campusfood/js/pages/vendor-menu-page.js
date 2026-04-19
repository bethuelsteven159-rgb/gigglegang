import { renderVendorName } from '../vendor/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { loadVendorMenu, addMenuItem, toggleSoldOut, deleteMenuItem } from '../vendor/menu.js';
import { logout } from '../shared/session.js';

export function initVendorMenuPage() {
  requireRole('vendor');
  renderVendorName();
  loadVendorMenu();

  window.logout = logout;
  window.addMenuItem = addMenuItem;
  window.toggleSoldOut = toggleSoldOut;
  window.deleteMenuItem = deleteMenuItem;
}
