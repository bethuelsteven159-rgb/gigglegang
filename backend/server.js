import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

function cleanUrl(url) {
  return url ? url.replace(/\/$/, "") : "";
}

function getOriginFromUrl(url) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

const FRONTEND_URL = cleanUrl(
  process.env.FRONTEND_URL || "http://127.0.0.1:5500"
);

const allowedOrigins = new Set([
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  getOriginFromUrl(FRONTEND_URL),
  process.env.FRONTEND_ORIGIN
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  return res.json({
    success: true,
    message: "Payment API is healthy"
  });
});

app.post("/api/paystack/initialize", async (req, res) => {
  try {
    const { email, amount, orderId } = req.body;

    if (!email || !amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Email, amount, and orderId are required"
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured"
      });
    }

    const amountInCents = Math.round(Number(amount) * 100);

    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid positive number"
      });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: amountInCents,
        currency: "ZAR",
        metadata: {
          orderId
        },
        callback_url: `${FRONTEND_URL}/payment_success.html`
      })
    });

    const data = await response.json();

    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    console.error("Paystack initialize error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment initialization failed"
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

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured"
      });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = await response.json();

    return res.status(response.ok ? 200 : response.status).json(data);
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
    const { orderId, paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required"
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured"
      });
    }

    const refundBody = {
      transaction: paymentId
    };

    const amountInCents = amount === undefined || amount === null || amount === ""
      ? null
      : Math.round(Number(amount) * 100);

    if (amountInCents !== null) {
      if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a valid positive number"
        });
      }

      refundBody.amount = amountInCents;
    }

    if (reason) {
      refundBody.customer_note = reason;
      refundBody.merchant_note = orderId
        ? `${reason} | Order: ${orderId}`
        : reason;
    }

    const response = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(refundBody)
    });

    const data = await response.json();

    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    console.error("Paystack refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Refund request failed"
    });
  }
});

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
