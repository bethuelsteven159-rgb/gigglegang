/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

async function loadPaymentCancelledPage() {
  jest.resetModules();

  const mocks = {
    cancelPendingPayment: jest.fn()
  };

  await jest.unstable_mockModule('../student/checkout.js', () => ({
    cancelPendingPayment: mocks.cancelPendingPayment
  }), { virtual: true });

  const module = await import('./payment-cancelled-page.js');

  return {
    ...module,
    mocks
  };
}

describe('payment-cancelled-page.js', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('calls cancelPendingPayment when the payment cancelled page initializes', async () => {
    const { initPaymentCancelledPage, mocks } = await loadPaymentCancelledPage();

    initPaymentCancelledPage();

    expect(mocks.cancelPendingPayment).toHaveBeenCalledTimes(1);
  });
});
