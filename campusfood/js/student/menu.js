import { sb } from '../config/supabase.js';
import { setCart, updateCartDisplay } from './cart.js';

let currentAllMenu = [];
let currentVendorSpecificMenu = [];  // NEW: separate array for vendor menu
let currentSearchText = '';
let currentPriceFilter = '';
let currentRatingFilter = '';
let currentVendorIdForFilters = null;
let isVendorMode = false;  // NEW: track if we're in vendor mode

// Get average rating for a vendor
async function getVendorAverageRating(vendorId) {
  const { data, error } = await sb
    .from('reviews')
    .select('rating')
    .eq('vendor_id', vendorId);

  if (error || !data || data.length === 0) return 0;
  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return avg;
}

// Get most ordered counts for a SPECIFIC vendor only
async function getMostOrderedCountsForVendor(vendorId) {
  const { data: orders, error } = await sb
    .from('orders')
    .select('items')
    .eq('vendor_id', vendorId);

  if (error || !orders) return {};

  const itemCounts = {};
  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const id = String(item.id);
        itemCounts[id] = (itemCounts[id] || 0) + 1;
      });
    }
  });
  return itemCounts;
}

// Apply all filters and search (uses correct menu array based on mode)
async function applyFiltersAndRender() {
  // Use the correct menu array based on mode
  const menuToUse = isVendorMode ? currentVendorSpecificMenu : currentAllMenu;
  
  if (!menuToUse.length) return;

  let filtered = [...menuToUse];

  // Apply search
  if (currentSearchText) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(currentSearchText.toLowerCase())
    );
  }

  // Apply price sort
  if (currentPriceFilter === 'low-high') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentPriceFilter === 'high-low') {
    filtered.sort((a, b) => b.price - a.price);
  }

  // Apply rating filter (if vendor-specific)
  if (currentRatingFilter && currentVendorIdForFilters) {
    const minRating = parseInt(currentRatingFilter);
    const vendorRating = await getVendorAverageRating(currentVendorIdForFilters);
    if (vendorRating < minRating) {
      filtered = [];
    }
  }

  // Render
  const container = document.getElementById('menuContainer');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No items match your search or filters.</p>';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="menu-item">
      <div style="font-weight: bold;">${item.name}</div>
      <div>R${item.price}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.vendor_name || ''}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.description || ''}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
      <button class="btn btn-primary btn-sm" onclick="window.addToCartFromGlobal('${item.id}', '${item.name}', ${item.price}, '${item.vendor_id}')">
        + Add to Cart
      </button>
    </div>
  `).join('');
}

// Sort by most ordered for SPECIFIC vendor
export async function sortByMostOrderedForVendor(vendorId) {
  if (!vendorId || !currentVendorSpecificMenu.length) return;

  const itemCounts = await getMostOrderedCountsForVendor(vendorId);
  currentVendorSpecificMenu.sort((a, b) => (itemCounts[b.id] || 0) - (itemCounts[a.id] || 0));
  await applyFiltersAndRender();
}

// Reset all filters
export function resetFilters() {
  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';
  
  const searchInput = document.getElementById('searchInput');
  const priceFilter = document.getElementById('priceFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  
  if (searchInput) searchInput.value = '';
  if (priceFilter) priceFilter.value = '';
  if (ratingFilter) ratingFilter.value = '';
}

// Setup search and filter listeners (for vendor view)
export function setupVendorFilters(vendorId, vendorMenu) {
  currentVendorIdForFilters = vendorId;
  currentVendorSpecificMenu = [...vendorMenu];  // Store vendor-specific menu
  isVendorMode = true;  // Enable vendor mode
  
  const searchInput = document.getElementById('searchInput');
  const priceFilter = document.getElementById('priceFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  const mostOrderedBtn = document.getElementById('mostOrderedBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const filterPanel = document.getElementById('filterPanel');

  if (filterPanel) filterPanel.style.display = 'block';

  if (searchInput) {
    searchInput.oninput = (e) => {
      currentSearchText = e.target.value;
      applyFiltersAndRender();
    };
  }

  if (priceFilter) {
    priceFilter.onchange = (e) => {
      currentPriceFilter = e.target.value;
      applyFiltersAndRender();
    };
  }

  if (ratingFilter) {
    ratingFilter.onchange = (e) => {
      currentRatingFilter = e.target.value;
      applyFiltersAndRender();
    };
  }

  if (mostOrderedBtn) {
    mostOrderedBtn.onclick = () => sortByMostOrderedForVendor(vendorId);
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.onclick = () => {
      resetFilters();
      applyFiltersAndRender();
    };
  }
  
  // Initial render
  applyFiltersAndRender();
}

// Clear vendor filters (when going back to all menu)
export function clearVendorFilters() {
  currentVendorIdForFilters = null;
  currentVendorSpecificMenu = [];
  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';
  isVendorMode = false;
  
  const searchInput = document.getElementById('searchInput');
  const priceFilter = document.getElementById('priceFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  const filterPanel = document.getElementById('filterPanel');
  const searchContainer = document.getElementById('searchContainer');
  
  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = null;  // Remove event listener
  }
  if (priceFilter) {
    priceFilter.value = '';
    priceFilter.onchange = null;
  }
  if (ratingFilter) {
    ratingFilter.value = '';
    ratingFilter.onchange = null;
  }
  if (filterPanel) filterPanel.style.display = 'none';
  if (searchContainer) searchContainer.style.display = 'block';
}

// Original loadStudentMenu with search capability
export async function loadStudentMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;

  // Show search bar for Browse by Menu view
  const searchContainer = document.getElementById('searchContainer');
  const filterPanel = document.getElementById('filterPanel');
  if (searchContainer) searchContainer.style.display = 'block';
  if (filterPanel) filterPanel.style.display = 'none';

  // Reset vendor mode
  isVendorMode = false;
  currentVendorIdForFilters = null;
  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';

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

  // Setup search input for Browse by Menu view
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.oninput = (e) => {
      currentSearchText = e.target.value;
      applyFiltersAndRender();
    };
  }

  if (allMenu.length === 0) {
    container.innerHTML = '<p>No menu available yet.</p>';
    return;
  }

  await applyFiltersAndRender();

  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    setCart(JSON.parse(savedCart));
    updateCartDisplay();
  }
}

// Make addToCart available globally
window.addToCartFromGlobal = (itemId, name, price, vendorId) => {
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
