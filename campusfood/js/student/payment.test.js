/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://127.0.0.1:5500/index.html"}
 */

import { jest, describe, test, expect, beforeEach } from "@jest/globals";

import {
  getPaymentApiBaseUrl,
  startPaystackPayment,
  verifyPaystackReference,
  requestPaystackRefund
} from "./payment.js";

describe("payment.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn();
    global.alert = jest.fn();
    global.console.error = jest.fn();
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

  test("startPaystackPayment shows alert when response is not ok", async () => {
    const redirect = jest.fn();

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        status: false,
        message: "Server error"
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

  test("startPaystackPayment handles invalid JSON response", async () => {
    const redirect = jest.fn();

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Invalid JSON");
      }
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

  test("verifyPaystackReference throws when reference is missing", async () => {
    await expect(verifyPaystackReference()).rejects.toThrow(
      "Payment reference is required"
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("verifyPaystackReference throws when backend verification fails", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        message: "Payment verification failed"
      })
    });

    await expect(
      verifyPaystackReference("bad_reference")
    ).rejects.toThrow("Payment verification failed");
  });

  test("verifyPaystackReference throws default error when backend response has no message", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({})
    });

    await expect(
      verifyPaystackReference("bad_reference")
    ).rejects.toThrow("Payment verification failed");
  });

  test("requestPaystackRefund sends refund request using paymentReference", async () => {
    const refundData = {
      status: true,
      message: "Refund requested",
      data: {
        id: "refund_123"
      }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => refundData
    });

    const result = await requestPaystackRefund({
      orderId: "ORD-123",
      paymentReference: "paystack_ref_123",
      amount: 30,
      reason: "Student cancelled order"
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/paystack/refund",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderId: "ORD-123",
          paymentId: "paystack_ref_123",
          amount: 30,
          reason: "Student cancelled order"
        })
      })
    );

    expect(result).toEqual(refundData);
  });

  test("requestPaystackRefund can use paymentId when paymentReference is missing", async () => {
    const refundData = {
      status: true,
      message: "Refund requested"
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => refundData
    });

    const result = await requestPaystackRefund({
      orderId: "ORD-456",
      paymentId: "payment_id_456",
      amount: 45,
      reason: "Vendor unavailable"
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/paystack/refund",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          orderId: "ORD-456",
          paymentId: "payment_id_456",
          amount: 45,
          reason: "Vendor unavailable"
        })
      })
    );

    expect(result).toEqual(refundData);
  });

  test("requestPaystackRefund throws when payment reference is missing", async () => {
    await expect(
      requestPaystackRefund({
        orderId: "ORD-123",
        amount: 30,
        reason: "No reference"
      })
    ).rejects.toThrow(
      "Payment reference is missing. Please contact support."
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("requestPaystackRefund throws when backend rejects refund", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: "Refund request failed"
      })
    });

    await expect(
      requestPaystackRefund({
        orderId: "ORD-123",
        paymentReference: "bad_ref",
        amount: 30,
        reason: "Bad refund"
      })
    ).rejects.toThrow("Refund request failed");
  });

  test("requestPaystackRefund throws default message when backend gives no message", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({})
    });

    await expect(
      requestPaystackRefund({
        orderId: "ORD-123",
        paymentReference: "bad_ref",
        amount: 30,
        reason: "Bad refund"
      })
    ).rejects.toThrow("Refund request failed");
  });

  test("requestPaystackRefund throws when backend returns success false", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        message: "Refund not allowed"
      })
    });

    await expect(
      requestPaystackRefund({
        orderId: "ORD-123",
        paymentReference: "bad_ref",
        amount: 30,
        reason: "Bad refund"
      })
    ).rejects.toThrow("Refund not allowed");
  });

  test("requestPaystackRefund throws when backend returns status false", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: false,
        message: "Paystack rejected refund"
      })
    });

    await expect(
      requestPaystackRefund({
        orderId: "ORD-123",
        paymentReference: "bad_ref",
        amount: 30,
        reason: "Bad refund"
      })
    ).rejects.toThrow("Paystack rejected refund");
  });
});
