import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[BACKEND HIT] ${req.method} ${req.url}`);
  next();
});

app.post("/api/paystack/initialize", async (req, res) => {
  try {
    const { email, amount, orderId } = req.body;

    if (!email || !amount || !orderId) {
      return res.status(400).json({
        status: false,
        message: "Email, amount, and orderId are required"
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        status: false,
        message: "PAYSTACK_SECRET_KEY is missing in .env"
      });
    }

    if (!process.env.FRONTEND_URL) {
      return res.status(500).json({
        status: false,
        message: "FRONTEND_URL is missing in .env"
      });
    }

    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
    const paystackCallbackUrl = `${frontendUrl}/payment_success.html`;

    const paystackAmount = Math.round(Number(amount) * 100);

    if (!Number.isFinite(paystackAmount) || paystackAmount <= 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid payment amount"
      });
    }

    console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
    console.log("Paystack callback URL:", paystackCallbackUrl);
    console.log("Paystack amount:", paystackAmount);

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: paystackAmount,
        currency: "ZAR",
        metadata: {
          orderId
        },
        callback_url: paystackCallbackUrl
      })
    });

    const data = await response.json();

    console.log("Paystack initialize response:", data);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Paystack initialize error:", error);

    return res.status(500).json({
      status: false,
      message: "Payment initialization failed"
    });
  }
});

app.get("/api/paystack/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        status: false,
        message: "Payment reference is required"
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        status: false,
        message: "PAYSTACK_SECRET_KEY is missing in .env"
      });
    }

    console.log("Verifying Paystack reference:", reference);

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

    console.log("Paystack verify response:", data);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Paystack verify error:", error);

    return res.status(500).json({
      status: false,
      message: "Payment verification failed"
    });
  }
});


app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "Campus Food Paystack backend is running"
  });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});