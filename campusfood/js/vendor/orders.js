import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

let vendorOrders = [];
let vendorReviews = [];

const STATUS_ORDER = {
  'Order Placed': 1,
  'Being Prepared': 2,
  'Ready for Collection': 3,
  'Completed': 4,
  'Cancelled': 5
};

function sortOrdersByStatus(orders) {
  return [...orders].sort((a, b) => {
    const statusA = STATUS_ORDER[a.status] ?? 999;
    const statusB = STATUS_ORDER[b.status] ?? 999;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();

    return dateB - dateA;
  });
}

function findReviewForOrder(order) {
  return vendorReviews.find(
    review => String(review.order_id) === String(order.id)
  ) || null;
}

function renderStars(rating = 0) {
  const safeRating = Number(rating) || 0;
  const full = '★'.repeat(safeRating);
  const empty = '☆'.repeat(5 - safeRating);
  return `${full}${empty}`;
}

function openReviewModal(orderId) {
  const order = vendorOrders.find(o => String(o.id) === String(orderId));
  const review = vendorReviews.find(r => String(r.order_id) === String(orderId));

  if (!order || !review) return;

  const orderNumberEl = document.getElementById('reviewModalOrderNumber');
  const studentEl = document.getElementById('reviewModalStudent');
  const ratingEl = document.getElementById('reviewModalRating');
  const textEl = document.getElementById('reviewModalText');
  const itemsEl = document.getElementById('reviewModalItems');

  const itemsText = Array.isArray(order.items)
    ? order.items.map(i => i.name || i.title || 'Item').join(', ')
    : (order.items || '');

  if (orderNumberEl) {
    orderNumberEl.textContent = `#${order.order_number || order.id}`;
  }

  if (studentEl) {
    studentEl.textContent = order.student_username || 'Unknown';
  }

  if (ratingEl) {
    ratingEl.textContent = `${renderStars(review.rating)} (${review.rating}/5)`;
  }

  if (textEl) {
    textEl.textContent = review.review_text?.trim() || 'No written comment.';
  }

  if (itemsEl) {
    itemsEl.textContent = itemsText || 'No items';
  }

  const modal = document.getElementById('vendorReviewModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeReviewModal() {
  const modal = document.getElementById('vendorReviewModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function renderOrders() {
  const container = document.getElementById('ordersBody');
  if (!container) return;

  if (!vendorOrders.length) {
    container.innerHTML = "<tr><td colspan='7'>No orders yet</td></tr>";
    return;
  }

  const sortedOrders = sortOrdersByStatus(vendorOrders);

  container.innerHTML = sortedOrders.map(order => {
    const itemsText = Array.isArray(order.items)
      ? order.items.map(i => i.name || i.title || 'Item').join(', ')
      : (order.items || '');

    const review = findReviewForOrder(order);
    const isLocked =
      order.status === 'Completed' ||
      order.status === 'Cancelled';

    const reviewCell = review
      ? `
        <button class="btn btn-sm btn-primary" onclick="openVendorReviewModal('${order.id}')">
          View Review
        </button>
      `
      : '<span style="color: var(--text-muted);">-</span>';

    const actionCell = isLocked
      ? `
        <span class="status ${
          order.status === 'Cancelled'
            ? 'status-cancelled'
            : 'status-completed'
        }">
          ${order.status}
        </span>
      `
      : `
        <select onchange="updateOrderStatus('${order.id}', this.value)">
          <option value="Order Placed" ${order.status === 'Order Placed' ? 'selected' : ''}>Order Placed</option>
          <option value="Being Prepared" ${order.status === 'Being Prepared' ? 'selected' : ''}>Being Prepared</option>
          <option value="Ready for Collection" ${order.status === 'Ready for Collection' ? 'selected' : ''}>Ready for Collection</option>
          <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      `;

    return `
      <tr data-order-id="${order.id}">
        <td>#${order.order_number || order.id}</td>
        <td>${order.student_username || 'Unknown'}</td>
        <td>${itemsText}</td>
        <td>R${order.total_price ?? 0}</td>
        <td>${order.status || ''}</td>
        <td>${actionCell}</td>
        <td>${reviewCell}</td>
      </tr>
    `;
  }).join('');
}

export async function loadVendorOrders() {
  const container = document.getElementById('ordersBody');
  if (!container) return;

  const username = sessionStorage.getItem('username');
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    container.innerHTML = "<tr><td colspan='7'>Vendor not found</td></tr>";
    return;
  }

  const { data: ordersData, error: ordersError } = await sb
    .from('orders')
    .select('*')
    .eq('vendor_id', vendorId);

  if (ordersError) {
    console.error('Vendor orders load error:', ordersError);
    container.innerHTML = "<tr><td colspan='7'>Failed to load orders</td></tr>";
    return;
  }

  const { data: reviewsData, error: reviewsError } = await sb
    .from('reviews')
    .select('*')
    .eq('vendor_id', vendorId);

  if (reviewsError) {
    console.error('Vendor reviews load error:', reviewsError);
    toast('Could not load reviews', 'error');
  }

  vendorOrders = ordersData || [];
  vendorReviews = reviewsData || [];

  renderOrders();
}

export async function updateOrderStatus(orderId, newStatus) {
  const order = vendorOrders.find(o => String(o.id) === String(orderId));

  if (!order) {
    toast('Order not found', 'error');
    return;
  }

  if (order.status === 'Completed' || order.status === 'Cancelled') {
    toast('This order is locked and cannot be changed', 'error');
    return;
  }

  const currentRank = STATUS_ORDER[order.status] ?? 999;
  const newRank = STATUS_ORDER[newStatus] ?? 999;

  if (newRank < currentRank) {
    toast('Order status cannot move backward', 'error');
    await loadVendorOrders();
    return;
  }

  const { error } = await sb
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('Update order status error:', error);
    toast(error.message || 'Failed to update order', 'error');
    return;
  }

  toast('Order updated');
  await loadVendorOrders();
}

window.openVendorReviewModal = openReviewModal;
window.closeVendorReviewModal = closeReviewModal;
