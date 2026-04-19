import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

export async function loadVendorOrders() {
  const container = document.getElementById('ordersBody');
  if (!container) return;

  const username = sessionStorage.getItem('username');
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    container.innerHTML = "<tr><td colspan='6'>Vendor not found</td></tr>";
    return;
  }

  const { data, error } = await sb
    .from('orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = "<tr><td colspan='6'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<tr><td colspan='6'>No orders yet</td></tr>";
    return;
  }

  container.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.student_username || 'Unknown'}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(', ') : ''}</td>
      <td>R${order.total_price}</td>
      <td>${order.status}</td>
      <td>
        <select onchange="updateOrderStatus('${order.id}', this.value)">
          <option value="Order Placed" ${order.status === 'Order Placed' ? 'selected' : ''}>Order Placed</option>
          <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
          <option value="Ready" ${order.status === 'Ready' ? 'selected' : ''}>Ready</option>
          <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      </td>
    </tr>
  `).join('');
}

export async function updateOrderStatus(orderId, newStatus) {
  const { error } = await sb
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    console.error(error);
    toast('Failed to update order', 'error');
  } else {
    toast('Order updated');
    loadVendorOrders();
  }
}
