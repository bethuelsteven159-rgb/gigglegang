import { sb } from '../config/supabase.js';

let orders = [];
let reviews = [];
let currentOrder = null;
let currentReview = null;
let rating = 0;
let ordersChannel = null;

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 50);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function showBrowserNotification(title, message) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body: message,
    icon: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png'
  });
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function canReviewOrder(order) {
  const status = normalizeStatus(order.status);
  return status === 'completed' || status === 'delivered';
}

function getOrderMenuId(order) {
  if (order?.menu_id != null) return order.menu_id;

  if (Array.isArray(order?.items) && order.items.length === 1) {
    const item = order.items[0];
    return item?.menu_id || item?.id || null;
  }

  return null;
}

function findReviewForOrder(order) {
  return reviews.find(
    review => String(review.order_id) === String(order.id)
  ) || null;
}

function updateStars(value) {
  document.querySelectorAll('.star').forEach(star => {
    star.textContent = Number(star.dataset.value) <= value ? '★' : '☆';
  });
}

async function getCurrentStudentId() {
  const {
    data: { user },
    error
  } = await sb.auth.getUser();

  if (error || !user) {
    console.error('Could not get logged in user:', error);
    return null;
  }

  return user.id;
}

function bindEvents() {
  document.addEventListener('click', e => {
    if (
      e.target.classList.contains('reviewBtn') ||
      e.target.classList.contains('editBtn')
    ) {
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

  const studentId = await getCurrentStudentId();

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

        const orderLabel = `Order #${newOrder.order_number || newOrder.id}`;
        const newStatus = newOrder.status || 'Updated';

        let toastMessage = `${orderLabel} is now: ${newStatus}`;
        let toastType = 'info';
        let notificationTitle = 'Order Update';
        let notificationBody = toastMessage;

        if (newStatus === 'Being Prepared') {
          toastMessage = `${orderLabel} is now being prepared 🍳`;
          toastType = 'info';
          notificationTitle = 'Order Being Prepared';
          notificationBody = toastMessage;
        }

        if (newStatus === 'Ready for Collection') {
          toastMessage = `${orderLabel} is ready for collection 🛍️`;
          toastType = 'success';
          notificationTitle = 'Order Ready';
          notificationBody = toastMessage;
        }

        if (newStatus === 'Completed') {
          toastMessage = `${orderLabel} has been completed ✅`;
          toastType = 'success';
          notificationTitle = 'Order Completed';
          notificationBody = `${orderLabel} is complete. You can now leave a review.`;
        }

        showToast(toastMessage, toastType);
        showBrowserNotification(notificationTitle, notificationBody);

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

  document.querySelectorAll('.tag').forEach(tag => {
    tag.classList.remove('active');
  });

  const orderNumberEl = document.getElementById('reviewOrderNumber');
  const vendorNameEl = document.getElementById('reviewVendorName');
  const itemsEl = document.getElementById('reviewItems');
  const totalEl = document.getElementById('reviewTotal');
  const orderInfoEl = document.getElementById('reviewOrderInfo');

  const itemsText = Array.isArray(currentOrder.items)
    ? currentOrder.items.map(i => i.name || i.title || 'Item').join(', ')
    : '';

  if (orderNumberEl) {
    orderNumberEl.textContent = `#${currentOrder.order_number || currentOrder.id}`;
  }

  if (vendorNameEl) {
    vendorNameEl.textContent = currentOrder.vendors?.username || 'Unknown vendor';
  }

  if (itemsEl) {
    itemsEl.textContent = itemsText || 'No items';
  }

  if (totalEl) {
    totalEl.textContent = `R${currentOrder.total_price ?? 0}`;
  }

  if (orderInfoEl) {
    orderInfoEl.textContent = currentReview
      ? 'You are editing your review for this order'
      : 'You are reviewing this completed order';
  }

  updateStars(rating);

  const modal = document.getElementById('reviewModal');
  if (modal) modal.style.display = 'flex';
}

export function closeModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.style.display = 'none';

  const reviewText = document.getElementById('reviewText');
  if (reviewText) reviewText.value = '';

  document.querySelectorAll('.tag').forEach(tag => {
    tag.classList.remove('active');
  });

  currentOrder = null;
  currentReview = null;
  rating = 0;
}

export async function submitReview() {
  const studentId = await getCurrentStudentId();

  if (!studentId || !currentOrder) {
    showToast('Could not submit review', 'error');
    return;
  }

  if (!canReviewOrder(currentOrder)) {
    showToast('You can only review completed orders', 'error');
    return;
  }

  if (rating < 1 || rating > 5) {
    showToast('Please choose a rating', 'error');
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
      showToast('Failed to update review', 'error');
      return;
    }

    showToast('Review updated', 'success');
  } else {
    const { error } = await sb
      .from('reviews')
      .insert([{
        order_id: currentOrder.id,
        student_id: studentId,
        vendor_id: currentOrder.vendor_id,
        menu_id: menuId,
        rating,
        review_text: text,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('submitReview insert error:', error);
      showToast('Failed to submit review', 'error');
      return;
    }

    showToast('Review submitted', 'success');
  }

  closeModal();
  await loadStudentOrderHistory();
}

export async function deleteReview() {
  if (!currentReview?.id) {
    showToast('No review found', 'error');
    return;
  }

  const { error } = await sb
    .from('reviews')
    .delete()
    .eq('id', currentReview.id);

  if (error) {
    console.error('deleteReview error:', error);
    showToast('Failed to delete review', 'error');
    return;
  }

  showToast('Review deleted', 'success');
  closeModal();
  await loadStudentOrderHistory();
}

export function initStudentHistoryPage() {
  bindEvents();
  loadStudentOrderHistory();
}
