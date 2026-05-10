import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { requestPaystackRefund } from './payment.js';

let dashboardOrdersChannel = null;
let dashboardRefreshInterval = null;

let activeOrders = [];
let topVendors = [];

/* ======================================================
   STUDENT NAME
====================================================== */

export function renderStudentName() {

  const username =
    sessionStorage.getItem('username') || 'Student';

  const name =
    document.getElementById('studentName');

  const welcome =
    document.getElementById('studentNameWelcome');

  if (name) {
    name.textContent = username;
  }

  if (welcome) {
    welcome.textContent = username;
  }
}

/* ======================================================
   CURRENT STUDENT
====================================================== */

async function getCurrentStudentId() {

  const {
    data: { user },
    error
  } = await sb.auth.getUser();

  if (error || !user) {

    console.error(
      'Could not get logged in student:',
      error
    );

    return null;
  }

  return user.id;
}

/* ======================================================
   STATUS HELPERS
====================================================== */

function normalizeStatus(status) {

  return String(status || '')
    .trim()
    .toLowerCase();
}

function normalizeRefundStatus(status) {

  return String(status || 'none')
    .trim()
    .toLowerCase();
}

function isActiveOrder(order) {

  const status =
    normalizeStatus(order?.status);

  return (
    status !== 'completed' &&
    status !== 'cancelled'
  );
}

function getStatusClass(status) {

  const value =
    normalizeStatus(status);

  if (value === 'order placed') {
    return 'status-pending';
  }

  if (value === 'being prepared') {
    return 'status-confirmed';
  }

  if (value === 'ready for collection') {
    return 'status-approved';
  }

  if (value === 'completed') {
    return 'status-completed';
  }

  if (value === 'cancelled') {
    return 'status-cancelled';
  }

  return 'status-pending';
}

function getRefundStatusClass(status) {

  const value =
    normalizeRefundStatus(status);

  if (value === 'refunded' || value === 'processed') {
    return 'status-completed';
  }

  if (
    value === 'refund_requested' ||
    value === 'requested' ||
    value === 'pending' ||
    value === 'processing'
  ) {
    return 'status-confirmed';
  }

  if (value === 'failed') {

  if (value === 'completed') {
    return 'status-completed';
  }

  if (value === 'cancelled') {
    return 'status-cancelled';
  }

  return 'status-pending';
}

function getRefundStatusLabel(status) {

  const value =
    normalizeRefundStatus(status);

  if (!value || value === 'none' || value === 'null') {
    return '';
  }

  if (
    value === 'refund_requested' ||
    value === 'requested' ||
    value === 'pending'
  ) {
    return 'Refund requested';
  }

  if (value === 'processing') {
    return 'Refund processing';
  }

  if (value === 'processed' || value === 'refunded') {
    return 'Refunded';
  }

  if (value === 'failed') {
    return 'Refund failed';
  }

  return value.replace(/_/g, ' ');
}

function isRefundBusy(order) {

  const refundStatus =
    normalizeRefundStatus(order?.refund_status);

  return [
    'processing',
    'refund_requested',
    'requested',
    'pending',
    'refunded',
    'processed'
  ].includes(refundStatus);
}

function canCancelOrder(order) {

  const status =
    normalizeStatus(order?.status);

  return (
    (
      status === 'order placed' ||
      status === 'being prepared'
    ) &&
    !isRefundBusy(order)
  );
}

function getPaymentReference(order) {

  return (
    order?.payment_id ||
    order?.payment_reference ||
    order?.paystack_reference ||
    ''
  );
}

function getFinalRefundStatus(refundResponse) {

  const paystackStatus =
    normalizeRefundStatus(refundResponse?.data?.status);

  if (
    paystackStatus === 'processed' ||
    paystackStatus === 'refunded'
  ) {
    return 'refunded';
  }

  return 'refund_requested';
}

function setOrderRefundStatus(orderId, refundStatus) {

  activeOrders = activeOrders.map(order => (
    String(order.id) === String(orderId)
      ? { ...order, refund_status: refundStatus }
      : order
  ));
}

    status === 'order placed' ||
    status === 'being prepared'
  );
}

