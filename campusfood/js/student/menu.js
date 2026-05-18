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
let allVendors = [];
let activeVendorId = '';
let mostOrderedMode = false;
let controlsAreSetup = false;

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not JSON. Continue with comma split.
    }

    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function averageRating(rows = []) {
  if (!rows.length) return 0;

  const total = rows.reduce((sum, row) => {
    return sum + Number(row.rating || 0);
  }, 0);

  return total / rows.length;
}

function renderStars(rating = 0) {
  const safeRating = Math.max(
    0,
    Math.min(5, Math.round(Number(rating) || 0))
  );

  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
}

function renderBadges(item) {
  const allergenBadges = normalizeArray(item.allergens).map(allergen => {
    const allergenId = String(allergen);
    const meta = ALLERGENS.find(a => a.id === allergenId);
    const label = meta ? `${meta.emoji} ${meta.label}` : allergenId;

    return `
      <span class="badge badge-warning">
        ${escapeHtml(label)}
      </span>
    `;
  });

  const dietaryBadges = normalizeArray(item.dietary_labels).map(label => {
    const labelId = String(label);
    const meta = DIETARY_LABELS.find(d => d.id === labelId);
    const text = meta ? `✓ ${meta.label}` : `✓ ${labelId}`;

    return `
      <span class="badge badge-success">
        ${escapeHtml(text)}
      </span>
    `;
  });

  const badges = [...allergenBadges, ...dietaryBadges];

  if (!badges.length) return '';

  return `
    <div class="menu-badges">
      ${badges.join('')}
    </div>
  `;
}

function menuItemMatchesOrderItem(menuItem, orderItem) {
  const orderId =
    orderItem?.id ||
    orderItem?.menu_id ||
    orderItem?.menuItemId ||
    orderItem?.item_id;

  const orderName = orderItem?.name || orderItem?.title;

  return (
    Boolean(orderId) &&
    String(orderId) === String(menuItem.id)
  ) || (
    Boolean(orderName) &&
    String(orderName).trim().toLowerCase() ===
      String(menuItem.name).trim().toLowerCase()
  );
}

async function loadVendorRatings() {
  const { data, error } = await sb
    .from('reviews')
    .select('vendor_id, rating');

  if (error || !data) {
    console.warn('Could not load vendor ratings:', error);
    return {};
  }

  return data.reduce((acc, review) => {
    const key = String(review.vendor_id);
    acc[key] ||= [];
    acc[key].push(review);
    return acc;
  }, {});
}

async function loadOrderRows() {
  const { data, error } = await sb
    .from('orders')
    .select('items');

  if (error || !data) {
    console.warn('Could not load order counts:', error);
    return [];
  }

  return data;
}

function countOrdersForItem(menuItem, orderRows) {
  return orderRows.reduce((count, order) => {
    const items = normalizeArray(order.items);

    if (!items.length) return count;

    const matched = items.some(orderItem => {
      if (typeof orderItem === 'string') {
        return String(orderItem).trim().toLowerCase() ===
          String(menuItem.name).trim().toLowerCase();
      }

      return menuItemMatchesOrderItem(menuItem, orderItem);
    });

    return count + (matched ? 1 : 0);
  }, 0);
}

function addCartHandlers() {
  document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    button.addEventListener('click', () => {
      const addToCart = window.addToCart;

      if (typeof addToCart !== 'function') {
        console.error('addToCart is not available. Check js/student/cart.js.');
        return;
      }

      addToCart(
        button.dataset.itemId,
        button.dataset.itemName,
        Number(button.dataset.itemPrice),
        button.dataset.vendorId
      );
    });
  });
}

