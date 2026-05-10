
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

      <div>
  <strong>Allergens:</strong>
  ${item.allergens && item.allergens.length > 0
    ? item.allergens.join(', ')
    : 'None'}
</div>

<div>
  <strong>Dietary:</strong>
  ${item.dietary && item.dietary.length > 0
    ? item.dietary.join(', ')
    : 'None'}
</div>

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

  const allergenCheckboxes = document.querySelectorAll('.allergen-checkbox:checked');
  const dietaryCheckboxes = document.querySelectorAll('.dietary-checkbox:checked');

   const allergens = Array.from(allergenCheckboxes).map(cb => cb.value);
  const dietary = Array.from(dietaryCheckboxes).map(cb => cb.value);

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
      status: 'available',
        allergens: allergens,
      dietary: dietary
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

      document.querySelectorAll('.allergen-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.dietary-checkbox').forEach(cb => cb.checked = false);

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
