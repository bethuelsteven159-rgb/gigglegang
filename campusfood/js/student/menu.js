import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

let currentEditItemId = null;

const ALLERGENS = [
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜', addId: 'containsPeanuts', editId: 'editContainsPeanuts' },
  { id: 'gluten', label: 'Gluten', emoji: '🌾', addId: 'containsGluten', editId: 'editContainsGluten' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛', addId: 'containsDairy', editId: 'editContainsDairy' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚', addId: 'containsEggs', editId: 'editContainsEggs' },
  { id: 'soy', label: 'Soy', emoji: '🌱', addId: 'containsSoy', editId: 'editContainsSoy' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐', addId: 'containsShellfish', editId: 'editContainsShellfish' }
];

const DIETARY_LABELS = [
  { id: 'halal', label: 'Halal', addId: 'isHalal', editId: 'editIsHalal' },
  { id: 'vegetarian', label: 'Vegetarian', addId: 'isVegetarian', editId: 'editIsVegetarian' },
  { id: 'vegan', label: 'Vegan', addId: 'isVegan', editId: 'editIsVegan' }
];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isChecked(id) {
  return Boolean(document.getElementById(id)?.checked);
}

function setChecked(id, checked) {
  const checkbox = document.getElementById(id);
  if (checkbox) checkbox.checked = checked;
}

function collectCheckedItems(items, key) {
  return items
    .filter(item => isChecked(item[key]))
    .map(item => item.id);
}

function setCheckboxesFromValues(items, key, values = []) {
  const selected = Array.isArray(values) ? values : [];
  items.forEach(item => setChecked(item[key], selected.includes(item.id)));
}

function renderBadges(item) {
  const allergenBadges = (Array.isArray(item.allergens) ? item.allergens : [])
    .map(allergen => {
      const meta = ALLERGENS.find(entry => entry.id === allergen);
      const label = meta ? `${meta.emoji} ${meta.label}` : allergen;
      return `<span class="badge badge-warning">${escapeHtml(label)}</span>`;
    });

  const dietaryBadges = (Array.isArray(item.dietary_labels) ? item.dietary_labels : [])
    .map(label => {
      const meta = DIETARY_LABELS.find(entry => entry.id === label);
      const text = meta ? `✓ ${meta.label}` : `✓ ${label}`;
      return `<span class="badge badge-success">${escapeHtml(text)}</span>`;
    });

  const badges = [...allergenBadges, ...dietaryBadges];

  if (badges.length === 0) return '';

  return `<div class="menu-badges">${badges.join('')}</div>`;
}

export async function loadVendorMenu() {
  const container = document.getElementById('vendorMenu');
  if (!container) return;

  container.innerHTML = '<p>Loading...</p>';

  const username = sessionStorage.getItem('username');
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    container.innerHTML = '<p>Vendor not found</p>';
    return;
  }

  const query = sb
    .from('menu')
    .select('*')
    .eq('vendor_id', vendorId);

  const { data, error } = typeof query.order === 'function'
    ? await query.order('created_at', { ascending: true })
    : await query;

  if (error) {
    console.error(error);
    container.innerHTML = '<p>Failed to load menu</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No items yet.</p>';
    return;
  }

  container.innerHTML = data.map(item => {
    const soldOut = item.status === 'sold_out';

    return `
      <div class="menu-item ${soldOut ? 'sold-out' : ''}">
        <div style="font-weight:bold">${escapeHtml(item.name)}</div>
        ${item.image_url ? `
          <img
            src="${escapeHtml(item.image_url)}"
            alt="${escapeHtml(item.name)}"
            style="display:block;margin:10px auto;width:180px;height:180px;object-fit:cover;border-radius:10px;"
          />
        ` : ''}
        <div>${escapeHtml(item.description || '')}</div>
        <div>R${escapeHtml(item.price)}</div>
        <div>${soldOut ? 'Sold out' : 'Available'}</div>
        ${renderBadges(item)}
        <button onclick="toggleSoldOut(${item.id}, ${soldOut})">
          ${soldOut ? 'Mark Available' : 'Mark Sold Out'}
        </button>
        <button onclick="openEditModal(${item.id})">Edit</button>
        <button onclick="deleteMenuItem(${item.id})">Delete</button>
      </div>
    `;
  }).join('');
}