function renderMenuItems(items) {
  const container = byId('menuContainer');

  if (!container) return;

  if (!items.length) {
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
        R${escapeHtml(String(item.price ?? 0))}
      </div>

      <div class="menu-item-vendor">
        ${escapeHtml(item.vendor_name || 'Vendor')}
      </div>

      <div class="menu-item-description">
        ${escapeHtml(item.description || '')}
      </div>

      ${item.vendor_rating ? `
        <div class="menu-item-rating" title="Vendor rating">
          ${renderStars(item.vendor_rating)}
          ${Number(item.vendor_rating).toFixed(1)}
        </div>
      ` : ''}

      ${renderBadges(item)}

      <button
        class="btn btn-primary btn-sm add-to-cart-btn"
        type="button"
        data-item-id="${escapeHtml(String(item.id))}"
        data-item-name="${escapeHtml(item.name)}"
        data-item-price="${escapeHtml(String(item.price ?? 0))}"
        data-vendor-id="${escapeHtml(String(item.vendor_id))}"
      >
        + Add to Cart
      </button>
    </div>
  `).join('');

  addCartHandlers();
}

function renderVendors() {
  const container = byId('vendorsContainer');

  if (!container) return;

  if (!allVendors.length) {
    container.innerHTML = `
      <p class="top-vendors-empty">
        No approved vendors yet.
      </p>
    `;
    return;
  }

  container.innerHTML = allVendors.map(vendor => `
    <div class="menu-item vendor-card">
      <div class="menu-item-title">
        ${escapeHtml(vendor.username || 'Vendor')}
      </div>

      <div class="menu-item-description">
        ${vendor.menu_count || 0}
        available item${Number(vendor.menu_count) === 1 ? '' : 's'}
      </div>

      <div class="menu-item-rating">
        ${vendor.rating
          ? `${renderStars(vendor.rating)} ${Number(vendor.rating).toFixed(1)}`
          : 'No ratings yet'
        }
      </div>

      <button
        class="btn btn-primary btn-sm view-vendor-btn"
        type="button"
        data-vendor-id="${escapeHtml(String(vendor.id))}"
      >
        View Menu
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.view-vendor-btn').forEach(button => {
    button.addEventListener('click', () => {
      activeVendorId = button.dataset.vendorId || '';
      mostOrderedMode = false;
      showMenuView();
      applyFilters();
    });
  });
}

