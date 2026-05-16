/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

async function loadVendorAnalyticsPage({
  roleOk = true,
  hasApplyButton = true,
  hasRefreshButton = true,
  hasExportButton = true
} = {}) {
  jest.resetModules();

  document.body.innerHTML = `
    ${hasApplyButton ? '<button id="applyVendorAnalyticsBtn">Apply</button>' : ''}
    ${hasRefreshButton ? '<button id="refreshAnalyticsBtn">Refresh</button>' : ''}
    ${hasExportButton ? '<button id="exportAnalyticsBtn">Export</button>' : ''}
  `;

  const mocks = {
    requireRole: jest.fn(() => roleOk),
    renderVendorName: jest.fn(),
    loadVendorAnalytics: jest.fn(async () => {}),
    exportVendorAnalyticsCSV: jest.fn(),
    logout: jest.fn()
  };

  await jest.unstable_mockModule('../shared/guards.js', () => ({
    requireRole: mocks.requireRole
  }), { virtual: true });

  await jest.unstable_mockModule('../vendor/dashboard.js', () => ({
    renderVendorName: mocks.renderVendorName
  }), { virtual: true });

  await jest.unstable_mockModule('../vendor/analytics.js', () => ({
    loadVendorAnalytics: mocks.loadVendorAnalytics,
    exportVendorAnalyticsCSV: mocks.exportVendorAnalyticsCSV
  }), { virtual: true });

  await jest.unstable_mockModule('../shared/session.js', () => ({
    logout: mocks.logout
  }), { virtual: true });

  const module = await import('./vendor-analytics-page.js');

  return {
    ...module,
    mocks
  };
}

describe('vendor-analytics-page.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.logout;
    delete window.loadVendorAnalytics;
    delete window.exportVendorAnalyticsCSV;
    jest.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.logout;
    delete window.loadVendorAnalytics;
    delete window.exportVendorAnalyticsCSV;
    jest.restoreAllMocks();
  });

  test('stops if the user does not have the vendor role', async () => {
    const { initVendorAnalyticsPage, mocks } = await loadVendorAnalyticsPage({
      roleOk: false
    });

    await initVendorAnalyticsPage();

    expect(mocks.requireRole).toHaveBeenCalledWith('vendor');
    expect(mocks.renderVendorName).not.toHaveBeenCalled();
    expect(mocks.loadVendorAnalytics).not.toHaveBeenCalled();
    expect(mocks.exportVendorAnalyticsCSV).not.toHaveBeenCalled();
  });

  test('renders vendor name and loads analytics on page initialization', async () => {
    const { initVendorAnalyticsPage, mocks } = await loadVendorAnalyticsPage();

    await initVendorAnalyticsPage();

    expect(mocks.requireRole).toHaveBeenCalledWith('vendor');
    expect(mocks.renderVendorName).toHaveBeenCalledTimes(1);
    expect(mocks.loadVendorAnalytics).toHaveBeenCalledTimes(1);
  });

  test('adds click listeners for apply, refresh, and export buttons', async () => {
    const { initVendorAnalyticsPage, mocks } = await loadVendorAnalyticsPage();

    await initVendorAnalyticsPage();

    document.getElementById('applyVendorAnalyticsBtn').click();
    document.getElementById('refreshAnalyticsBtn').click();
    document.getElementById('exportAnalyticsBtn').click();

    expect(mocks.loadVendorAnalytics).toHaveBeenCalledTimes(3);
    expect(mocks.exportVendorAnalyticsCSV).toHaveBeenCalledTimes(1);
  });

  test('does not crash when analytics buttons are missing', async () => {
    const { initVendorAnalyticsPage, mocks } = await loadVendorAnalyticsPage({
      hasApplyButton: false,
      hasRefreshButton: false,
      hasExportButton: false
    });

    await initVendorAnalyticsPage();

    expect(mocks.renderVendorName).toHaveBeenCalledTimes(1);
    expect(mocks.loadVendorAnalytics).toHaveBeenCalledTimes(1);
    expect(mocks.exportVendorAnalyticsCSV).not.toHaveBeenCalled();
  });

  test('exposes analytics and logout functions on window', async () => {
    const { initVendorAnalyticsPage, mocks } = await loadVendorAnalyticsPage();

    await initVendorAnalyticsPage();

    expect(window.logout).toBe(mocks.logout);
    expect(window.loadVendorAnalytics).toBe(mocks.loadVendorAnalytics);
    expect(window.exportVendorAnalyticsCSV).toBe(mocks.exportVendorAnalyticsCSV);
  });
});
