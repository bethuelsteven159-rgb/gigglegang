/**
 * @jest-environment node
 */

import request from "supertest";
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from "@jest/globals";

const ORIGINAL_ENV = process.env;

describe("server.js Paystack API", () => {
  beforeEach(() => {
    jest.resetModules();

    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "test",
      PAYSTACK_SECRET_KEY: "test_secret_key",
      FRONTEND_URL: "http://frontend.test",
      PORT: "5000"
    };

    global.fetch = jest.fn();

    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
    delete global.fetch;
  });

  test("returns 400 when initialize request is missing required fields", async () => {
    const { app } = await import("./server.js");

    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@test.com"
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      status: false,
      message: "Email, amount, and orderId are required"
    });
  });

  test("initializes a Paystack transaction with amount converted to cents", async () => {
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: true,
        data: {
          authorization_url: "https://paystack.test/pay"
        }
      })
    });

    const { app } = await import("./server.js");

    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@test.com",
        amount: 25,
        orderId: "ORD-123"
      });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: true,
      data: {
        authorization_url: "https://paystack.test/pay"
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/initialize",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_secret_key",
          "Content-Type": "application/json"
        }),
        body: expect.any(String)
      })
    );

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);

    expect(requestBody).toMatchObject({
      email: "student@test.com",
      amount: 2500,
      currency: "ZAR",
      metadata: {
        orderId: "ORD-123"
      },
      callback_url: "http://frontend.test/payment_success.html"
    });
  });

  test("verifies a Paystack transaction reference", async () => {
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: true,
        data: {
          status: "success"
        }
      })
    });

    const { app } = await import("./server.js");

    const response = await request(app)
      .get("/api/paystack/verify/REF-123");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: true,
      data: {
        status: "success"
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/verify/REF-123",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer test_secret_key"
        }
      })
    );
  });

  test("returns 500 when Paystack initialize throws an error", async () => {
    global.fetch.mockRejectedValue(new Error("Paystack down"));

    const { app } = await import("./server.js");

    const response = await request(app)
      .post("/api/paystack/initialize")
      .send({
        email: "student@test.com",
        amount: 25,
        orderId: "ORD-123"
      });

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      status: false,
      message: "Payment initialization failed"
    });
  });
});