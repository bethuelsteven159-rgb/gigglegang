import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

let currentEditItemId = null;

const ALLERGENS = [
  { id: 'peanuts',   label: 'Peanuts',   emoji: '🥜', addId: 'addContainsPeanuts',   editId: 'editContainsPeanuts' },
  { id: 'gluten',    label: 'Gluten',    emoji: '🌾', addId: 'addContainsGluten',    editId: 'editContainsGluten' },
  { id: 'dairy',     label: 'Dairy',     emoji: '🥛', addId: 'addContainsDairy',     editId: 'editContainsDairy' },
  { id: 'eggs',      label: 'Eggs',      emoji: '🥚', addId: 'addContainsEggs',      editId: 'editContainsEggs' },
  { id: 'soy',       label: 'Soy',       emoji: '🌱', addId: 'addContainsSoy',       editId: 'editContainsSoy' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐', addId: 'addContainsShellfish', editId: 'editContainsShellfish' }
];

const DIETARY_LABELS = [
  { id: 'halal',      label: 'Halal',      addId: 'addIsHalal',      editId: 'editIsHalal' },
  { id: 'vegetarian', label: 'Vegetarian', addId: 'addIsVegetarian', editId: 'editIsVegetarian' },
  { id: 'vegan',      label: 'Vegan',      addId: 'addIsVegan',      editId: 'editIsVegan' }
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
  const el = document.getElementById(id);
  if (el) el.checked = checked;
}

function collectChecked(items, key) {
  return items.filter(i => isChecked(i[key])).map(i => i.id);
}

function setCheckboxesFromValues(items, key, values = []) {
  const selected = Array.isArray(values) ? values : [];
  items.forEach(i => setChecked(i[key], selected.includes(i.id)));
}

// Safely parse allergens/dietary_labels whether stored as array or JSON string
function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

function renderBadges(item) {
  const allergens     = parseArray(item.allergens);
  const dietaryLabels = parseArray(item.dietary_labels);

  const allergenBadges = allergens.map(a => {
    const meta = ALLERGENS.find(x => x.id === a);
    return `<span class="badge badge-warning">${escapeHtml(meta ? `${meta.emoji} ${meta.label}` : a)}</span>`;
  });

  const dietaryBadges = dietaryLabels.map(d => {
    const meta = DIETARY_LABELS.find(x => x.id === d);
    return `<span class="badge badge-success">${escapeHtml(meta ? `✓ ${meta.label}` : `✓ ${d}`)}</span>`;
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

  const { data, error } = await sb
    .from('menu')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true });

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
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}"
            style="display:block;margin:10px auto;width:180px;height:180px;object-fit:cover;border-radius:10px;" />
        ` : ''}
        <div>${escapeHtml(item.description || '')}</div>
        <div>R${escapeHtml(String(item.price))}</div>
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

export function openAddModal() {
  const modal = document.getElementById('addModal');
  if (!modal) return;
  modal.hidden = false;

  // Clear all fields
  const nameEl  = document.getElementById('itemName');
  const priceEl = document.getElementById('itemPrice');
  const descEl  = document.getElementById('itemDescription');
  const imageEl = document.getElementById('itemImage');
  if (nameEl)  nameEl.value  = '';
  if (priceEl) priceEl.value = '';
  if (descEl)  descEl.value  = '';
  if (imageEl) imageEl.value = '';
  ALLERGENS.forEach(i => setChecked(i.addId, false));
  DIETARY_LABELS.forEach(i => setChecked(i.addId, false));
}

export function closeAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) modal.hidden = true;
}

export async function addMenuItem() {
  const nameEl  = document.getElementById('itemName');
  const priceEl = document.getElementById('itemPrice');
  const descEl  = document.getElementById('itemDescription');
  const imageEl = document.getElementById('itemImage');

  const name        = nameEl?.value.trim();
  const price       = Number(priceEl?.value);
  const description = descEl?.value.trim();
  const file        = imageEl?.files?.[0];

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
    const { error: uploadError } = await sb.storage.from('menu_images').upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      toast('Image upload failed', 'error');
      return;
    }

    const { data: urlData } = sb.storage.from('menu_images').getPublicUrl(fileName);
    imageUrl = urlData?.publicUrl || null;
  }

  const allergens     = collectChecked(ALLERGENS, 'addId');
  const dietaryLabels = collectChecked(DIETARY_LABELS, 'addId');

  const { error } = await sb.from('menu').insert([{
    vendor_id: vendorId,
    name, price, description,
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
  closeAddModal();
  await loadVendorMenu();
}

export async function toggleSoldOut(id, isSoldOut) {
  const newStatus = isSoldOut ? 'available' : 'sold_out';
  const { error } = await sb.from('menu').update({ status: newStatus }).eq('id', id);

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

  const { error } = await sb.from('menu').delete().eq('id', id);

  if (error) {
    console.error(error);
    toast('Delete failed', 'error');
    return;
  }
  toast('Item deleted');
  await loadVendorMenu();
}

export async function openEditModal(id) {
  const { data, error } = await sb.from('menu').select('*').eq('id', id).single();

  if (error || !data) {
    console.error(error);
    toast('Failed to load item', 'error');
    return;
  }

  currentEditItemId = id;

  const modal = document.getElementById('editModal');
  if (modal) {
    modal.hidden = false;
    modal.dataset.itemId = String(id);
  }

  const nameEl  = document.getElementById('editItemName');
  const priceEl = document.getElementById('editItemPrice');
  const descEl  = document.getElementById('editItemDescription');

  if (nameEl)  nameEl.value  = data.name       || '';
  if (priceEl) priceEl.value = data.price       ?? '';
  if (descEl)  descEl.value  = data.description || '';

  setCheckboxesFromValues(ALLERGENS,      'editId', parseArray(data.allergens));
  setCheckboxesFromValues(DIETARY_LABELS, 'editId', parseArray(data.dietary_labels));
}

export function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.hidden = true;
}

export async function saveEdit() {
  const modal  = document.getElementById('editModal');
  const itemId = currentEditItemId || modal?.dataset?.itemId;

  if (!itemId) {
    toast('No item selected', 'error');
    return;
  }

  const name        = document.getElementById('editItemName')?.value.trim();
  const price       = Number(document.getElementById('editItemPrice')?.value);
  const description = document.getElementById('editItemDescription')?.value.trim();

  if (!name || !price || !description) {
    toast('Fill in all fields', 'error');
    return;
  }

  const { error } = await sb.from('menu').update({
    name, price, description,
    allergens:      collectChecked(ALLERGENS,      'editId'),
    dietary_labels: collectChecked(DIETARY_LABELS, 'editId')
  }).eq('id', itemId);

  if (error) {
    console.error(error);
    toast('Update failed', 'error');
    return;
  }

  toast('Item updated successfully');
  closeEditModal();
  await loadVendorMenu();
}
