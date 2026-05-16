/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

async function loadPaymentSuccessPage() {
  jest.resetModules();

  const mocks = {
    completePaidOrderAfterPayment: jest.fn()
  };

  await jest.unstable_mockModule('../student/checkout.js', () => ({
    completePaidOrderAfterPayment: mocks.completePaidOrderAfterPayment
  }), { virtual: true });

  const module = await import('./payment-success-page.js');

  return {
    ...module,
    mocks
  };
}

describe('payment-success-page.js', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('calls completePaidOrderAfterPayment when the payment success page initializes', async () => {
    const { initPaymentSuccessPage, mocks } = await loadPaymentSuccessPage();

    initPaymentSuccessPage();

    expect(mocks.completePaidOrderAfterPayment).toHaveBeenCalledTimes(1);
  });
});
