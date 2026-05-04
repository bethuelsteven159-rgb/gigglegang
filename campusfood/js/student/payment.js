import { API_BASE_URL } from "../config/api.js";
export async function startPaystackPayment({ email, amount, orderId }) {
  try {
    const callbackUrl = new URL("payment_success.html", window.location.href).href;

    console.log("Paystack callback URL:", callbackUrl);

    const response = await fetch(`${API_BASE_URL}/api/paystack/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount,
        orderId,
        callbackUrl
      })
    });

    const data = await response.json();

    if (!data.status || !data.data?.authorization_url) {
      console.error("Paystack initialize failed:", data);
      alert("Payment could not start. Please try again.");
      return;
    }

    window.location.href = data.data.authorization_url;
  } catch (error) {
    console.error("Payment error:", error);
    alert("Something went wrong while starting payment.");
  }
}

export async function verifyPaystackReference(reference) {
  const response = await fetch(`${API_BASE_URL}/api/paystack/verify/${reference}`);

  return await response.json();
}