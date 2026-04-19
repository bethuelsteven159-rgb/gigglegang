import { sb } from '../config/supabase.js';
import { getStudentId } from '../shared/auth-helpers.js';
import { toast } from '../shared/notifications.js';

let ordersChannel = null;

export async function loadStudentOrderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  const username = sessionStorage.getItem('username');
  const studentId = await getStudentId(username);

  if (!studentId) {
    tbody.innerHTML = "<tr><td colspan='6'>Student not found</td></tr>";
    return;
  }

  subscribeToOrderUpdates(studentId);

  const { data, error } = await sb
    .from('orders')
    .select('*, vendors(username)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = "<tr><td colspan='6'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6'>No orders yet</td></tr>";
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.vendors?.username || 'Unknown'}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(', ') : ''}</td>
      <td>R${order.total_price}</td>
      <td>${order.status}</td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

export function subscribeToOrderUpdates(studentId) {
  if (ordersChannel) {
    sb.removeChannel(ordersChannel);
  }

  ordersChannel = sb
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `student_id=eq.${studentId}`
      },
      (payload) => {
        const newStatus = payload.new.status;

        toast(`Order update: ${newStatus}`);

        if (Notification.permission === 'granted') {
          new Notification('Order Update', {
            body: `Your order is now: ${newStatus}`
          });
        }

        loadStudentOrderHistory();
      }
    )
    .subscribe();
}
