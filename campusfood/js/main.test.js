import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

const initializerNames = [
  'initIndexPage',
  'initAdminDashboardPage',
  'initAdminVendorsPage',
  'initAdminOrdersPage',
  'initAdminCompliancePage',
  'initVendorDashboardPage',
  'initVendorMenuPage',
  'initVendorOrdersPage',
  'initVendorAnalyticsPage',
  'initStudentDashboardPage',
  'initStudentOrdersPage',
  'initStudentHistoryPage',
  'initPaymentSuccessPage',
  'initPaymentCancelledPage'
];

function setPathname(pathname) {
  if (typeof window === 'undefined') {
    global.window = {
      location: { pathname }
    };
    return;
  }

  if (window.history && window.history.pushState) {
    window.history.pushState({}, '', pathname);
    return;
  }

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname }
  });
}

function captureDOMContentLoadedHandler() {
  let domContentLoadedHandler;

  if (typeof document === 'undefined') {
    global.document = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') {
          domContentLoadedHandler = handler;
        }
      })
    };

    return {
      getHandler: () => domContentLoadedHandler,
      addEventListenerMock: document.addEventListener
    };
  }

  const addEventListenerSpy = jest
    .spyOn(document, 'addEventListener')
    .mockImplementation((event, handler) => {
      if (event === 'DOMContentLoaded') {
        domContentLoadedHandler = handler;
      }
    });

  return {
    getHandler: () => domContentLoadedHandler,
    addEventListenerMock: addEventListenerSpy
  };
}

async function loadMainForPath(pathname) {
  jest.resetModules();
  jest.useFakeTimers();

  const mocks = {
    requestNotificationPermission: jest.fn(),

    initIndexPage: jest.fn(),
    initAdminDashboardPage: jest.fn(),
    initAdminVendorsPage: jest.fn(),
    initAdminOrdersPage: jest.fn(),
    initAdminCompliancePage: jest.fn(),

    initVendorDashboardPage: jest.fn(),
    initVendorMenuPage: jest.fn(),
    initVendorOrdersPage: jest.fn(),
    initVendorAnalyticsPage: jest.fn(),

    initStudentDashboardPage: jest.fn(),
    initStudentOrdersPage: jest.fn(),
    initStudentHistoryPage: jest.fn(),

    initPaymentSuccessPage: jest.fn(),
    initPaymentCancelledPage: jest.fn()
  };

  await jest.unstable_mockModule('./shared/notifications.js', () => ({
    requestNotificationPermission: mocks.requestNotificationPermission,
    toast: jest.fn()
  }), { virtual: true });

  await jest.unstable_mockModule('./config/supabase.js', () => ({
    sb: {}
  }), { virtual: true });

  await jest.unstable_mockModule(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
    () => ({
      createClient: jest.fn(() => ({}))
    }),
    { virtual: true }
  );

  await jest.unstable_mockModule('./pages/index-page.js', () => ({
    initIndexPage: mocks.initIndexPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/admin-dashboard-page.js', () => ({
    initAdminDashboardPage: mocks.initAdminDashboardPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/admin-vendors-page.js', () => ({
    initAdminVendorsPage: mocks.initAdminVendorsPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/admin-orders-page.js', () => ({
    initAdminOrdersPage: mocks.initAdminOrdersPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/admin-compliance-page.js', () => ({
    initAdminCompliancePage: mocks.initAdminCompliancePage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/vendor-dashboard-page.js', () => ({
    initVendorDashboardPage: mocks.initVendorDashboardPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/vendor-menu-page.js', () => ({
    initVendorMenuPage: mocks.initVendorMenuPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/vendor-orders-page.js', () => ({
    initVendorOrdersPage: mocks.initVendorOrdersPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/vendor-analytics-page.js', () => ({
    initVendorAnalyticsPage: mocks.initVendorAnalyticsPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/student-dashboard-page.js', () => ({
    initStudentDashboardPage: mocks.initStudentDashboardPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/student-orders-page.js', () => ({
    initStudentOrdersPage: mocks.initStudentOrdersPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/student-history-page.js', () => ({
    initStudentHistoryPage: mocks.initStudentHistoryPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/payment-success-page.js', () => ({
    initPaymentSuccessPage: mocks.initPaymentSuccessPage
  }), { virtual: true });

  await jest.unstable_mockModule('./pages/payment-cancelled-page.js', () => ({
    initPaymentCancelledPage: mocks.initPaymentCancelledPage
  }), { virtual: true });

  setPathname(pathname);

  const {
    getHandler,
    addEventListenerMock
  } = captureDOMContentLoadedHandler();

  await import('./main.js');

  return {
    mocks,
    addEventListenerMock,
    getDomContentLoadedHandler: getHandler,
    fireDOMContentLoaded: async () => {
      const handler = getHandler();

      expect(handler).toEqual(expect.any(Function));

      await handler();
    }
  };
}

