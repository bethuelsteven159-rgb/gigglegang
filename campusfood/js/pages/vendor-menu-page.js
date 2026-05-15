import { renderVendorName } from '../vendor/dashboard.js';
import { requireRole } from '../shared/guards.js';
import {
  loadVendorMenu, addMenuItem, toggleSoldOut, deleteMenuItem,
  openEditModal, closeEditModal, saveEdit
} from '../vendor/menu.js';
import { logout } from '../shared/session.js';

export function initVendorMenuPage() {
  requireRole('vendor');
  renderVendorName();
  loadVendorMenu();

  window.addMenuItem    = addMenuItem;
  window.toggleSoldOut  = toggleSoldOut;
  window.deleteMenuItem = deleteMenuItem;
  window.openEditModal  = openEditModal;
  window.closeEditModal = closeEditModal;
  window.saveEdit       = saveEdit;
  window.logout         = logout;
}
