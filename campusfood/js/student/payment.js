const API_BASE_URL = 'http://localhost:5000';

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: 'Server returned an invalid response'
    };
  }
}

export async function startPaystackPayment({ email, amount, orderId }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paystack/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount,
        orderId
      })
    });

    const data = await readJson(response);

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      console.error('Paystack initialize failed:', data);
      alert(data.message || 'Payment could not start. Please try again.');
      return;
    }

    window.location.href = data.data.authorization_url;
  } catch (error) {
    console.error('Payment error:', error);
    alert('Something went wrong while starting payment.');
  }
}

export async function verifyPaystackReference(reference) {
  const response = await fetch(
    `${API_BASE_URL}/api/paystack/verify/${encodeURIComponent(reference)}`
  );

  return await readJson(response);
}

export async function requestPaystackRefund({
  orderId,
  paymentId,
  paymentReference,
  amount,
  reason
}) {
  const transaction = paymentReference || paymentId;

  if (!transaction) {
    throw new Error('Payment reference is missing. Please contact support.');
  }

  const response = await fetch(`${API_BASE_URL}/api/paystack/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderId,
      paymentId: transaction,
      amount,
      reason
    })
  });

  const data = await readJson(response);

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Refund request failed');
  }

  return data;
}
