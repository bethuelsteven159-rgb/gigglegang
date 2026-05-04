import { requestNotificationPermission } from './shared/notifications.js';

import { initIndexPage } from './pages/index-page.js';
import { initAdminDashboardPage } from './pages/admin-dashboard-page.js';
import { initAdminVendorsPage } from './pages/admin-vendors-page.js';
import { initAdminOrdersPage } from './pages/admin-orders-page.js';

import { initVendorDashboardPage } from './pages/vendor-dashboard-page.js';
import { initVendorMenuPage } from './pages/vendor-menu-page.js';
import { initVendorOrdersPage } from './pages/vendor-orders-page.js';
import { initVendorAnalyticsPage} from './pages/vendor-analytics-page.js';


import { initStudentDashboardPage } from './pages/student-dashboard-page.js';
import { initStudentOrdersPage } from './pages/student-orders-page.js';
import { initStudentHistoryPage } from './pages/student-history-page.js';
import { initPaymentSuccessPage } from "./pages/payment-success-page.js";

document.addEventListener('DOMContentLoaded', async () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const routes = {
    'index.html': initIndexPage,
    'dashboard_admin.html': initAdminDashboardPage,
    'admin_vendor_control.html': initAdminVendorsPage,
    'admin_orders.html': initAdminOrdersPage,

    'dashboard_vendor.html': initVendorDashboardPage,
    'vendor_menu.html': initVendorMenuPage,
    'vendor_orders.html': initVendorOrdersPage,
    'vendor_analytics.html' : initVendorAnalyticsPage,

    'dashboard_student.html': initStudentDashboardPage,
    'student_orders.html': initStudentOrdersPage,
    'student_history.html': initStudentHistoryPage,
    'payment_success.html': initPaymentSuccessPage,
  };

  const init = routes[currentPage];

  if (typeof init === 'function') {
    await init();
  }

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
