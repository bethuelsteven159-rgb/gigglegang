import { requestNotificationPermission } from './shared/notifications.js';
import { initIndexPage } from './pages/index-page.js';
import { initAdminDashboardPage } from './pages/admin-dashboard-page.js';
import { initAdminVendorsPage } from './pages/admin-vendors-page.js';
import { initAdminOrdersPage } from './pages/admin-orders-page.js';
import { initVendorDashboardPage } from './pages/vendor-dashboard-page.js';
import { initVendorMenuPage } from './pages/vendor-menu-page.js';
import { initVendorOrdersPage } from './pages/vendor-orders-page.js';
import { initStudentDashboardPage } from './pages/student-dashboard-page.js';
import { initStudentOrdersPage } from './pages/student-orders-page.js';
import { initStudentHistoryPage } from './pages/student-history-page.js';

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const routes = {
  'index.html': initIndexPage,
  'dashboard_admin.html': initAdminDashboardPage,
  'admin_vendor_control.html': initAdminVendorsPage,
  'admin_orders.html': initAdminOrdersPage,
  'dashboard_vendor.html': initVendorDashboardPage,
  'vendor_menu.html': initVendorMenuPage,
  'vendor_orders.html': initVendorOrdersPage, // 👈 ADD THIS
  'dashboard_student.html': initStudentDashboardPage,
  'student_orders.html': initStudentOrdersPage,
  'student_history.html': initStudentHistoryPage,
};

  const init = routes[currentPage];
  if (init) init();

  const currentPageLower = currentPage.toLowerCase();
  if (
    currentPageLower.includes('dashboard') ||
    currentPageLower.includes('student') ||
    currentPageLower.includes('vendor')
  ) {
    setTimeout(() => {
      requestNotificationPermission();
    }, 1000);
  }
});


// =======================
// TOAST NOTIFICATION
// =======================

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 50);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// =======================
// BROWSER NOTIFICATION
// =======================

function showBrowserNotification(message) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification('Order Update', {
      body: message
    });
  }
}

// ask permission once
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}






