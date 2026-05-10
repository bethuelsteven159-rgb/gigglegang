import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pathToFileURL } from "url";

dotenv.config();

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export const app = express();

app.use(cors());
app.use(express.json());

function getServerPort() {
  return Number(process.env.PORT) || 5000;
}

function getPaystackSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY;
}

function amountToSubunit(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  return Math.round(numericAmount * 100);
}

async function readPaystackJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {
      status: false,
      message: "Paystack returned an invalid response"
    };
  }
}

async function callPaystack(path, options = {}) {
  const secretKey = getPaystackSecretKey();

  if (!secretKey) {
    return {
      response: { ok: false, status: 500 },
      data: {
        status: false,
        message: "Paystack secret key is not configured"
      }
    };
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await readPaystackJson(response);

  return { response, data };
}

app.post("/api/paystack/initialize", async (req, res) => {
  try {
    const { email, amount, orderId } = req.body;

    if (!email || !amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Email, amount, and orderId are required"
      });
    }

    const { response, data } = await callPaystack("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: amountToSubunit(amount),
        currency: "ZAR",
        metadata: {
          orderId
        },
        callback_url: `${process.env.FRONTEND_URL}/payment_success.html`
      })
    });

    if (!response.ok || !data.status) {
      return res.status(response.status || 502).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error("Paystack initialize error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Payment initialization failed"
    });
  }
});

app.get("/api/paystack/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required"
      });
    }

    const { response, data } = await callPaystack(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET" }
    );

    if (!response.ok || !data.status) {
      return res.status(response.status || 502).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error("Paystack verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  }
});

app.post("/api/paystack/refund", async (req, res) => {
  try {
    const {
      transaction,
      paymentId,
      paymentReference,
      amount,
      orderId,
      reason
    } = req.body;

    const transactionReference = transaction || paymentReference || paymentId;

    if (!transactionReference) {
      return res.status(400).json({
        success: false,
        message: "A Paystack transaction reference or id is required"
      });
    }

    const refundBody = {
      transaction: String(transactionReference),
      currency: "ZAR",
      customer_note: reason || "Order cancelled by student",
      merchant_note: orderId
        ? `Campus Food refund for cancelled order ${orderId}`
        : "Campus Food refund for cancelled order"
    };

    if (amount !== undefined && amount !== null && amount !== "") {
      refundBody.amount = amountToSubunit(amount);
    }

    const { response, data } = await callPaystack("/refund", {
      method: "POST",
      body: JSON.stringify(refundBody)
    });

    if (!response.ok || !data.status) {
      return res.status(response.status || 502).json({
        success: false,
        message: data.message || "Refund request failed",
        paystack: data
      });
    }

    return res.json({
      success: true,
      message: "Refund request sent to Paystack",
      data: data.data,
      paystack: data
    });
  } catch (error) {
    console.error("Paystack refund error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Refund request failed"
    });
  }
});

function shouldStartServer() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (shouldStartServer()) {
  app.listen(getServerPort(), () => {
    console.log(`Server running on http://localhost:${getServerPort()}`);
  });
}
