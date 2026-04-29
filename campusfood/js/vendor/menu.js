import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

let editingItemId = null;

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
      <div style="font-weight:bold">${escapeHtml(item.name)}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="display: block; margin: 10px auto; width: 180px; height: 180px; object-fit: cover; border-radius: 10px;" />` : ''}
      <div>${escapeHtml(item.description || '')}</div>
      <div>R${item.price}</div>
      <div>Status: ${item.status}</div>
      
      <!-- Allergen Badges Display -->
      <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin: 0.5rem 0;">
        ${item.contains_peanuts ? '<span class="allergen-badge peanut">🥜 Peanuts</span>' : ''}
        ${item.contains_tree_nuts ? '<span class="allergen-badge tree-nuts">🌰 Tree Nuts</span>' : ''}
        ${item.contains_dairy ? '<span class="allergen-badge dairy">🥛 Dairy</span>' : ''}
        ${item.contains_eggs ? '<span class="allergen-badge eggs">🥚 Eggs</span>' : ''}
        ${item.contains_soy ? '<span class="allergen-badge soy">🌱 Soy</span>' : ''}
        ${item.contains_fish ? '<span class="allergen-badge fish">🐟 Fish</span>' : ''}
        ${item.contains_shellfish ? '<span class="allergen-badge shellfish">🦐 Shellfish</span>' : ''}
        ${item.contains_gluten ? '<span class="allergen-badge gluten">🌾 Gluten</span>' : ''}
        ${item.is_halal ? '<span class="dietary-badge halal">✓ Halal</span>' : ''}
        ${item.is_vegan ? '<span class="dietary-badge vegan">✓ Vegan</span>' : ''}
        ${item.is_vegetarian ? '<span class="dietary-badge vegetarian">✓ Vegetarian</span>' : ''}
        ${item.is_gluten_free ? '<span class="dietary-badge gluten-free">✓ Gluten-Free</span>' : ''}
      </div>
      
      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
        <button class="btn btn-sm btn-primary" onclick="openEditModal(${item.id})">✏️ Edit</button>
        <button class="btn btn-sm" onclick="toggleSoldOut(${item.id}, ${item.status === 'sold_out'})">
          ${item.status === 'sold_out' ? 'Mark Available' : 'Mark Sold Out'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteMenuItem(${item.id})">Delete</button>
      </div>
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

  if (price < 0) {
    toast('Price cannot be negative', 'error');
    return;
  }

  const vendorId = await getVendorId(username);
  if (!vendorId) {
    toast('Vendor not found', 'error');
    return;
  }

  let imageUrl = null;

  if (file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast('Please upload a valid image (JPEG, PNG, GIF, or WEBP)', 'error');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast('Image must be less than 2MB', 'error');
      return;
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    const { error: uploadError } = await sb.storage.from('menu_images').upload(fileName, file);
    if (uploadError) {
      console.error(uploadError);
      toast('Image upload failed', 'error');
      return;
    }

    const { data: urlData } = sb.storage.from('menu_images').getPublicUrl(fileName);
    imageUrl = urlData.publicUrl;
  }

  // Get allergen checkbox values
  const allergenData = {
    contains_peanuts: document.getElementById('containsPeanuts')?.checked || false,
    contains_tree_nuts: document.getElementById('containsTreeNuts')?.checked || false,
    contains_dairy: document.getElementById('containsDairy')?.checked || false,
    contains_eggs: document.getElementById('containsEggs')?.checked || false,
    contains_soy: document.getElementById('containsSoy')?.checked || false,
    contains_fish: document.getElementById('containsFish')?.checked || false,
    contains_shellfish: document.getElementById('containsShellfish')?.checked || false,
    contains_gluten: document.getElementById('containsGluten')?.checked || false,
    is_halal: document.getElementById('isHalal')?.checked || false,
    is_vegan: document.getElementById('isVegan')?.checked || false,
    is_vegetarian: document.getElementById('isVegetarian')?.checked || false,
    is_gluten_free: document.getElementById('isGlutenFree')?.checked || false
  };

  const { error } = await sb.from('menu').insert([{
    vendor_id: vendorId,
    name,
    price,
    description,
    image_url: imageUrl,
    status: 'available',
    ...allergenData
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
    document.querySelectorAll('#containsPeanuts, #containsTreeNuts, #containsDairy, #containsEggs, #containsSoy, #containsFish, #containsShellfish, #containsGluten, #isHalal, #isVegan, #isVegetarian, #isGlutenFree').forEach(cb => cb.checked = false);
    loadVendorMenu();
  }
}

export async function toggleSoldOut(itemId, currentlySoldOut) {
  const newStatus = currentlySoldOut ? 'available' : 'sold_out';
  const { error } = await sb.from('menu').update({ status: newStatus }).eq('id', itemId);
  if (error) {
    toast('Update failed', 'error');
  } else {
    toast('Item updated');
    loadVendorMenu();
  }
}

export async function deleteMenuItem(itemId) {
  if (!confirm('Delete this item?')) return;
  const { error } = await sb.from('menu').delete().eq('id', itemId);
  if (error) {
    toast('Delete failed', 'error');
  } else {
    toast('Item deleted');
    loadVendorMenu();
  }
}

// Edit functions
async function openEditModal(itemId) {
  editingItemId = itemId;
  const { data, error } = await sb.from('menu').select('*').eq('id', itemId).single();
  if (error) { toast('Failed to load item', 'error'); return; }

  document.getElementById('editItemName').value = data.name;
  document.getElementById('editItemPrice').value = data.price;
  document.getElementById('editItemDescription').value = data.description || '';
  document.getElementById('editContainsPeanuts').checked = data.contains_peanuts || false;
  document.getElementById('editContainsTreeNuts').checked = data.contains_tree_nuts || false;
  document.getElementById('editContainsDairy').checked = data.contains_dairy || false;
  document.getElementById('editContainsEggs').checked = data.contains_eggs || false;
  document.getElementById('editContainsSoy').checked = data.contains_soy || false;
  document.getElementById('editContainsFish').checked = data.contains_fish || false;
  document.getElementById('editContainsShellfish').checked = data.contains_shellfish || false;
  document.getElementById('editContainsGluten').checked = data.contains_gluten || false;
  document.getElementById('editIsHalal').checked = data.is_halal || false;
  document.getElementById('editIsVegan').checked = data.is_vegan || false;
  document.getElementById('editIsVegetarian').checked = data.is_vegetarian || false;
  document.getElementById('editIsGlutenFree').checked = data.is_gluten_free || false;

  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  editingItemId = null;
  document.getElementById('editModal').style.display = 'none';
}

async function saveEdit() {
  if (!editingItemId) return;

  const updates = {
    name: document.getElementById('editItemName').value.trim(),
    price: parseFloat(document.getElementById('editItemPrice').value),
    description: document.getElementById('editItemDescription').value.trim(),
    contains_peanuts: document.getElementById('editContainsPeanuts').checked,
    contains_tree_nuts: document.getElementById('editContainsTreeNuts').checked,
    contains_dairy: document.getElementById('editContainsDairy').checked,
    contains_eggs: document.getElementById('editContainsEggs').checked,
    contains_soy: document.getElementById('editContainsSoy').checked,
    contains_fish: document.getElementById('editContainsFish').checked,
    contains_shellfish: document.getElementById('editContainsShellfish').checked,
    contains_gluten: document.getElementById('editContainsGluten').checked,
    is_halal: document.getElementById('editIsHalal').checked,
    is_vegan: document.getElementById('editIsVegan').checked,
    is_vegetarian: document.getElementById('editIsVegetarian').checked,
    is_gluten_free: document.getElementById('editIsGlutenFree').checked
  };

  if (!updates.name || updates.price <= 0) {
    toast('Please enter valid name and price', 'error');
    return;
  }

  const { error } = await sb.from('menu').update(updates).eq('id', editingItemId);
  if (error) { toast('Failed to update item', 'error'); }
  else { toast('Item updated successfully'); closeEditModal(); loadVendorMenu(); }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

window.toggleSoldOut = toggleSoldOut;
window.deleteMenuItem = deleteMenuItem;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;
