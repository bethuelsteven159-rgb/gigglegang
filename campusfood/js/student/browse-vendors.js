import { sb } from '../config/supabase.js';
import { updateCartDisplay, setCart } from './cart.js';
import { loadStudentMenu } from './menu.js';

let currentVendorMenu = [];
let currentVendorId = null;
let currentVendorName = '';
let currentSearchText = '';
let currentPriceFilter = '';
let currentRatingFilter = '';

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

// Get most ordered counts for this vendor only
async function getMostOrderedCounts() {
  const { data: orders, error } = await sb
    .from('orders')
    .select('items')
    .eq('vendor_id', currentVendorId);

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

// Render vendor menu with all filters
async function renderVendorMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;

  if (!currentVendorMenu.length) {
    container.innerHTML = `<p style="color:var(--muted)">No items available from ${currentVendorName}.</p>`;
    return;
  }

  let filtered = [...currentVendorMenu];

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

  // Apply rating filter
  if (currentRatingFilter) {
    const minRating = parseInt(currentRatingFilter);
    const vendorRating = await getVendorAverageRating(currentVendorId);
    if (vendorRating < minRating) {
      filtered = [];
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No items match your search or filters.</p>';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="menu-item">
      <div style="font-weight: bold;">${item.name}</div>
      <div>R${item.price}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.description || ''}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
      <button class="btn btn-primary btn-sm" onclick="window.addToCartFromVendor('${item.id}', '${item.name}', ${item.price}, '${currentVendorId}')">
        + Add to Cart
      </button>
    </div>
  `).join('');
}

// Sort by most ordered for this vendor
async function sortByMostOrdered() {
  if (!currentVendorMenu.length) return;
  const itemCounts = await getMostOrderedCounts();
  currentVendorMenu.sort((a, b) => (itemCounts[b.id] || 0) - (itemCounts[a.id] || 0));
  await renderVendorMenu();
}

// Reset all filters
function resetFilters() {
  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';
  
  const searchInput = document.getElementById('searchInput');
  const priceFilter = document.getElementById('priceFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  
  if (searchInput) searchInput.value = '';
  if (priceFilter) priceFilter.value = '';
  if (ratingFilter) ratingFilter.value = '';
  
  renderVendorMenu();
}

// Setup filter event listeners
function setupFilterListeners() {
  const searchInput = document.getElementById('searchInput');
  const priceFilter = document.getElementById('priceFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  const mostOrderedBtn = document.getElementById('mostOrderedBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  if (searchInput) {
    searchInput.oninput = (e) => {
      currentSearchText = e.target.value;
      renderVendorMenu();
    };
  }

  if (priceFilter) {
    priceFilter.onchange = (e) => {
      currentPriceFilter = e.target.value;
      renderVendorMenu();
    };
  }

  if (ratingFilter) {
    ratingFilter.onchange = (e) => {
      currentRatingFilter = e.target.value;
      renderVendorMenu();
    };
  }

  if (mostOrderedBtn) {
    mostOrderedBtn.onclick = () => sortByMostOrdered();
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.onclick = () => resetFilters();
  }
}

// Show list of all vendors
export async function loadVendorsList() {
  const container = document.getElementById('vendorsContainer');
  if (!container) return;

  // Hide search and filter when showing vendor list
  const searchContainer = document.getElementById('searchContainer');
  const filterPanel = document.getElementById('filterPanel');
  if (searchContainer) searchContainer.style.display = 'none';
  if (filterPanel) filterPanel.style.display = 'none';

  const { data: vendors, error } = await sb
    .from('vendors')
    .select('id, username')
    .eq('status', 'approved');

  if (error || !vendors || vendors.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No vendors available yet.</p>';
    return;
  }

  container.innerHTML = vendors.map(vendor => `
    <div class="menu-item" style="cursor: pointer;" onclick="window.showVendorMenu('${vendor.id}', '${vendor.username}')">
      <div style="font-weight: bold; font-size: 1.2rem;">🏪 ${vendor.username}</div>
      <div style="color: var(--accent); margin-top: 0.5rem;">Click to view menu →</div>
    </div>
  `).join('');
}

// Show menu for a specific vendor
export async function showVendorMenu(vendorId, vendorName) {
  const container = document.getElementById('menuContainer');
  const menuView = document.getElementById('menuView');
  const vendorsView = document.getElementById('vendorsView');
  const browseByMenuBtn = document.getElementById('browseByMenuBtn');
  const browseByVendorBtn = document.getElementById('browseByVendorBtn');

  if (!container) return;

  // Switch views
  if (menuView && vendorsView) {
    menuView.style.display = 'block';
    vendorsView.style.display = 'none';
  }

  // Update button styles
  if (browseByMenuBtn && browseByVendorBtn) {
    browseByMenuBtn.className = 'btn btn-primary';
    browseByVendorBtn.className = 'btn';
    browseByVendorBtn.style.background = 'var(--surface-alt)';
    browseByVendorBtn.style.color = 'var(--text)';
  }

  // Show search bar and filter panel
  const searchContainer = document.getElementById('searchContainer');
  const filterPanel = document.getElementById('filterPanel');
  if (searchContainer) searchContainer.style.display = 'block';
  if (filterPanel) filterPanel.style.display = 'block';

  container.innerHTML = `<p style="color:var(--muted)">Loading ${vendorName}'s menu...</p>`;

  const { data: menu, error } = await sb
    .from('menu')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('status', 'available');

  if (error || !menu || menu.length === 0) {
    container.innerHTML = `<p style="color:var(--muted)">No items available from ${vendorName} yet.</p>`;
    return;
  }

  // Store vendor data
  currentVendorId = vendorId;
  currentVendorName = vendorName;
  currentVendorMenu = menu.map(item => ({
    ...item,
    vendor_name: vendorName,
    vendor_id: vendorId
  }));

  // Reset filters
  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';

  // Update heading with back button
  const menuHeading = document.querySelector('#menuView h2');
  if (menuHeading) {
    menuHeading.innerHTML = `${vendorName} Menu <button onclick="window.resetToAllMenu()" style="margin-left: 1rem; padding: 0.25rem 0.75rem; font-size: 0.8rem;" class="btn">Back to All Menu</button>`;
  }

  // Setup filters and render
  setupFilterListeners();
  await renderVendorMenu();

  // Restore cart
  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    setCart(JSON.parse(savedCart));
    updateCartDisplay();
  }
}

// Reset to all menu view
export function resetToAllMenu() {
  // Reset vendor data
  currentVendorMenu = [];
  currentVendorId = null;
  currentVendorName = '';
  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';

  // Update heading
  const menuHeading = document.querySelector('#menuView h2');
  if (menuHeading) {
    menuHeading.innerHTML = 'Available Menu';
  }

  // Hide filter panel
  const filterPanel = document.getElementById('filterPanel');
  if (filterPanel) filterPanel.style.display = 'none';

  // Clear search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = null;
  }

  // Reload full menu
  loadStudentMenu();
}

// Make functions global
window.showVendorMenu = showVendorMenu;
window.resetToAllMenu = resetToAllMenu;
window.addToCartFromVendor = (itemId, name, price, vendorId) => {
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
