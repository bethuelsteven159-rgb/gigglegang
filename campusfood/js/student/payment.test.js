/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://127.0.0.1:5500/index.html"}
 */

import { jest, describe, test, expect, beforeEach } from "@jest/globals";

import {
  getPaymentApiBaseUrl,
  startPaystackPayment,
  verifyPaystackReference
} from "./payment.js";

describe("payment.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  test("getPaymentApiBaseUrl returns localhost API while testing locally", () => {
    expect(getPaymentApiBaseUrl()).toBe("http://localhost:5000");
  });

  test("startPaystackPayment sends payment details to backend and redirects to Paystack", async () => {
    const redirect = jest.fn();

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          authorization_url: "https://checkout.paystack.com/test-payment"
        }
      })
    });

    await startPaystackPayment({
      email: "student@example.com",
      amount: 30,
      orderId: "ORD-123",
      redirect
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/paystack/initialize",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: "student@example.com",
          amount: 30,
          orderId: "ORD-123"
        })
      })
    );

    expect(redirect).toHaveBeenCalledWith(
      "https://checkout.paystack.com/test-payment"
    );
  });

  test("startPaystackPayment shows alert when backend does not return authorization URL", async () => {
    const redirect = jest.fn();

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: false,
        message: "Payment could not start"
      })
    });

    await startPaystackPayment({
      email: "student@example.com",
      amount: 30,
      orderId: "ORD-123",
      redirect
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Payment could not start. Please try again."
    );

    expect(redirect).not.toHaveBeenCalled();
  });

  test("startPaystackPayment shows alert when fetch fails", async () => {
    const redirect = jest.fn();

    global.fetch.mockRejectedValue(new Error("Network error"));

    await startPaystackPayment({
      email: "student@example.com",
      amount: 30,
      orderId: "ORD-123",
      redirect
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Something went wrong while starting payment."
    );

    expect(redirect).not.toHaveBeenCalled();
  });

  test("verifyPaystackReference calls backend verify endpoint and returns payment data", async () => {
    const paymentData = {
      status: true,
      data: {
        reference: "test_reference",
        status: "success",
        amount: 3000
      }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => paymentData
    });

    const result = await verifyPaystackReference("test_reference");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/paystack/verify/test_reference"
    );

    expect(result).toEqual(paymentData);
  });
});
