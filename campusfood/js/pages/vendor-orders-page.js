import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

export async function initVendorOrdersPage() {
  await loadVendorOrders();

  const vendorNameEl = document.getElementById('vendorName');
  const vendorLabelEl = document.getElementById('vendorLabel');
  const username = sessionStorage.getItem('username') || 'Vendor';

  if (vendorNameEl) vendorNameEl.textContent = username;
  if (vendorLabelEl) vendorLabelEl.textContent = username;

  window.updateOrderStatus = updateOrderStatus;
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

  const { data, error } = await sb
    .from('orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Vendor orders load error:', error);
    container.innerHTML = "<tr><td colspan='7'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<tr><td colspan='7'>No orders yet</td></tr>";
    return;
  }

  container.innerHTML = data.map(order => {
    const itemsText = Array.isArray(order.items)
      ? order.items.map(i => i.name || i.title || 'Item').join(', ')
      : order.items || '';

    return `
      <tr data-order-id="${order.id}">
        <td>#${order.order_number || order.id}</td>
        <td>${order.student_username || 'Unknown'}</td>
        <td>${itemsText}</td>
        <td>R${order.total_price ?? 0}</td>
        <td>${order.status || ''}</td>
        <td>
          <select onchange="updateOrderStatus('${order.id}', this.value)">
            <option value="Order Placed" ${order.status === 'Order Placed' ? 'selected' : ''}>Order Placed</option>
            <option value="Being Prepared" ${order.status === 'Being Prepared' ? 'selected' : ''}>Being Prepared</option>
            <option value="Ready for Collection" ${order.status === 'Ready for Collection' ? 'selected' : ''}>Ready for Collection</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td>${order.reviewed ? 'Reviewed' : '-'}</td>
      </tr>
    `;
  }).join('');
}

export async function updateOrderStatus(orderId, newStatus) {
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
