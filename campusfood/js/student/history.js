import { sb } from '../config/supabase.js';
import { getStudentId } from '../shared/auth-helpers.js';

let orders = [];
let reviews = [];
let currentOrder = null;
let currentReview = null;
let rating = 0;
let ordersChannel = null;

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 50);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function canReviewOrder(order) {
  const status = normalizeStatus(order.status);
  return status === 'completed' || status === 'delivered';
}

function getOrderMenuId(order) {
  if (order?.menu_id) return order.menu_id;

  if (Array.isArray(order?.items) && order.items.length > 0) {
    const firstItem = order.items[0];
    return firstItem?.menu_id || firstItem?.id || null;
  }

  return null;
}

function findReviewForOrder(order) {
  const menuId = getOrderMenuId(order);
  if (menuId == null) return null;

  return reviews.find(
    r =>
      String(r.vendor_id) === String(order.vendor_id) &&
      String(r.menu_id) === String(menuId)
  ) || null;
}
function updateStars(value) {
  document.querySelectorAll('.star').forEach(star => {
    star.textContent = Number(star.dataset.value) <= value ? '★' : '☆';
  });
}

function bindEvents() {
  document.addEventListener('click', e => {
    if (e.target.classList.contains('reviewBtn') || e.target.classList.contains('editBtn')) {
      openModal(e.target.dataset.id);
    }

    if (e.target.classList.contains('star')) {
      rating = parseInt(e.target.dataset.value, 10);
      updateStars(rating);
    }

    if (e.target.classList.contains('tag')) {
      const box = document.getElementById('reviewText');
      if (!box) return;

      const text = e.target.textContent.trim();

      if (!box.value.includes(text)) {
        box.value += (box.value ? ', ' : '') + text;
      }

      e.target.classList.toggle('active');
    }
  });
}

function render() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = "<tr><td colspan='7'>No orders yet</td></tr>";
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const review = findReviewForOrder(order);

    const itemsText = Array.isArray(order.items)
      ? order.items.map(i => i.name || i.title || 'Item').join(', ')
      : '';

    const reviewCell = review
      ? `<button data-id="${order.id}" class="editBtn btn btn-sm">Edit Review</button>`
      : canReviewOrder(order)
        ? `<button data-id="${order.id}" class="reviewBtn btn btn-sm btn-primary">Review</button>`
        : 'Locked';

    return `
      <tr data-order-id="${order.id}">
        <td>#${order.order_number || order.id}</td>
        <td>${order.vendors?.username || 'Unknown'}</td>
        <td>${itemsText}</td>
        <td>R${order.total_price ?? 0}</td>
        <td class="order-status">${order.status || ''}</td>
        <td>${order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</td>
        <td>${reviewCell}</td>
      </tr>
    `;
  }).join('');
}

export async function loadStudentOrderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  const username = sessionStorage.getItem('username');
  const studentId = await getStudentId(username);

  if (!studentId) {
    tbody.innerHTML = "<tr><td colspan='7'>Student not found</td></tr>";
    return;
  }

  subscribeToOrderUpdates(studentId);

  const { data: orderData, error: ordersError } = await sb
    .from('orders')
    .select('*, vendors(username)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Student history load error:', ordersError);
    tbody.innerHTML = "<tr><td colspan='7'>Failed to load orders</td></tr>";
    return;
  }

  const { data: reviewData, error: reviewsError } = await sb
    .from('reviews')
    .select('*')
    .eq('student_id', studentId);

  if (reviewsError) {
    console.error('Student reviews load error:', reviewsError);
  }

  orders = orderData || [];
  reviews = reviewData || [];

  render();
}

export function subscribeToOrderUpdates(studentId) {
  if (!studentId) return;

  if (ordersChannel) {
    sb.removeChannel(ordersChannel);
  }

  ordersChannel = sb
    .channel(`orders-realtime-${studentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `student_id=eq.${studentId}`
      },
      payload => {
        const oldOrder = payload.old;
        const newOrder = payload.new;

        if (!oldOrder || !newOrder) return;
        if (oldOrder.status === newOrder.status) return;

        const message = `Order #${newOrder.order_number || newOrder.id} is now: ${newOrder.status}`;

        showToast(message);

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Order Update', { body: message });
        }

        loadStudentOrderHistory();
      }
    )
    .subscribe(status => {
      console.log('Student order realtime status:', status);
    });
}

export function openModal(id) {
  currentOrder = orders.find(order => String(order.id) === String(id));
  if (!currentOrder) return;

  currentReview = findReviewForOrder(currentOrder);
  rating = currentReview?.rating || 0;

  const reviewText = document.getElementById('reviewText');
  if (reviewText) {
    reviewText.value = currentReview?.review_text || '';
  }

  document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('active'));
  updateStars(rating);

  const modal = document.getElementById('reviewModal');
  if (modal) modal.style.display = 'flex';
}

export function closeModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.style.display = 'none';

  currentOrder = null;
  currentReview = null;
  rating = 0;
}

export async function submitReview() {
  const username = sessionStorage.getItem('username');
  const studentId = await getStudentId(username);

  if (!studentId || !currentOrder) {
    showToast('Could not submit review');
    return;
  }

  if (!canReviewOrder(currentOrder)) {
    showToast('You can only review completed orders');
    return;
  }

  if (rating < 1 || rating > 5) {
    showToast('Please choose a rating');
    return;
  }

  const reviewTextEl = document.getElementById('reviewText');
  const text = reviewTextEl ? reviewTextEl.value.trim() : '';
  const menuId = getOrderMenuId(currentOrder);

  if (currentReview?.id) {
    const { error } = await sb
      .from('reviews')
      .update({
        rating,
        review_text: text
      })
      .eq('id', currentReview.id);

    if (error) {
      console.error('submitReview update error:', error);
      showToast('Failed to update review');
      return;
    }

    showToast('Review updated');
  } else {
    const { error } = await sb
      .from('reviews')
      .insert([{
        student_id: studentId,
        vendor_id: currentOrder.vendor_id,
        menu_id: menuId,
        rating,
        review_text: text,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('submitReview insert error:', error);
      showToast('Failed to submit review');
      return;
    }

    showToast('Review submitted');
  }

  closeModal();
  await loadStudentOrderHistory();
}

export async function deleteReview() {
  if (!currentReview?.id) {
    showToast('No review found');
    return;
  }

  const { error } = await sb
    .from('reviews')
    .delete()
    .eq('id', currentReview.id);

  if (error) {
    console.error('deleteReview error:', error);
    showToast('Failed to delete review');
    return;
  }

  showToast('Review deleted');
  closeModal();
  await loadStudentOrderHistory();
}

export function initStudentHistoryPage() {
  bindEvents();
  loadStudentOrderHistory();
}
