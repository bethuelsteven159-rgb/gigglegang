import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';

export async function loadVendors() {
  const tbody = document.getElementById('vendorBody');
  if (!tbody) return;

  const { data, error } = await sb
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:red;">Failed to load</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No vendors yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(v => `
    <tr>
      <td>${v.username}</td>
      <td>${v.status}</td>
      <td style="display:flex; gap:0.5rem;">
        ${v.status !== 'approved'
          ? `<button onclick="updateVendorStatus('${v.id}', 'approved')">Approve</button>`
          : `<button onclick="updateVendorStatus('${v.id}', 'suspended')">Suspend</button>`
        }
        <button onclick="deleteVendor('${v.id}')">Remove</button>
      </td>
    </tr>
  `).join('');
}

export async function updateVendorStatus(vendorId, status) {
  const { error } = await sb
    .from('vendors')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', vendorId);

  if (error) {
    toast('Update failed', 'error');
  } else {
    toast(`Vendor ${status}`);
    loadVendors();
  }
}

export async function deleteVendor(vendorId) {
  if (!confirm('Remove this vendor?')) return;

  const { error } = await sb
    .from('vendors')
    .delete()
    .eq('id', vendorId);

  if (error) {
    toast('Delete failed', 'error');
  } else {
    toast('Vendor removed');
    loadVendors();
  }
}

/*
  Only keep this if you really use the "Add Vendor Account" form
  in admin_vendor_control.html.
*/
export async function createVendor() {
  const input = document.getElementById('newVendor');
  const username = input?.value.trim();

  if (!username) {
    toast('Enter a vendor username', 'error');
    return;
  }

  const { error } = await sb
    .from('vendors')
    .insert([{
      username,
      status: 'pending'
    }]);

  if (error) {
    console.error('Create vendor error:', error);
    toast('Failed to create vendor', 'error');
    return;
  }

  toast('Vendor added successfully');
  input.value = '';
  loadVendors();
}