function applyFilters() {
  const searchTerm = (byId('searchInput')?.value || '').trim().toLowerCase();
  const dietaryFilter = byId('dietaryFilter')?.value || '';
  const priceFilter = byId('priceFilter')?.value || '';
  const ratingFilter = Number(byId('ratingFilter')?.value || 0);

  const excludedAllergens = Array.from(
    document.querySelectorAll('.allergenFilter:checked')
  ).map(cb => cb.value);

  let filtered = [...allMenuItems];

  if (activeVendorId) {
    filtered = filtered.filter(item => {
      return String(item.vendor_id) === String(activeVendorId);
    });
  }

  if (searchTerm) {
    filtered = filtered.filter(item => {
      const searchable = [
        item.name,
        item.description,
        item.vendor_name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(searchTerm);
    });
  }

  if (dietaryFilter) {
    filtered = filtered.filter(item => {
      return normalizeArray(item.dietary_labels)
        .map(String)
        .includes(dietaryFilter);
    });
  }

  if (excludedAllergens.length) {
    filtered = filtered.filter(item => {
      const allergens = normalizeArray(item.allergens).map(String);

      return !excludedAllergens.some(allergen => {
        return allergens.includes(allergen);
      });
    });
  }

  if (ratingFilter) {
    filtered = filtered.filter(item => {
      return Number(item.vendor_rating || 0) >= ratingFilter;
    });
  }

  if (mostOrderedMode) {
    filtered.sort((a, b) => {
      return Number(b.order_count || 0) - Number(a.order_count || 0);
    });
  } else if (priceFilter === 'low-high') {
    filtered.sort((a, b) => {
      return Number(a.price || 0) - Number(b.price || 0);
    });
  } else if (priceFilter === 'high-low') {
    filtered.sort((a, b) => {
      return Number(b.price || 0) - Number(a.price || 0);
    });
  }

  renderMenuItems(filtered);
}

function resetFilters() {
  activeVendorId = '';
  mostOrderedMode = false;

  if (byId('searchInput')) byId('searchInput').value = '';
  if (byId('dietaryFilter')) byId('dietaryFilter').value = '';
  if (byId('priceFilter')) byId('priceFilter').value = '';
  if (byId('ratingFilter')) byId('ratingFilter').value = '';

  document.querySelectorAll('.allergenFilter').forEach(cb => {
    cb.checked = false;
  });

  byId('mostOrderedBtn')?.classList.remove('active');

  applyFilters();
}

function showMenuView() {
  const menuView = byId('menuView');
  const vendorsView = byId('vendorsView');
  const searchContainer = byId('searchContainer');
  const filterPanel = byId('filterPanel');
  const menuBtn = byId('browseByMenuBtn');
  const vendorBtn = byId('browseByVendorBtn');

  if (menuView) menuView.style.display = '';
  if (vendorsView) vendorsView.style.display = 'none';
  if (searchContainer) searchContainer.style.display = '';
  if (filterPanel) filterPanel.style.display = '';

  menuBtn?.classList.add('btn-primary');
  vendorBtn?.classList.remove('btn-primary');
}

function showVendorsView() {
  const menuView = byId('menuView');
  const vendorsView = byId('vendorsView');
  const searchContainer = byId('searchContainer');
  const filterPanel = byId('filterPanel');
  const menuBtn = byId('browseByMenuBtn');
  const vendorBtn = byId('browseByVendorBtn');

  if (menuView) menuView.style.display = 'none';
  if (vendorsView) vendorsView.style.display = '';
  if (searchContainer) searchContainer.style.display = 'none';
  if (filterPanel) filterPanel.style.display = 'none';

  menuBtn?.classList.remove('btn-primary');
  vendorBtn?.classList.add('btn-primary');

  renderVendors();
}

function setupControls() {
  if (controlsAreSetup) return;

  controlsAreSetup = true;

  byId('browseByMenuBtn')?.addEventListener('click', () => {
    activeVendorId = '';
    showMenuView();
    applyFilters();
  });

  byId('browseByVendorBtn')?.addEventListener('click', showVendorsView);
  byId('searchInput')?.addEventListener('input', applyFilters);
  byId('dietaryFilter')?.addEventListener('change', applyFilters);
  byId('priceFilter')?.addEventListener('change', applyFilters);
  byId('ratingFilter')?.addEventListener('change', applyFilters);

  document.querySelectorAll('.allergenFilter').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  byId('mostOrderedBtn')?.addEventListener('click', () => {
    mostOrderedMode = !mostOrderedMode;
    byId('mostOrderedBtn')?.classList.toggle('active', mostOrderedMode);
    applyFilters();
  });

  byId('resetFiltersBtn')?.addEventListener('click', resetFilters);
}

function restoreCart() {
  const savedCart = sessionStorage.getItem('cart');

  if (!savedCart) return;

  try {
    setCart(JSON.parse(savedCart));
    updateCartDisplay();
  } catch {
    // Ignore invalid saved cart.
  }
}

export async function loadStudentMenu() {
  const container = byId('menuContainer');

  if (!container) return;

  setupControls();
  showMenuView();

  const studentName = byId('studentName');

  if (studentName) {
    studentName.textContent =
      sessionStorage.getItem('username') ||
      sessionStorage.getItem('email') ||
      '';
  }

  container.innerHTML = `
    <p class="top-vendors-empty">
      Loading menu…
    </p>
  `;

  const { data: vendors, error: vendorError } = await sb
    .from('vendors')
    .select('id, username')
    .eq('status', 'approved');

  if (vendorError || !vendors) {
    console.error('Vendor load error:', vendorError);
    container.innerHTML = `
      <p class="top-vendors-empty">
        Failed to load menu.
      </p>
    `;
    return;
  }

  const [ratingRowsByVendor, orderRows] = await Promise.all([
    loadVendorRatings(),
    loadOrderRows()
  ]);

  const menuRows = [];

  for (const vendor of vendors) {
    const { data: menu, error: menuError } = await sb
      .from('menu')
      .select('*')
      .eq('vendor_id', vendor.id)
      .eq('status', 'available');

    if (menuError) {
      console.warn(`Could not load menu for vendor ${vendor.id}:`, menuError);
      continue;
    }

    const vendorRating = averageRating(
      ratingRowsByVendor[String(vendor.id)] || []
    );

    menuRows.push(...(menu || []).map(item => ({
      ...item,
      allergens: normalizeArray(item.allergens),
      dietary_labels: normalizeArray(item.dietary_labels),
      vendor_id: vendor.id,
      vendor_name: vendor.username,
      vendor_rating: vendorRating,
      order_count: countOrdersForItem(item, orderRows)
    })));
  }

  allMenuItems = menuRows;

  allVendors = vendors.map(vendor => ({
    ...vendor,
    rating: averageRating(ratingRowsByVendor[String(vendor.id)] || []),
    menu_count: allMenuItems.filter(item => {
      return String(item.vendor_id) === String(vendor.id);
    }).length
  }));

  renderVendors();

  if (!allMenuItems.length) {
    container.innerHTML = `
      <p class="top-vendors-empty">
        No menu available yet.
      </p>
    `;

    restoreCart();
    return;
  }

  applyFilters();
  restoreCart();
}

export async function logout() {
  await sb.auth.signOut();
  window.location.href = '../../index.html';
}

window.logout = logout;

function bootStudentMenuPage() {
  if (!byId('menuContainer')) return;

  loadStudentMenu().catch(error => {
    console.error('Failed to load student menu:', error);

    const container = byId('menuContainer');

    if (container) {
      container.innerHTML = `
        <p class="top-vendors-empty">
          Failed to load menu.
        </p>
      `;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootStudentMenuPage);
} else {
  bootStudentMenuPage();
}
