/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://bethuelsteven159-rgb.github.io/gigglegang/index.html"}
 */

import { jest, describe, test, expect, beforeEach } from "@jest/globals";

import {
  getPaymentApiBaseUrl,
  startPaystackPayment,
  verifyPaystackReference,
  requestPaystackRefund
} from "./payment.js";

describe("payment.js live frontend behaviour", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn();
    global.alert = jest.fn();
    global.console.error = jest.fn();
  });

  test("getPaymentApiBaseUrl returns live API URL when website is not local", () => {
    expect(getPaymentApiBaseUrl()).not.toBe("http://localhost:5000");
  });

  test("startPaystackPayment handles live backend configuration", async () => {
    const redirect = jest.fn();
    const liveApiBaseUrl = getPaymentApiBaseUrl();

    if (liveApiBaseUrl.includes("YOUR-BACKEND-URL-HERE")) {
      await startPaystackPayment({
        email: "student@example.com",
        amount: 30,
        orderId: "ORD-LIVE-1",
        redirect
      });

      expect(global.alert).toHaveBeenCalledWith(
        "Payment backend is not configured for the live website yet."
      );
      expect(global.fetch).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
      return;
    }

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          authorization_url: "https://checkout.paystack.com/live-test"
        }
      })
    });

    await startPaystackPayment({
      email: "student@example.com",
      amount: 30,
      orderId: "ORD-LIVE-1",
      redirect
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${liveApiBaseUrl}/api/paystack/initialize`,
      expect.objectContaining({
        method: "POST"
      })
    );

    expect(redirect).toHaveBeenCalledWith(
      "https://checkout.paystack.com/live-test"
    );
  });

  test("verifyPaystackReference handles unconfigured live backend", async () => {
    const liveApiBaseUrl = getPaymentApiBaseUrl();

    if (liveApiBaseUrl.includes("YOUR-BACKEND-URL-HERE")) {
      await expect(
        verifyPaystackReference("live_reference")
      ).rejects.toThrow("Live backend URL is not configured in payment.js");

      expect(global.fetch).not.toHaveBeenCalled();
      return;
    }

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          reference: "live_reference",
          status: "success"
        }
      })
    });

    const result = await verifyPaystackReference("live_reference");

    expect(global.fetch).toHaveBeenCalledWith(
      `${liveApiBaseUrl}/api/paystack/verify/live_reference`
    );

    expect(result.status).toBe(true);
  });

  test("requestPaystackRefund handles unconfigured live backend", async () => {
    const liveApiBaseUrl = getPaymentApiBaseUrl();

    if (liveApiBaseUrl.includes("YOUR-BACKEND-URL-HERE")) {
      await expect(
        requestPaystackRefund({
          orderId: "ORD-LIVE-REFUND",
          paymentReference: "live_refund_reference",
          amount: 30,
          reason: "Live backend not configured"
        })
      ).rejects.toThrow("Live backend URL is not configured in payment.js");

      expect(global.fetch).not.toHaveBeenCalled();
      return;
    }

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        message: "Refund requested"
      })
    });

    const result = await requestPaystackRefund({
      orderId: "ORD-LIVE-REFUND",
      paymentReference: "live_refund_reference",
      amount: 30,
      reason: "Student cancelled"
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${liveApiBaseUrl}/api/paystack/refund`,
      expect.objectContaining({
        method: "POST"
      })
    );

    expect(result.status).toBe(true);
  });
});