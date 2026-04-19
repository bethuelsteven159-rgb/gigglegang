import { renderStudentName } from '../student/dashboard.js';
import { requireRole } from '../shared/guards.js';
import { loadStudentMenu } from '../student/menu.js';
import { loadVendorsList, showVendorMenu, resetToAllMenu } from '../student/browse-vendors.js';
import { addToCart, removeFromCart, updateCartDisplay } from '../student/cart.js';
import { placeOrder } from '../student/checkout.js';
import { logout } from '../shared/session.js';

export function initStudentOrdersPage() {
  requireRole('student');
  renderStudentName();
  loadStudentMenu();

  const menuView = document.getElementById('menuView');
  const vendorsView = document.getElementById('vendorsView');
  const browseByMenuBtn = document.getElementById('browseByMenuBtn');
  const browseByVendorBtn = document.getElementById('browseByVendorBtn');

  if (browseByMenuBtn) {
    browseByMenuBtn.addEventListener('click', () => {
      menuView.style.display = 'block';
      vendorsView.style.display = 'none';

      browseByMenuBtn.className = 'btn btn-primary';
      browseByVendorBtn.className = 'btn';
      browseByVendorBtn.style.background = 'var(--surface-alt)';
      browseByVendorBtn.style.color = 'var(--text)';

      loadStudentMenu();
    });
  }

  if (browseByVendorBtn) {
    browseByVendorBtn.addEventListener('click', () => {
      menuView.style.display = 'none';
      vendorsView.style.display = 'block';

      browseByVendorBtn.className = 'btn btn-primary';
      browseByMenuBtn.className = 'btn';
      browseByMenuBtn.style.background = 'var(--surface-alt)';
      browseByMenuBtn.style.color = 'var(--text)';

      loadVendorsList();
    });
  }

  window.logout = logout;
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.placeOrder = placeOrder;
  window.showVendorMenu = showVendorMenu;
  window.resetToAllMenu = resetToAllMenu;
}
