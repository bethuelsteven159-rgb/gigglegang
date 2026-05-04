import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getCart, setCart } from './cart.js';
import { startPaystackPayment, verifyPaystackReference } from './payment.js';
const PENDING_ORDER_KEY = 'pending_paystack_order';

async function buildOrderDataFromCart() {
  const cart = getCart();

  if (cart.length === 0) {
    toast('Your cart is empty', 'error');
    return null;
  }

  const username = sessionStorage.getItem('username');

  if (!username) {
    toast('Please login again', 'error');
    return null;
  }

  const { data: { user }, error: userError } = await sb.auth.getUser();

  if (userError || !user) {
    toast('Please login again', 'error');
    return null;
  }

  let studentId = sessionStorage.getItem('studentId');

  if (!studentId) {
    const { data: existingStudent } = await sb
      .from('students')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingStudent) {
      studentId = existingStudent.id;
      sessionStorage.setItem('studentId', studentId);
    } else {
      const { data: newStudent, error: createError } = await sb
        .from('students')
        .insert([{
          id: user.id,
          username,
          email: user.email
        }])
        .select()
        .maybeSingle();

      if (createError) {
        console.error('Create student error:', createError);
        toast('Failed to create student profile: ' + createError.message, 'error');
        return null;
      }

      studentId = newStudent.id;
      sessionStorage.setItem('studentId', studentId);
    }
  }

  if (!studentId) {
    toast('Student not found. Please login again.', 'error');
    return null;
  }

  const vendorIds = [...new Set(cart.map(item => item.vendor_id))];

  if (vendorIds.length > 1) {
    toast('Please order from one vendor at a time', 'error');
    return null;
  }

  const vendorId = vendorIds[0];

  const { data: vendorCheck, error: vendorError } = await sb
    .from('vendors')
    .select('id, username, status')
    .eq('id', vendorId)
    .maybeSingle();

  if (vendorError) {
    console.error('Vendor query error:', vendorError);
    toast('Error checking vendor', 'error');
    return null;
  }

  if (!vendorCheck) {
    toast('Vendor not found. Please try again.', 'error');
    return null;
  }

  if (vendorCheck.status !== 'approved') {
    toast('This vendor is not available at the moment', 'error');
    return null;
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    order_number: orderNumber,
    student_id: studentId,
    student_username: username,
    student_email: user.email,
    vendor_id: vendorId,
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price
    })),
    total_price: totalPrice,
    status: 'Order Placed',
    created_at: new Date().toISOString()
  };
}

export async function placeOrder() {
  console.log("🔥 PAYSTACK VERSION OF placeOrder IS RUNNING");
  const orderData = await buildOrderDataFromCart();

  if (!orderData) {
    return;
  }

  sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(orderData));

  await startPaystackPayment({
    email: orderData.student_email,
    amount: orderData.total_price,
    orderId: orderData.order_number
  });
}

export async function completePaidOrderAfterPayment() {
  const statusText = document.getElementById('paymentStatus');
  const continueBtn = document.getElementById('continueBtn');

  const params = new URLSearchParams(window.location.search);
  const reference = params.get('reference');

  if (!reference) {
    statusText.textContent = 'No payment reference found.';
    return;
  }

  const pendingOrderRaw = sessionStorage.getItem(PENDING_ORDER_KEY);

  if (!pendingOrderRaw) {
    statusText.textContent = 'No pending order found. Please place the order again.';
    return;
  }

  const orderData = JSON.parse(pendingOrderRaw);

  try {
    statusText.textContent = 'Verifying your payment...';

    const paymentData = await verifyPaystackReference(reference);

    if (!paymentData.status || paymentData.data?.status !== 'success') {
      console.error('Payment verification failed:', paymentData);
      statusText.textContent = 'Payment was not successful.';
      return;
    }

    const expectedAmount = Math.round(Number(orderData.total_price) * 100);
    const paidAmount = Number(paymentData.data.amount);

    if (paidAmount !== expectedAmount) {
      console.error('Payment amount mismatch:', {
        expectedAmount,
        paidAmount
      });

      statusText.textContent = 'Payment amount mismatch. Please contact support.';
      return;
    }

    const { error: insertError } = await sb
      .from('orders')
      .insert([orderData]);

    if (insertError) {
      console.error('Order insertion error:', insertError);
      statusText.textContent = 'Payment succeeded, but order creation failed.';
      return;
    }

    sessionStorage.removeItem(PENDING_ORDER_KEY);
    sessionStorage.removeItem('cart');
    setCart([]);

    statusText.textContent = 'Payment successful. Your order has been placed.';
    continueBtn.hidden = false;
  } catch (error) {
    console.error('Payment completion error:', error);
    statusText.textContent = 'Could not verify payment. Please try again.';
  }
}