export async function addMenuItem() {
  const nameEl = document.getElementById('itemName');
  const priceEl = document.getElementById('itemPrice');
  const descEl = document.getElementById('itemDescription');
  const imageEl = document.getElementById('itemImage');

  const name = nameEl?.value.trim();
  const price = Number(priceEl?.value);
  const description = descEl?.value.trim();
  const file = imageEl?.files?.[0];

  if (!name || !price || !description) {
    toast('Fill in all fields', 'error');
    return;
  }

  const username = sessionStorage.getItem('username');
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

    imageUrl = urlData?.publicUrl || null;
  }

  const allergens = collectCheckedItems(ALLERGENS, 'addId');
  const dietaryLabels = collectCheckedItems(DIETARY_LABELS, 'addId');

  const { error } = await sb
    .from('menu')
    .insert([{
      vendor_id: vendorId,
      name,
      price,
      description,
      image_url: imageUrl,
      status: 'available',
      allergens,
      dietary_labels: dietaryLabels
    }]);

  if (error) {
    console.error(error);
    toast('Failed to add item', 'error');
    return;
  }

  toast('Item added successfully');

  if (nameEl) nameEl.value = '';
  if (priceEl) priceEl.value = '';
  if (descEl) descEl.value = '';
  if (imageEl) imageEl.value = '';
  ALLERGENS.forEach(item => setChecked(item.addId, false));
  DIETARY_LABELS.forEach(item => setChecked(item.addId, false));

  await loadVendorMenu();
}

export async function toggleSoldOut(id, isSoldOut) {
  const newStatus = isSoldOut ? 'available' : 'sold_out';

  const { error } = await sb
    .from('menu')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    console.error(error);
    toast('Update failed', 'error');
    return;
  }

  toast('Item updated');
  await loadVendorMenu();
}

export async function deleteMenuItem(id) {
  if (!confirm('Delete this item?')) return;

  const { error } = await sb
    .from('menu')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    toast('Delete failed', 'error');
    return;
  }

  toast('Item deleted');
  await loadVendorMenu();
}

export async function openEditModal(id) {
  const { data, error } = await sb
    .from('menu')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error(error);
    toast('Failed to load item', 'error');
    return;
  }

  currentEditItemId = id;

  const modal = document.getElementById('editModal');
  if (modal) {
    modal.hidden = false;
    modal.style.display = 'block';
    modal.dataset.itemId = String(id);
  }

  const nameEl = document.getElementById('editItemName');
  const priceEl = document.getElementById('editItemPrice');
  const descEl = document.getElementById('editItemDescription');

  if (nameEl) nameEl.value = data.name || '';
  if (priceEl) priceEl.value = data.price ?? '';
  if (descEl) descEl.value = data.description || '';

  setCheckboxesFromValues(ALLERGENS, 'editId', data.allergens);
  setCheckboxesFromValues(DIETARY_LABELS, 'editId', data.dietary_labels);
}

export function closeEditModal() {
  const modal = document.getElementById('editModal');

  if (modal) {
    modal.hidden = true;
    modal.style.display = 'none';
  }
}

export async function saveEdit() {
  const modal = document.getElementById('editModal');
  const itemId = currentEditItemId || modal?.dataset?.itemId;

  if (!itemId) {
    toast('No item selected', 'error');
    return;
  }

  const name = document.getElementById('editItemName')?.value.trim();
  const price = Number(document.getElementById('editItemPrice')?.value);
  const description = document.getElementById('editItemDescription')?.value.trim();

  if (!name || !price || !description) {
    toast('Fill in all fields', 'error');
    return;
  }

  const updateData = {
    name,
    price,
    description,
    allergens: collectCheckedItems(ALLERGENS, 'editId'),
    dietary_labels: collectCheckedItems(DIETARY_LABELS, 'editId')
  };

  const { error } = await sb
    .from('menu')
    .update(updateData)
    .eq('id', itemId);

  if (error) {
    console.error(error);
    toast('Update failed', 'error');
    return;
  }

  toast('Item updated successfully');
  closeEditModal();
  await loadVendorMenu();
}

if (typeof window !== 'undefined') {
  window.loadVendorMenu = loadVendorMenu;
  window.addMenuItem = addMenuItem;
  window.toggleSoldOut = toggleSoldOut;
  window.deleteMenuItem = deleteMenuItem;
  window.openEditModal = openEditModal;
  window.closeEditModal = closeEditModal;
  window.saveEdit = saveEdit;
}
