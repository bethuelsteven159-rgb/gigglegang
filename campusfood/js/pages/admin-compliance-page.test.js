/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

async function loadAdminCompliancePage({
  roleOk = true,
  adminOk = true,
  hasLogoutButton = true
} = {}) {
  jest.resetModules();

  document.body.innerHTML = hasLogoutButton
    ? '<button id="logoutBtn">Logout</button>'
    : '';

  const mocks = {
    renderAdminName: jest.fn(),
    loadCompliance: jest.fn(async () => {}),
    requireRole: jest.fn(() => roleOk),
    requireAdmin: jest.fn(async () => adminOk),
    logout: jest.fn()
  };

  await jest.unstable_mockModule('../admin/dashboard.js', () => ({
    renderAdminName: mocks.renderAdminName
  }), { virtual: true });

  await jest.unstable_mockModule('../admin/compliance.js', () => ({
    loadCompliance: mocks.loadCompliance
  }), { virtual: true });

  await jest.unstable_mockModule('../shared/guards.js', () => ({
    requireRole: mocks.requireRole,
    requireAdmin: mocks.requireAdmin
  }), { virtual: true });

  await jest.unstable_mockModule('../shared/session.js', () => ({
    logout: mocks.logout
  }), { virtual: true });

  const module = await import('./admin-compliance-page.js');

  return {
    ...module,
    mocks
  };
}

describe('admin-compliance-page.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('stops if the user does not have the admin role', async () => {
    const { initAdminCompliancePage, mocks } = await loadAdminCompliancePage({
      roleOk: false
    });

    await initAdminCompliancePage();

    expect(mocks.requireRole).toHaveBeenCalledWith('admin');
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.renderAdminName).not.toHaveBeenCalled();
    expect(mocks.loadCompliance).not.toHaveBeenCalled();
  });

  test('stops if requireAdmin fails', async () => {
    const { initAdminCompliancePage, mocks } = await loadAdminCompliancePage({
      roleOk: true,
      adminOk: false
    });

    await initAdminCompliancePage();

    expect(mocks.requireRole).toHaveBeenCalledWith('admin');
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.renderAdminName).not.toHaveBeenCalled();
    expect(mocks.loadCompliance).not.toHaveBeenCalled();
  });

  test('renders admin name, wires logout button, and loads compliance', async () => {
    const { initAdminCompliancePage, mocks } = await loadAdminCompliancePage();

    await initAdminCompliancePage();

    expect(mocks.requireRole).toHaveBeenCalledWith('admin');
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.renderAdminName).toHaveBeenCalledTimes(1);
    expect(mocks.loadCompliance).toHaveBeenCalledTimes(1);

    document.getElementById('logoutBtn').click();

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  test('still loads compliance when logout button is missing', async () => {
    const { initAdminCompliancePage, mocks } = await loadAdminCompliancePage({
      hasLogoutButton: false
    });

    await initAdminCompliancePage();

    expect(mocks.renderAdminName).toHaveBeenCalledTimes(1);
    expect(mocks.loadCompliance).toHaveBeenCalledTimes(1);
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
