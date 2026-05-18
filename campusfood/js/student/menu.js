import { sb } from '../config/supabase.js';
import { setCart, updateCartDisplay } from './cart.js';

const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚' },
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'soy', label: 'Soy', emoji: '🌱' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛' }
];

const DIETARY_LABELS = [
  { id: 'halal', label: 'Halal' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' }
];

let allMenuItems = [];

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

      return `
        <span class="badge badge-warning">
          ${escapeHtml(label)}
        </span>
      `;
    });

  const dietaryBadges = (Array.isArray(item.dietary_labels)
    ? item.dietary_labels
    : []
  ).map(label => {
    const meta = DIETARY_LABELS.find(d => d.id === label);
    const text = meta ? `✓ ${meta.label}` : `✓ ${label}`;

    return `
      <span class="badge badge-success">
        ${escapeHtml(text)}
      </span>
    `;
  });

  const badges = [...allergenBadges, ...dietaryBadges];

  if (badges.length === 0) return '';

  return `
    <div class="menu-badges">
      ${badges.join('')}
    </div>
  `;
}

function renderMenuItems(items) {
  const container = document.getElementById('menuContainer');

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <p class="top-vendors-empty">
        No menu items match your filters.
      </p>
    `;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="menu-item">

      <div class="menu-item-title">
        ${escapeHtml(item.name)}
      </div>

      ${item.image_url ? `
        <img
          src="${escapeHtml(item.image_url)}"
          alt="${escapeHtml(item.name)}"
          class="menu-item-image"
        />
      ` : ''}

      <div class="menu-item-price">
        R${escapeHtml(String(item.price))}
      </div>

      <div class="menu-item-vendor">
        ${escapeHtml(item.vendor_name)}
      </div>

      <div class="menu-item-description">
        ${escapeHtml(item.description || '')}
      </div>

      ${renderBadges(item)}

      <button
        class="btn btn-primary btn-sm"
        data-item-id="${escapeHtml(String(item.id))}"
        data-item-name="${escapeHtml(item.name)}"
        data-item-price="${escapeHtml(String(item.price))}"
        data-vendor-id="${escapeHtml(String(item.vendor_id))}"
        onclick="addToCart(this.dataset.itemId, this.dataset.itemName, Number(this.dataset.itemPrice), this.dataset.vendorId)"
      >
        + Add to Cart
      </button>

    </div>
  `).join('');
}

function applyFilters() {

  const dietaryFilter =
    document.getElementById('dietaryFilter')?.value || '';

  const allergenCheckboxes =
    document.querySelectorAll('.allergenFilter:checked');

  const excludedAllergens =
    Array.from(allergenCheckboxes).map(cb => cb.value);

  let filtered = [...allMenuItems];

  // Dietary filter
  if (dietaryFilter) {
    filtered = filtered.filter(item =>
      Array.isArray(item.dietary_labels) &&
      item.dietary_labels.includes(dietaryFilter)
    );
  }

  // Allergen exclusion filter
  if (excludedAllergens.length > 0) {
    filtered = filtered.filter(item => {

      const allergens =
        Array.isArray(item.allergens)
          ? item.allergens
          : [];

      return !excludedAllergens.some(allergen =>
        allergens.includes(allergen)
      );
    });
  }

  renderMenuItems(filtered);
}

function setupFilters() {

  const dietaryFilter =
    document.getElementById('dietaryFilter');

  if (dietaryFilter) {
    dietaryFilter.addEventListener('change', applyFilters);
  }

  const allergenCheckboxes =
    document.querySelectorAll('.allergenFilter');

  allergenCheckboxes.forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  const resetBtn =
    document.getElementById('resetFiltersBtn');

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {

      if (dietaryFilter) {
        dietaryFilter.value = '';
      }

      allergenCheckboxes.forEach(cb => {
        cb.checked = false;
      });

      applyFilters();
    });
  }
}

export async function loadStudentMenu() {

  const container =
    document.getElementById('menuContainer');

  if (!container) return;

  container.innerHTML = '<p>Loading menu…</p>';

  const { data: vendors, error: vendorError } =
    await sb
      .from('vendors')
      .select('id, username')
      .eq('status', 'approved');

  if (vendorError || !vendors) {
    container.innerHTML = '<p>Failed to load menu</p>';
    return;
  }

  const allMenu = [];

  for (const vendor of vendors) {

    const { data: menu, error: menuError } =
      await sb
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

  allMenuItems = allMenu;

  renderMenuItems(allMenuItems);

  setupFilters();

  // Restore cart
  const savedCart = sessionStorage.getItem('cart');

  if (savedCart) {
    try {
      setCart(JSON.parse(savedCart));
      updateCartDisplay();
    } catch {
      // ignore invalid JSON
    }
  }
}