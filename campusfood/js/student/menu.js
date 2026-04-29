import { sb } from '../config/supabase.js';
import { setCart, updateCartDisplay } from './cart.js';

let currentAllMenu = [];
let currentSearchText = '';
let currentAllergenFilter = '';

// Helper function to get allergen/dietary badges HTML
function getAllergenBadges(item) {
  const badges = [];
  
  // Allergen badges (based on SA R146/2010)
  if (item.contains_peanuts) badges.push('<span class="allergen-badge peanut">🥜 Peanuts</span>');
  if (item.contains_tree_nuts) badges.push('<span class="allergen-badge tree-nuts">🌰 Tree Nuts</span>');
  if (item.contains_dairy) badges.push('<span class="allergen-badge dairy">🥛 Dairy</span>');
  if (item.contains_eggs) badges.push('<span class="allergen-badge eggs">🥚 Eggs</span>');
  if (item.contains_soy) badges.push('<span class="allergen-badge soy">🌱 Soy</span>');
  if (item.contains_fish) badges.push('<span class="allergen-badge fish">🐟 Fish</span>');
  if (item.contains_shellfish) badges.push('<span class="allergen-badge shellfish">🦐 Shellfish</span>');
  if (item.contains_gluten) badges.push('<span class="allergen-badge gluten">🌾 Gluten</span>');
  
  // Dietary badges
  if (item.is_halal) badges.push('<span class="dietary-badge halal">✓ Halal</span>');
  if (item.is_vegan) badges.push('<span class="dietary-badge vegan">✓ Vegan</span>');
  if (item.is_vegetarian) badges.push('<span class="dietary-badge vegetarian">✓ Vegetarian</span>');
  if (item.is_gluten_free) badges.push('<span class="dietary-badge gluten-free">✓ Gluten-Free</span>');
  
  return badges.length ? `<div class="badge-container">${badges.join('')}</div>` : '';
}

// Filter items by allergen/dietary preference
function filterByAllergen(items, filter) {
  if (!filter) return items;
  
  return items.filter(item => {
    switch(filter) {
      case 'peanut-free': return !item.contains_peanuts;
      case 'nut-free': return !item.contains_tree_nuts;
      case 'dairy-free': return !item.contains_dairy;
      case 'egg-free': return !item.contains_eggs;
      case 'soy-free': return !item.contains_soy;
      case 'fish-free': return !item.contains_fish;
      case 'shellfish-free': return !item.contains_shellfish;
      case 'gluten-free': return !item.contains_gluten && !item.is_gluten_free;
      case 'halal': return item.is_halal;
      case 'vegan': return item.is_vegan;
      case 'vegetarian': return item.is_vegetarian;
      default: return true;
    }
  });
}

// Render menu with search and allergen filters
async function renderMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;

  if (!currentAllMenu.length) {
    container.innerHTML = '<p style="color:var(--muted)">No menu available yet.</p>';
    return;
  }

  let filtered = [...currentAllMenu];

  // Apply search filter
  if (currentSearchText) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(currentSearchText.toLowerCase())
    );
  }

  // Apply allergen/dietary filter
  filtered = filterByAllergen(filtered, currentAllergenFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No items match your search or dietary preferences.</p>';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="menu-item">
      <div style="font-weight: bold;">${escapeHtml(item.name)}</div>
      <div>R${item.price}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(item.vendor_name)}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(item.description || '')}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
      ${getAllergenBadges(item)}
      <button class="btn btn-primary btn-sm" onclick="window.addToCartFromMenu('${item.id}', '${escapeHtml(item.name)}', ${item.price}, '${item.vendor_id}')">
        + Add to Cart
      </button>
    </div>
  `).join('');
}

// Load all menu items (Browse by Menu mode)
export async function loadStudentMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;

  // Show search bar, hide filter panel
  const searchContainer = document.getElementById('searchContainer');
  const filterPanel = document.getElementById('filterPanel');
  if (searchContainer) searchContainer.style.display = 'block';
  if (filterPanel) filterPanel.style.display = 'none';

  // Reset filters
  currentSearchText = '';
  currentAllergenFilter = '';
  const searchInput = document.getElementById('searchInput');
  const allergenFilter = document.getElementById('allergenFilter');
  if (searchInput) searchInput.value = '';
  if (allergenFilter) allergenFilter.value = '';

  const { data: vendors, error: vendorError } = await sb
    .from('vendors')
    .select('id, username')
    .eq('status', 'approved');

  if (vendorError || !vendors) {
    container.innerHTML = '<p>Failed to load menu</p>';
    return;
  }

  let allMenu = [];

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

  currentAllMenu = allMenu;

  // Setup search input
  if (searchInput) {
    searchInput.oninput = (e) => {
      currentSearchText = e.target.value;
      renderMenu();
    };
  }
  
  // Setup allergen filter dropdown
  if (allergenFilter) {
    allergenFilter.onchange = (e) => {
      currentAllergenFilter = e.target.value;
      renderMenu();
    };
  }

  await renderMenu();

  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    setCart(JSON.parse(savedCart));
    updateCartDisplay();
  }
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

// Global add to cart
window.addToCartFromMenu = (itemId, name, price, vendorId) => {
  const cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
  cart.push({ id: itemId, name, price, vendor_id: vendorId });
  sessionStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
  
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = `${name} added to cart`;
    toast.className = 'show success';
    setTimeout(() => toast.className = '', 3000);
  }
};
