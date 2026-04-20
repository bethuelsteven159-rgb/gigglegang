import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';

let dashboardOrdersChannel = null;
let dashboardRefreshInterval = null;
let activeOrders = [];

export function renderStudentName() {
  const username = sessionStorage.getItem('username') || 'Student';
  const name = document.getElementById('studentName');
  const welcome = document.getElementById('studentNameWelcome');

  if (name) name.textContent = username;
  if (welcome) welcome.textContent = username;
}

async function getCurrentStudentId() {
  const {
    data: { user },
    error
  } = await sb.auth.getUser();

  if (error || !user) {
    console.error('Could not get logged in student:', error);
    return null;
  }

  return user.id;
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function isActiveOrder(order) {
  const status = normalizeStatus(order?.status);
  return status !== 'completed' && status !== 'cancelled';
}

function formatElapsedTime(createdAt) {
  if (!createdAt) return 'Unknown time';

  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = Math.max(0, now - created);

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ${minutes % 60} min ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getStatusClass(status) {
  const value = normalizeStatus(status);

  if (value === 'order placed') return 'status-pending';
  if (value === 'being prepared') return 'status-confirmed';
  if (value === 'ready for collection') return 'status-approved';
  if (value === 'completed') return 'status-completed';
  if (value === 'cancelled') return 'status-cancelled';

  return 'status-pending';
}

function canCancelOrder(order) {
  const status = normalizeStatus(order?.status);
  return status === 'order placed' || status === 'being prepared';
}

function renderLiveOrders() {
  const container = document.getElementById('liveOrdersContainer');
  if (!container) return;

  if (!activeOrders.length) {
    container.innerHTML = `
      <p class="live-orders-empty">
        You have no active orders right now.
      </p>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(order => {
    const itemsText = Array.isArray(order.items)
      ? order.items.map(i => i.name || i.title || 'Item').join(', ')
      : '';

    const cancelButton = canCancelOrder(order)
      ? `
        <button class="btn btn-danger btn-sm" onclick="cancelStudentOrder('${order.id}')">
          Cancel Order
        </button>
      `
      : '';

    return `
      <div class="live-order-card">
        <div class="live-order-top">
          <div>
            <div class="live-order-number">Order #${order.order_number || order.id}</div>
            <div class="live-order-vendor">Vendor: ${order.vendors?.username || 'Unknown vendor'}</div>
          </div>
          <span class="status ${getStatusClass(order.status)}">${order.status || 'Unknown'}</span>
        </div>

        <div class="live-order-items">${itemsText || 'No items listed'}</div>

        <div class="live-order-meta">
          <span><strong>Total:</strong> R${order.total_price ?? 0}</span>
          <span><strong>Ordered:</strong> ${formatElapsedTime(order.created_at)}</span>
        </div>

        <div class="live-order-actions">
          ${cancelButton}
        </div>
      </div>
    `;
  }).join('');
}

async function loadLiveOrders() {
  const container = document.getElementById('liveOrdersContainer');
  if (!container) return;

  const studentId = await getCurrentStudentId();

  if (!studentId) {
    container.innerHTML = `
      <p class="live-orders-empty">Could not find logged in student.</p>
    `;
    return;
  }

  const { data, error } = await sb
    .from('orders')
    .select('*, vendors(username)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load live orders error:', error);
    container.innerHTML = `
      <p class="live-orders-empty">Failed to load live orders.</p>
    `;
    return;
  }

  activeOrders = (data || []).filter(isActiveOrder);
  console.log('All dashboard orders from DB:', data);
  console.log('Filtered active orders:', (data || []).filter(isActiveOrder));
  renderLiveOrders();
}

function subscribeToDashboardOrders(studentId) {
  if (!studentId) return;

  if (dashboardOrdersChannel) {
    sb.removeChannel(dashboardOrdersChannel);
  }

  dashboardOrdersChannel = sb
    .channel(`student-dashboard-orders-${studentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `student_id=eq.${studentId}`
      },
      async (payload) => {
        const newOrder = payload.new;
        const oldOrder = payload.old;

        if (payload.eventType === 'UPDATE' && newOrder && oldOrder) {
          if (newOrder.status !== oldOrder.status) {
            let message = `Order #${newOrder.order_number || newOrder.id} is now ${newOrder.status}`;

            if (newOrder.status === 'Completed') {
              message = `Order #${newOrder.order_number || newOrder.id} is completed ✅`;
            } else if (newOrder.status === 'Ready for Collection') {
              message = `Order #${newOrder.order_number || newOrder.id} is ready for collection 🛍️`;
            } else if (newOrder.status === 'Being Prepared') {
              message = `Order #${newOrder.order_number || newOrder.id} is being prepared 🍳`;
            } else if (newOrder.status === 'Cancelled') {
              message = `Order #${newOrder.order_number || newOrder.id} was cancelled`;
            }

            toast(message, 'success');
          }
        }
        await loadLiveOrders();
      }
    )
    .subscribe((status) => {
      console.log('Student dashboard realtime status:', status);
    });
}

export async function cancelStudentOrder(orderId) {
  const order = activeOrders.find(o => String(o.id) === String(orderId));

  if (!order) {
    toast('Order not found', 'error');
    return;
  }

  if (!canCancelOrder(order)) {
    toast('This order can no longer be cancelled', 'error');
    return;
  }

  const studentId = await getCurrentStudentId();
  if (!studentId) {
    toast('Could not find logged in student', 'error');
    return;
  }

  console.log('Cancelling order:', orderId, 'for student:', studentId);

  const { data, error } = await sb
    .from('orders')
    .update({
      status: 'Cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('student_id', studentId)
    .in('status', ['Order Placed', 'Being Prepared'])
    .select();

  if (error) {
    console.error('Cancel order error:', error);
    toast('Failed to cancel order', 'error');
    return;
  }

  console.log('Cancel result from DB:', data);

  if (!data || data.length === 0) {
    toast('Could not cancel order. It may be blocked by permissions or already changed.', 'error');
    return;
  }

  activeOrders = activeOrders.filter(o => String(o.id) !== String(orderId));
  renderLiveOrders();

  toast('Order cancelled');
  await loadLiveOrders();
}

export async function initStudentDashboardLiveOrders() {
  const studentId = await getCurrentStudentId();
  if (!studentId) return;

  await loadLiveOrders();
  subscribeToDashboardOrders(studentId);

  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
  }

  dashboardRefreshInterval = setInterval(() => {
    renderLiveOrders();
  }, 60000);

  window.cancelStudentOrder = cancelStudentOrder;
}