/* ======================================================
   TIME FORMATTER
====================================================== */

function formatElapsedTime(createdAt) {

  if (!createdAt) {
    return 'Unknown time';
  }

  const now = Date.now();

  const created =
    new Date(createdAt).getTime();

  const diffMs =
    Math.max(0, now - created);

  const minutes =
    Math.floor(diffMs / 60000);

  const hours =
    Math.floor(minutes / 60);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  if (hours < 24) {
    return `${hours} hr ${minutes % 60} min ago`;
  }

  const days =
    Math.floor(hours / 24);

  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/* ======================================================
   LIVE ORDERS RENDER
====================================================== */

function renderLiveOrders() {

  const container =
    document.getElementById(
      'liveOrdersContainer'
    );

  if (!container) {
    return;
  }

  if (!activeOrders.length) {

    container.innerHTML = `
      <p class="live-orders-empty">
        You have no active orders right now.
      </p>
    `;

    return;
  }

  container.innerHTML =
    activeOrders.map(order => {

      const itemsText =
        Array.isArray(order.items)
          ? order.items
              .map(
                i => i.name || i.title || 'Item'
              )
              .join(', ')
          : '';

      const refundLabel =
        getRefundStatusLabel(order.refund_status);

      const refundBadge =
        refundLabel
          ? `
            <span class="status ${getRefundStatusClass(order.refund_status)}">
              ${refundLabel}
            </span>
          `
          : '';

      const cancelButton =
        canCancelOrder(order)
          ? `
            <button
              class="btn btn-danger btn-sm"
              onclick="cancelStudentOrder('${order.id}')"
            >
              Cancel Order
            </button>
          `
          : isRefundBusy(order)
            ? `
              <button class="btn btn-sm" disabled>
                Refund in progress
              </button>
            `
            : '';
          : '';

      return `
        <div class="live-order-card">

          <div class="live-order-top">

            <div>

              <div class="live-order-number">
                Order #${order.order_number || order.id}
              </div>

              <div class="live-order-vendor">
                Vendor:
                ${order.vendors?.username || 'Unknown vendor'}
              </div>

            </div>

            <div class="live-order-statuses">
              <span class="status ${getStatusClass(order.status)}">
                ${order.status || 'Unknown'}
              </span>
              ${refundBadge}
            </div>

          </div>

          <div class="live-order-items">
            ${itemsText || 'No items listed'}
          </div>

          <div class="live-order-meta">

            <span class="status ${getStatusClass(order.status)}">
              ${order.status || 'Unknown'}
            </span>

          </div>

          <div class="live-order-items">
            ${itemsText || 'No items listed'}
          </div>

          <div class="live-order-meta">

            <span>
              <strong>Total:</strong>
              R${order.total_price ?? 0}
            </span>

            <span>
              <strong>Ordered:</strong>
              ${formatElapsedTime(order.created_at)}
            </span>

          </div>

          <div class="live-order-actions">
            ${cancelButton}
          </div>

        </div>
      `;
    }).join('');
}

/* ======================================================
   LOAD LIVE ORDERS
====================================================== */

async function loadLiveOrders() {

  const container =
    document.getElementById(
      'liveOrdersContainer'
    );

  if (!container) {
    return;
  }

  const studentId =
    await getCurrentStudentId();

  if (!studentId) {

    container.innerHTML = `
      <p class="live-orders-empty">
        Could not find logged in student.
      </p>
    `;

    return;
  }

  const { data, error } = await sb
    .from('orders')
    .select('*, vendors(username)')
    .eq('student_id', studentId)
    .order('created_at', {
      ascending: false
    });

  if (error) {

    console.error(
      'Load live orders error:',
      error
    );

    container.innerHTML = `
      <p class="live-orders-empty">
        Failed to load live orders.
      </p>
    `;

    return;
  }

  activeOrders =
    (data || []).filter(isActiveOrder);

  renderLiveOrders();
}

/* ======================================================
   LOAD TOP VENDORS
====================================================== */

async function loadTopVendors() {

  const container =
    document.getElementById(
      'topVendorsContainer'
    );

  if (!container) {
    return;
  }

  const { data, error } = await sb
    .from('reviews')
    .select(`
      vendor_id,
      rating,
      vendors (
        username
      )
    `);

  if (error) {

    console.error(
      'Top vendors error:',
      error
    );

    container.innerHTML = `
      <p class="top-vendors-empty">
        Failed to load top vendors.
      </p>
    `;

    return;
  }

  if (!data || !data.length) {

    container.innerHTML = `
      <p class="top-vendors-empty">
        No ratings available yet.
      </p>
    `;

    return;
  }

  const vendorMap = {};

  data.forEach(review => {

    const vendorId = review.vendor_id;

    if (!vendorMap[vendorId]) {

      vendorMap[vendorId] = {
        vendor_id: vendorId,
        username:
          review.vendors?.username ||
          'Unknown Vendor',
        totalRating: 0,
        reviewCount: 0
      };
    }

    vendorMap[vendorId].totalRating +=
      Number(review.rating || 0);

    vendorMap[vendorId].reviewCount += 1;
  });

  const rankedVendors =
    Object.values(vendorMap)
      .map(vendor => {

        const averageRating =
          vendor.totalRating /
          vendor.reviewCount;

        return {
          ...vendor,
          averageRating
        };
      })
      .sort(
        (a, b) =>
          b.averageRating - a.averageRating
      )
      .slice(0, 3);

  topVendors = rankedVendors;

  container.innerHTML =
    topVendors.map((vendor, index) => {

      let medal = '🥉';

      if (index === 0) {
        medal = '🥇';
      }

      if (index === 1) {
        medal = '🥈';
      }

      return `
        <div class="top-vendor-card">

          <div class="top-vendor-rank">
            ${medal}
          </div>

          <div class="top-vendor-info">

            <div class="top-vendor-name">
              ${vendor.username}
            </div>

            <div class="top-vendor-rating">
              ⭐ ${vendor.averageRating.toFixed(1)}
              •
              ${vendor.reviewCount}
              review${vendor.reviewCount === 1 ? '' : 's'}
            </div>

          </div>

        </div>
      `;
    }).join('');
}

/* ======================================================
   REALTIME ORDERS
====================================================== */

function subscribeToDashboardOrders(studentId) {

  if (!studentId) {
    return;
  }

  if (dashboardOrdersChannel) {
    sb.removeChannel(dashboardOrdersChannel);
  }

  dashboardOrdersChannel = sb
    .channel(
      `student-dashboard-orders-${studentId}`
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `student_id=eq.${studentId}`
      },
      async payload => {

        const newOrder = payload.new;
        const oldOrder = payload.old;

        if (
          payload.eventType === 'UPDATE' &&
          newOrder &&
          oldOrder
        ) {

          if (
            newOrder.status !== oldOrder.status ||
            newOrder.refund_status !== oldOrder.refund_status
          ) {

            let message =
              `Order #${newOrder.order_number || newOrder.id} is now ${newOrder.status}`;

            if (
              newOrder.status === 'Completed'
            ) {
              message =
                `Order #${newOrder.order_number || newOrder.id} is completed ✅`;
            }

            else if (
              newOrder.status ===
              'Ready for Collection'
            ) {
              message =
                `Order #${newOrder.order_number || newOrder.id} is ready for collection 🛍️`;
            }

            else if (
              newOrder.status ===
              'Being Prepared'
            ) {
              message =
                `Order #${newOrder.order_number || newOrder.id} is being prepared 🍳`;
            }

            else if (
              newOrder.status ===
              'Cancelled'
            ) {

              const refundLabel =
                getRefundStatusLabel(newOrder.refund_status);

              message = refundLabel
                ? `Order #${newOrder.order_number || newOrder.id} was cancelled. ${refundLabel}.`
                : `Order #${newOrder.order_number || newOrder.id} was cancelled`;
            }

            toast(message, 'success');
          }
        }

        await loadLiveOrders();
      }
    )
    .subscribe(status => {
      console.log(
        'Student dashboard realtime status:',
        status
      );
    });
}

