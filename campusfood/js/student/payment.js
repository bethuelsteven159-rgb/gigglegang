const LOCAL_API_BASE_URL = "http://localhost:5000";
const LIVE_API_BASE_URL = "https://YOUR-BACKEND-URL-HERE";

function isLocalFrontend() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function getPaymentApiBaseUrl() {
  if (isLocalFrontend()) {
    return LOCAL_API_BASE_URL;
  }

  return LIVE_API_BASE_URL;
}

function isLiveApiConfigured(apiBaseUrl) {
  return !apiBaseUrl.includes("YOUR-BACKEND-URL-HERE");
}

export async function startPaystackPayment({
  email,
  amount,
  orderId,
  redirect = (url) => {
    window.location.href = url;
  }
}) {
  try {
    const apiBaseUrl = getPaymentApiBaseUrl();

    if (!isLocalFrontend() && !isLiveApiConfigured(apiBaseUrl)) {
      console.error("Live backend URL is not configured in payment.js");
      alert("Payment backend is not configured for the live website yet.");
      return;
    }

    const response = await fetch(`${apiBaseUrl}/api/paystack/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount,
        orderId
      })
    });

    const data = await response.json();

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      console.error("Paystack initialize failed:", data);
      alert("Payment could not start. Please try again.");
      return;
    }

    redirect(data.data.authorization_url);
  } catch (error) {
    console.error("Payment error:", error);
    alert("Something went wrong while starting payment.");
  }
}

export async function verifyPaystackReference(reference) {
  const apiBaseUrl = getPaymentApiBaseUrl();

  if (!reference) {
    throw new Error("Payment reference is required");
  }

  if (!isLocalFrontend() && !isLiveApiConfigured(apiBaseUrl)) {
    throw new Error("Live backend URL is not configured in payment.js");
  }

  const response = await fetch(
    `${apiBaseUrl}/api/paystack/verify/${encodeURIComponent(reference)}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Payment verification failed");
  }

  return data;
}
