import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

export async function loadVendorMenu() {
  const container = document.getElementById('vendorMenu');
  if (!container) return;

  const username = sessionStorage.getItem('username');
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    container.innerHTML = '<p>Vendor not found</p>';
    return;
  }

  const { data, error } = await sb
    .from('menu')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = '<p>Failed to load menu</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No items yet.</p>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="menu-item">
      <div style="font-weight:bold">${item.name}</div>
      ${item.image_url ? `
        <img src="${item.image_url}" style="display: block; margin: 10px auto; width: 180px; height: 180px; object-fit: cover; border-radius: 10px;" />
      ` : ''}
      <div>${item.description || ''}</div>
      <div>R${item.price}</div>
      <div>${item.status}</div>
      <button onclick="toggleSoldOut(${item.id}, ${item.status === 'sold_out'})">
        ${item.status === 'sold_out' ? 'Mark Available' : 'Mark Sold Out'}
      </button>
      <button onclick="deleteMenuItem(${item.id})">Delete</button>
    </div>
  `).join('');
}

export async function addMenuItem() {
  const nameEl = document.getElementById('itemName');
  const priceEl = document.getElementById('itemPrice');
  const descEl = document.getElementById('itemDescription');
  const imageEl = document.getElementById('itemImage');

  const name = nameEl?.value.trim();
  const price = Number(priceEl?.value);
  const description = descEl?.value.trim();
  const file = imageEl?.files[0];

  const username = sessionStorage.getItem('username');

  if (!name || !price || !description) {
    toast('Fill in all fields', 'error');
    return;
  }

  const vendorId = await getVendorId(username);
  if (!vendorId) {
    toast('Vendor not found', 'error');
    return;
  }

  let imageUrl = null;

  if (file) {
    const fileName = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await sb
      .storage
      .from('menu_images')
      .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      toast('Image upload failed', 'error');
      return;
    }

    const { data: urlData } = sb
      .storage
      .from('menu_images')
      .getPublicUrl(fileName);

    imageUrl = urlData.publicUrl;
  }

  const { error } = await sb
    .from('menu')
    .insert([{
      vendor_id: vendorId,
      name,
      price,
      description,
      image_url: imageUrl,
      status: 'available'
    }]);

  if (error) {
    console.error(error);
    toast('Failed to add item', 'error');
  } else {
    toast('Item added successfully');
    nameEl.value = '';
    priceEl.value = '';
    descEl.value = '';
    imageEl.value = '';
    loadVendorMenu();
  }
}

export async function toggleSoldOut(itemId, currentlySoldOut) {
  const newStatus = currentlySoldOut ? 'available' : 'sold_out';

  const { error } = await sb
    .from('menu')
    .update({ status: newStatus })
    .eq('id', itemId);

  if (error) {
    toast('Update failed', 'error');
  } else {
    toast('Item updated');
    loadVendorMenu();
  }
}

export async function deleteMenuItem(itemId) {
  if (!confirm('Delete this item?')) return;

  const { error } = await sb
    .from('menu')
    .delete()
    .eq('id', itemId);

  if (error) {
    toast('Delete failed', 'error');
  } else {
    toast('Item deleted');
    loadVendorMenu();
  }
}