/* ======================================================
   CANCEL ORDER
====================================================== */

export async function cancelStudentOrder(orderId) {

  const order =
    activeOrders.find(
      o => String(o.id) === String(orderId)
    );

  if (!order) {
    toast('Order not found', 'error');
    return;
  }

  if (!canCancelOrder(order)) {
    toast(
      'This order can no longer be cancelled',
      'error'
    );

    return;
  }

  const paymentId =
    getPaymentReference(order);

  if (!paymentId) {
    toast(
      'Payment reference is missing. Please contact support before cancelling.',
  const studentId =
    await getCurrentStudentId();

  if (!studentId) {

    toast(
      'Could not find logged in student',
      'error'
    );

    return;
  }

  const studentId =
    await getCurrentStudentId();

  if (!studentId) {

    toast(
      'Could not find logged in student',
      'error'
    );

    return;
  }

  const shouldCancel =
    typeof window.confirm === 'function'
      ? window.confirm(
          'Cancel this order and request a refund?'
        )
      : true;

  if (!shouldCancel) {
    return;
  }

  console.log(
    'Cancelling order with refund:',
    orderId,
    'for student:',
    studentId
  );

  setOrderRefundStatus(orderId, 'processing');
  renderLiveOrders();

  try {

    const refundResponse =
      await requestPaystackRefund({
        orderId,
        paymentId,
        amount: order.total_price,
        reason:
          `Cancelled order ${order.order_number || order.id}`
      });

    const finalRefundStatus =
      getFinalRefundStatus(refundResponse);

    const { data, error } = await sb
      .from('orders')
      .update({
        status: 'Cancelled',
        refund_status: finalRefundStatus,
        updated_at:
          new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('student_id', studentId)
      .in('status', [
        'Order Placed',
        'Being Prepared'
      ])
      .select();

    if (error) {

      console.error(
        'Cancel order database update error:',
        error
      );

      toast(
        'Refund was requested, but the order could not be marked cancelled. Contact support.',
        'error'
      );

      await loadLiveOrders();
      return;
    }

    if (!data || data.length === 0) {

      toast(
        'Refund was requested, but this order may have already changed. Contact support.',
        'error'
      );

      await loadLiveOrders();
      return;
    }

    activeOrders =
      activeOrders.filter(
        o => String(o.id) !== String(orderId)
      );

    renderLiveOrders();

    toast(
      finalRefundStatus === 'refunded'
        ? 'Order cancelled and refund processed'
        : 'Order cancelled and refund requested',
      'success'
    );

    await loadLiveOrders();
  }

  catch (error) {

    console.error(
      'Cancel order refund error:',
      error
    );

    await sb
      .from('orders')
      .update({
        refund_status: 'failed',
        updated_at:
          new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('student_id', studentId)
      .in('status', [
        'Order Placed',
        'Being Prepared'
      ]);

    toast(
      error.message ||
      'Refund request failed. Order was not cancelled.',
      'error'
    );

    await loadLiveOrders();
  }
}

/* ======================================================
   INIT
====================================================== */

export async function initStudentDashboardLiveOrders() {

  const studentId =
    await getCurrentStudentId();

  if (!studentId) {
    return;
  }

  await loadLiveOrders();

  await loadTopVendors();

  subscribeToDashboardOrders(studentId);

  if (dashboardRefreshInterval) {
    clearInterval(
      dashboardRefreshInterval
    );
  }

  dashboardRefreshInterval =
    setInterval(() => {
      renderLiveOrders();
    }, 60000);

  window.cancelStudentOrder =
    cancelStudentOrder;
}
