import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

export function createApp({ fetchFn = globalThis.fetch } = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.post("/api/paystack/initialize", async (req, res) => {
    try {
      const { email, amount, orderId } = req.body;

      if (!email || amount === undefined || amount === null || !orderId) {
        return res.status(400).json({
          status: false,
          message: "Email, amount, and orderId are required"
        });
      }

      const response = await fetchFn(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            amount: amount * 100,
            currency: "ZAR",
            metadata: {
              orderId
            },
            callback_url: `${process.env.FRONTEND_URL}/payment_success.html`
          })
        }
      );

      const data = await response.json();

      return res.json(data);
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

      const response = await fetchFn(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const data = await response.json();

      return res.json(data);
    } catch (error) {
      console.error("Paystack verify error:", error);

      return res.status(500).json({
        status: false,
        message: "Payment verification failed"
      });
    }
  });

  return app;
}

const app = createApp();

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { app };