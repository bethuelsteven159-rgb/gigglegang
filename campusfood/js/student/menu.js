import { sb } from '../config/supabase.js';
import { setCart, updateCartDisplay } from './cart.js';

const ALLERGENS = [
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'gluten',  label: 'Gluten',  emoji: '🌾' },
  { id: 'dairy',   label: 'Dairy',   emoji: '🥛' },
  { id: 'eggs',    label: 'Eggs',    emoji: '🥚' },
  { id: 'soy',     label: 'Soy',     emoji: '🌱' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' }
];

const DIETARY_LABELS = [
  { id: 'halal',       label: 'Halal' },
  { id: 'vegetarian',  label: 'Vegetarian' },
  { id: 'vegan',       label: 'Vegan' }
];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderBadges(item) {
  const allergenBadges = (Array.isArray(item.allergens) ? item.allergens : [])
    .map(allergen => {
      const meta = ALLERGENS.find(a => a.id === allergen);
      const label = meta ? `${meta.emoji} ${meta.label}` : allergen;
      return `<span class="badge badge-warning">${escapeHtml(label)}</span>`;
    });

  const dietaryBadges = (Array.isArray(item.dietary_labels) ? item.dietary_labels : [])
    .map(label => {
      const meta = DIETARY_LABELS.find(d => d.id === label);
      const text = meta ? `✓ ${meta.label}` : `✓ ${label}`;
      return `<span class="badge badge-success">${escapeHtml(text)}</span>`;
    });

  const badges = [...allergenBadges, ...dietaryBadges];
  if (badges.length === 0) return '';
  return `<div class="menu-badges">${badges.join('')}</div>`;
}

export async function loadStudentMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;

  container.innerHTML = '<p>Loading menu…</p>';

  // Fetch all approved vendors
  const { data: vendors, error: vendorError } = await sb
    .from('vendors')
    .select('id, username')
    .eq('status', 'approved');

  if (vendorError || !vendors) {
    container.innerHTML = '<p>Failed to load menu</p>';
    return;
  }

  // Fetch available menu items for every vendor
  const allMenu = [];

  for (const vendor of vendors) {
    const { data: menu, error: menuError } = await sb
      .from('menu')
      .select('*')
      .eq('vendor_id', vendor.id)
      .eq('status', 'available');

    if (!menuError && menu) {
      allMenu.push(...menu.map(item => ({
        ...item,
        vendor_name: vendor.username,
        vendor_id: vendor.id
      })));
    }
  }

  if (allMenu.length === 0) {
    container.innerHTML = '<p>No menu available yet.</p>';
    return;
  }

  container.innerHTML = allMenu.map(item => `
    <div class="menu-item">
      <div style="font-weight:bold">${escapeHtml(item.name)}</div>
      ${item.image_url ? `
        <img
          src="${escapeHtml(item.image_url)}"
          alt="${escapeHtml(item.name)}"
          style="width:100px;height:100px;object-fit:cover;border-radius:8px;margin-top:8px;"
        />
      ` : ''}
      <div>R${escapeHtml(String(item.price))}</div>
      <div style="font-size:12px;color:var(--text-muted)">${escapeHtml(item.vendor_name)}</div>
      <div style="font-size:12px;color:var(--text-muted)">${escapeHtml(item.description || '')}</div>
      ${renderBadges(item)}
      <button
        class="btn btn-primary btn-sm"
        data-item-id="${escapeHtml(String(item.id))}"
        data-item-name="${escapeHtml(item.name)}"
        data-item-price="${escapeHtml(String(item.price))}"
        data-vendor-id="${escapeHtml(String(item.vendor_id))}"
        onclick="addToCart(this.dataset.itemId, this.dataset.itemName, Number(this.dataset.itemPrice), this.dataset.vendorId)"
      >+ Add to Cart</button>
    </div>
  `).join('');

  // Restore cart from session storage
  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    try {
      setCart(JSON.parse(savedCart));
      updateCartDisplay();
    } catch {
      // Ignore malformed cart
    }
  }
}
