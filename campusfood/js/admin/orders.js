import { sb } from '../config/supabase.js';

export async function loadAllOrders() {
  const tbody = document.getElementById('allOrdersBody');
  if (!tbody) return;

  const { data, error } = await sb
    .from('orders')
    .select('*, vendors(username)')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = "<tr><td colspan='7'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7'>No orders yet</td></tr>";
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.vendors?.username || 'Unknown'}</td>
      <td>${order.student_username}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(', ') : ''}</td>
      <td>R${order.total_price}</td>
      <td>${order.status}</td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}
