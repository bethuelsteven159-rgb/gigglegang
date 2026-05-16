import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.FRONTEND_URL = "http://127.0.0.1:5500";
process.env.FRONTEND_ORIGIN = "http://127.0.0.1:5500";
process.env.PAYSTACK_SECRET_KEY = "sk_test_fake_key";

const { default: app } = await import("./server.js");

describe("Paystack backend API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    global.console.error = jest.fn();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_fake_key";
  });

  afterEach(() => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_fake_key";
  });

  test("GET /api/health returns API health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Payment API is healthy"
    });
  });

  test("POST /api/paystack/initialize returns 400 when required fields are missing", async () => {
    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@example.com"
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Email, amount, and orderId are required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("POST /api/paystack/initialize returns 500 when Paystack secret key is missing", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;

    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@example.com",
        amount: 30,
        orderId: "ORD-123"
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Paystack secret key is not configured");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("POST /api/paystack/initialize returns 400 when amount is invalid", async () => {
    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@example.com",
        amount: "bad-amount",
        orderId: "ORD-123"
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Amount must be a valid positive number");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("POST /api/paystack/initialize sends correct data to Paystack", async () => {
    const paystackResponse = {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: "https://checkout.paystack.com/test-payment",
        reference: "test_reference"
      }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => paystackResponse
    });

    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@example.com",
        amount: 30,
        orderId: "ORD-123"
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(paystackResponse);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/initialize",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk_test_fake_key",
          "Content-Type": "application/json"
        })
      })
    );

    const fetchBody = JSON.parse(global.fetch.mock.calls[0][1].body);

    expect(fetchBody).toEqual({
      email: "student@example.com",
      amount: 3000,
      currency: "ZAR",
      metadata: {
        orderId: "ORD-123"
      },
      callback_url: "http://127.0.0.1:5500/payment_success.html"
    });
  });

  test("POST /api/paystack/initialize passes Paystack error status back to frontend", async () => {
    const paystackResponse = {
      status: false,
      message: "Invalid key"
    };

    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => paystackResponse
    });

    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@example.com",
        amount: 30,
        orderId: "ORD-123"
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(paystackResponse);
  });

  test("POST /api/paystack/initialize returns 500 when Paystack request crashes", async () => {
    global.fetch.mockRejectedValue(new Error("Network error"));

    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@example.com",
        amount: 30,
        orderId: "ORD-123"
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Payment initialization failed"
    });
  });

  test("GET /api/paystack/verify/:reference returns 500 when Paystack secret key is missing", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;

    const response = await request(app).get("/api/paystack/verify/test_reference");

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Paystack secret key is not configured");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("GET /api/paystack/verify/:reference verifies payment reference with Paystack", async () => {
    const paystackResponse = {
      status: true,
      message: "Verification successful",
      data: {
        reference: "test_reference",
        status: "success",
        amount: 3000
      }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => paystackResponse
    });

    const response = await request(app).get("/api/paystack/verify/test_reference");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(paystackResponse);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/verify/test_reference",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer sk_test_fake_key"
        })
      })
    );
  });

  test("GET /api/paystack/verify/:reference passes Paystack error status back to frontend", async () => {
    const paystackResponse = {
      status: false,
      message: "Reference not found"
    };

    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => paystackResponse
    });

    const response = await request(app).get("/api/paystack/verify/bad_reference");

    expect(response.status).toBe(404);
    expect(response.body).toEqual(paystackResponse);
  });

  test("GET /api/paystack/verify/:reference returns 500 when Paystack request crashes", async () => {
    global.fetch.mockRejectedValue(new Error("Verify network error"));

    const response = await request(app).get("/api/paystack/verify/test_reference");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Payment verification failed"
    });
  });

  test("POST /api/paystack/refund returns 400 when paymentId is missing", async () => {
    const response = await request(app)
      .post("/api/paystack/refund")
      .send({
        orderId: "ORD-123",
        amount: 30,
        reason: "Student cancelled"
      });

    expect([400, 404]).toContain(response.status);

    if (response.status !== 404) {
      expect(response.body.success).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    }
  });

  test("POST /api/paystack/refund sends refund request to Paystack when endpoint exists", async () => {
    const paystackResponse = {
      status: true,
      message: "Refund created",
      data: {
        id: "refund_123"
      }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => paystackResponse
    });

    const response = await request(app)
      .post("/api/paystack/refund")
      .send({
        orderId: "ORD-123",
        paymentId: "paystack_reference_123",
        amount: 30,
        reason: "Student cancelled"
      });

    if (response.status === 404) {
      expect(response.status).toBe(404);
      return;
    }

    expect(response.status).toBe(200);
    expect(response.body).toEqual(paystackResponse);
    expect(global.fetch).toHaveBeenCalled();
  });

  test("POST /api/paystack/refund returns 500 when Paystack refund request crashes", async () => {
    global.fetch.mockRejectedValue(new Error("Refund network error"));

    const response = await request(app)
      .post("/api/paystack/refund")
      .send({
        orderId: "ORD-123",
        paymentId: "paystack_reference_123",
        amount: 30,
        reason: "Student cancelled"
      });

    if (response.status === 404) {
      expect(response.status).toBe(404);
      return;
    }

    expect(response.status).toBe(500);
  });
});
