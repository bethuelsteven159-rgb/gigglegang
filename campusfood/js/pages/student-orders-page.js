import { renderStudentName } from '../student/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { loadStudentMenu } from '../student/menu.js';
import { loadVendorsList, showVendorMenu, resetToAllMenu } from '../student/browse-vendors.js';
import { addToCart, removeFromCart } from '../student/cart.js';
import { placeOrder } from '../student/checkout.js';
import { logout } from '../shared/session.js';

export function initStudentOrdersPage() {
  // Protect page
  requireRole('student');

  // Show username
  renderStudentName();

  // Load default menu
  loadStudentMenu();

  const menuView = document.getElementById('menuView');
  const vendorsView = document.getElementById('vendorsView');
  const browseByMenuBtn = document.getElementById('browseByMenuBtn');
  const browseByVendorBtn = document.getElementById('browseByVendorBtn');

  if (browseByMenuBtn) {
    browseByMenuBtn.addEventListener('click', () => {
      if (menuView) menuView.style.display = 'block';
      if (vendorsView) vendorsView.style.display = 'none';

      browseByMenuBtn.className = 'btn btn-primary';
      if (browseByVendorBtn) {
        browseByVendorBtn.className = 'btn';
        browseByVendorBtn.style.background = 'var(--surface-alt)';
        browseByVendorBtn.style.color = 'var(--text)';
      }

      loadStudentMenu();
    });
  }

  if (browseByVendorBtn) {
    browseByVendorBtn.addEventListener('click', () => {
      if (menuView) menuView.style.display = 'none';
      if (vendorsView) vendorsView.style.display = 'block';

      browseByVendorBtn.className = 'btn btn-primary';
      if (browseByMenuBtn) {
        browseByMenuBtn.className = 'btn';
        browseByMenuBtn.style.background = 'var(--surface-alt)';
        browseByMenuBtn.style.color = 'var(--text)';
      }

      loadVendorsList();
    });
  }

  // Expose functions still used by inline onclick in HTML
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.placeOrder = placeOrder;
  window.showVendorMenu = showVendorMenu;
  window.resetToAllMenu = resetToAllMenu;
  window.logout = logout;
}