function expectOnlyInitializerCalled(mocks, expectedName) {
  for (const name of initializerNames) {
    if (name === expectedName) {
      expect(mocks[name]).toHaveBeenCalledTimes(1);
    } else {
      expect(mocks[name]).not.toHaveBeenCalled();
    }
  }
}

describe('main.js router', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('registers a DOMContentLoaded listener', async () => {
    const {
      addEventListenerMock,
      getDomContentLoadedHandler
    } = await loadMainForPath('/gigglegang/index.html');

    expect(addEventListenerMock).toHaveBeenCalledWith(
      'DOMContentLoaded',
      expect.any(Function)
    );

    expect(getDomContentLoadedHandler()).toEqual(expect.any(Function));
  });

  test.each([
    ['/gigglegang/index.html', 'initIndexPage'],
    ['/gigglegang/dashboard_admin.html', 'initAdminDashboardPage'],
    ['/gigglegang/admin_vendor_control.html', 'initAdminVendorsPage'],
    ['/gigglegang/admin_orders.html', 'initAdminOrdersPage'],
    ['/gigglegang/admin_compliance.html', 'initAdminCompliancePage'],

    ['/gigglegang/dashboard_vendor.html', 'initVendorDashboardPage'],
    ['/gigglegang/vendor_menu.html', 'initVendorMenuPage'],
    ['/gigglegang/vendor_orders.html', 'initVendorOrdersPage'],
    ['/gigglegang/vendor_analytics.html', 'initVendorAnalyticsPage'],

    ['/gigglegang/dashboard_student.html', 'initStudentDashboardPage'],
    ['/gigglegang/student_orders.html', 'initStudentOrdersPage'],
    ['/gigglegang/student_history.html', 'initStudentHistoryPage'],

    ['/gigglegang/payment_success.html', 'initPaymentSuccessPage'],
    ['/gigglegang/payment_cancelled.html', 'initPaymentCancelledPage']
  ])('calls the correct initializer for %s', async (pathname, expectedInitializer) => {
    const { mocks, fireDOMContentLoaded } = await loadMainForPath(pathname);

    await fireDOMContentLoaded();

    expectOnlyInitializerCalled(mocks, expectedInitializer);
  });

  test('uses index page initializer when pathname has no file name', async () => {
    const { mocks, fireDOMContentLoaded } = await loadMainForPath('/gigglegang/');

    await fireDOMContentLoaded();

    expectOnlyInitializerCalled(mocks, 'initIndexPage');
  });

  test('does not call any initializer for an unknown page', async () => {
    const { mocks, fireDOMContentLoaded } = await loadMainForPath('/gigglegang/unknown.html');

    await fireDOMContentLoaded();

    for (const name of initializerNames) {
      expect(mocks[name]).not.toHaveBeenCalled();
    }
  });

  test.each([
    '/gigglegang/dashboard_admin.html',
    '/gigglegang/dashboard_vendor.html',
    '/gigglegang/dashboard_student.html',
    '/gigglegang/admin_vendor_control.html',
    '/gigglegang/vendor_menu.html',
    '/gigglegang/vendor_orders.html',
    '/gigglegang/vendor_analytics.html',
    '/gigglegang/student_orders.html',
    '/gigglegang/student_history.html'
  ])('requests notification permission on dashboard/student/vendor pages: %s', async (pathname) => {
    const { mocks, fireDOMContentLoaded } = await loadMainForPath(pathname);

    await fireDOMContentLoaded();

    expect(mocks.requestNotificationPermission).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(mocks.requestNotificationPermission).toHaveBeenCalledTimes(1);
  });

  test.each([
    '/gigglegang/index.html',
    '/gigglegang/admin_orders.html',
    '/gigglegang/admin_compliance.html',
    '/gigglegang/payment_success.html',
    '/gigglegang/payment_cancelled.html',
    '/gigglegang/unknown.html'
  ])('does not request notification permission on other pages: %s', async (pathname) => {
    const { mocks, fireDOMContentLoaded } = await loadMainForPath(pathname);

    await fireDOMContentLoaded();

    jest.runAllTimers();

    expect(mocks.requestNotificationPermission).not.toHaveBeenCalled();
  });
});
