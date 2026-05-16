import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.PAYSTACK_SECRET_KEY = "sk_test_fake_key";
process.env.FRONTEND_URL = "http://127.0.0.1:5500";
process.env.FRONTEND_ORIGIN = "http://127.0.0.1:5500";

const { default: app } = await import("./backend/server.js");

describe("Paystack backend API", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn();
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
});
