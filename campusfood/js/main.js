import { requestNotificationPermission } from './shared/notifications.js';
import { initIndexPage } from './pages/index-page.js';

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const currentPageLower = currentPage.toLowerCase();

  if (currentPage === 'index.html' || currentPage === '') {
    initIndexPage();
  }

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
