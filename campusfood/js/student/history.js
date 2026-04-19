import { sb } from '../config/supabase.js';
import { getStudentId } from '../shared/auth-helpers.js';

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

let ordersChannel = null;

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

  const { data, error } = await sb
    .from('orders')
    .select('*, vendors(username)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Student history load error:', error);
    tbody.innerHTML = "<tr><td colspan='7'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7'>No orders yet</td></tr>";
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr data-order-id="${order.id}">
      <td>#${order.order_number || order.id}</td>
      <td>${order.vendors?.username || 'Unknown'}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name || i.title || 'Item').join(', ') : ''}</td>
      <td>R${order.total_price ?? 0}</td>
      <td class="order-status">${order.status || ''}</td>
      <td>${order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</td>
      <td>-</td>
    </tr>
  `).join('');
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
      (payload) => {
        const oldOrder = payload.old;
        const newOrder = payload.new;

        if (!oldOrder || !newOrder) return;

        if (oldOrder.status === newOrder.status) return;

        const message = `Order #${newOrder.order_number || newOrder.id} is now: ${newOrder.status}`;

        showToast(message);

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Order Update', {
            body: message
          });
        }

        loadStudentOrderHistory();
      }
    )
    .subscribe((status) => {
      console.log('Student order realtime status:', status);
    });
}

export function initStudentHistoryPage() {
  console.log('initStudentHistoryPage is running');
  loadStudentOrderHistory();
}




