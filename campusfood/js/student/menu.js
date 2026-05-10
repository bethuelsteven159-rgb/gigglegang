import { sb } from '../config/supabase.js';
import { setCart, updateCartDisplay } from './cart.js';

let currentAllMenu = [];
let currentSearchText = '';
let currentAllergenFilter = '';  // NEW: for dietary/allergen filtering

// NEW: Helper function to get allergen/dietary badges HTML from arrays
function getAllergenBadges(item) {
  const badges = [];
  
  // Allergen badge mappings (based on SA R146/2010)
  const allergenMap = {
    'peanuts': '🥜 Peanuts',
    'tree_nuts': '🌰 Tree Nuts',
    'dairy': '🥛 Dairy',
    'eggs': '🥚 Eggs',
    'soy': '🌱 Soy',
    'fish': '🐟 Fish',
    'shellfish': '🦐 Shellfish',
    'gluten': '🌾 Gluten'
  };
  
  // Dietary badge mappings
  const dietaryMap = {
    'halal': '✓ Halal',
    'vegan': '✓ Vegan',
    'vegetarian': '✓ Vegetarian',
    'gluten_free': '✓ Gluten-Free'
  };
  
  // Check allergens array
  if (item.allergens && Array.isArray(item.allergens)) {
    item.allergens.forEach(allergen => {
      if (allergenMap[allergen]) {
        const className = allergen.replace('_', '-');
        badges.push(`<span class="allergen-badge ${className}">${allergenMap[allergen]}</span>`);
      }
    });
  }
  
  // Check dietary_labels array
  if (item.dietary_labels && Array.isArray(item.dietary_labels)) {
    item.dietary_labels.forEach(label => {
      if (dietaryMap[label]) {
        const className = label === 'gluten_free' ? 'gluten-free' : label;
        badges.push(`<span class="dietary-badge ${className}">${dietaryMap[label]}</span>`);
      }
    });
  }
  
  return badges.length ? `<div class="badge-container">${badges.join('')}</div>` : '';
}

// NEW: Filter items by allergen/dietary preference
function filterByAllergen(items, filter) {
  if (!filter) return items;
  
  return items.filter(item => {
    const allergens = item.allergens || [];
    const dietary = item.dietary_labels || [];
    
    switch(filter) {
      // Allergen-free filters
      case 'peanut-free': return !allergens.includes('peanuts');
      case 'nut-free': return !allergens.includes('tree_nuts');
      case 'dairy-free': return !allergens.includes('dairy');
      case 'egg-free': return !allergens.includes('eggs');
      case 'soy-free': return !allergens.includes('soy');
      case 'fish-free': return !allergens.includes('fish');
      case 'shellfish-free': return !allergens.includes('shellfish');
      case 'gluten-free': return !allergens.includes('gluten');
      // Dietary preference filters
      case 'halal': return dietary.includes('halal');
      case 'vegan': return dietary.includes('vegan');
      case 'vegetarian': return dietary.includes('vegetarian');
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

  // NEW: Apply allergen/dietary filter
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

  // Reset search and allergen filter
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

  // NEW: Setup allergen filter dropdown
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
