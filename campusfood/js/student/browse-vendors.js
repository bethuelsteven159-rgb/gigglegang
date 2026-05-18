```js
import { sb } from '../config/supabase.js';
import { updateCartDisplay, setCart } from './cart.js';
import { loadStudentMenu } from './menu.js';

let currentVendorMenu = [];
let currentVendorId = null;
let currentVendorName = '';
let currentSearchText = '';
let currentPriceFilter = '';
let currentRatingFilter = '';

// =========================
// VENDOR PROFILE FUNCTIONS
// =========================

export function showVendorProfile(dataset) {
  const modal = document.getElementById('vendorProfileModal');
  const name = document.getElementById('vpm-name');
  const desc = document.getElementById('vpm-desc');
  const hours = document.getElementById('vpm-hours');
  const contact = document.getElementById('vpm-contact');

  if (!modal) return;

  if (name) name.textContent = dataset.vendorName || '';
  if (desc) desc.textContent = dataset.vendorDesc || '';
  if (hours) hours.textContent = dataset.vendorHours || '';
  if (contact) contact.textContent = dataset.vendorContact || '';

  const hoursRow = document.getElementById('vpm-hours-row');
  const contactRow = document.getElementById('vpm-contact-row');

  if (hoursRow) hoursRow.hidden = !dataset.vendorHours;
  if (contactRow) contactRow.hidden = !dataset.vendorContact;

  modal.hidden = false;
}

export function closeVendorProfile() {
  const modal = document.getElementById('vendorProfileModal');
  if (modal) modal.hidden = true;
}

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
    container.innerHTML =
      '<p style="color:var(--muted)">No items match your search or filters.</p>';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="menu-item">
      <div style="font-weight: bold;">${item.name}</div>
      <div>R${item.price}</div>
      <div style="font-size: 12px; color: var(--text-muted);">
        ${item.description || ''}
      </div>

      ${item.image_url
        ? `<img src="${item.image_url}"
             style="width: 100px; height: 100px; object-fit: cover;
             border-radius: 8px; margin-top: 8px;">`
        : ''
      }

      <button
        class="btn btn-primary btn-sm"
        onclick="window.addToCartFromVendor(
          '${item.id}',
          '${item.name}',
          ${item.price},
          '${currentVendorId}'
        )"
      >
        + Add to Cart
      </button>
    </div>
  `).join('');
}

// Sort by most ordered for this vendor
async function sortByMostOrdered() {
  if (!currentVendorMenu.length) return;

  const itemCounts = await getMostOrderedCounts();

  currentVendorMenu.sort(
    (a, b) => (itemCounts[b.id] || 0) - (itemCounts[a.id] || 0)
  );

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

  const searchContainer = document.getElementById('searchContainer');
  const filterPanel = document.getElementById('filterPanel');

  if (searchContainer) searchContainer.style.display = 'none';
  if (filterPanel) filterPanel.style.display = 'none';

  const { data: vendors, error } = await sb
    .from('vendors')
    .select('id, username, shop_name, description, opening_hours, contact')
    .eq('status', 'approved');

  if (error || !vendors || vendors.length === 0) {
    container.innerHTML =
      '<p style="color:var(--muted)">No vendors available yet.</p>';
    return;
  }

  container.innerHTML = vendors.map(vendor => {
    const displayName = vendor.shop_name || vendor.username;
    const hasProfile =
      vendor.description || vendor.opening_hours || vendor.contact;

    const esc = v =>
      String(v || '')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    return `
      <div class="menu-item">
        <div
          style="font-weight:bold;font-size:1.1rem;"
          title="${[
            vendor.opening_hours
              ? '🕐 ' + esc(vendor.opening_hours)
              : '',
            vendor.contact
              ? '📞 ' + esc(vendor.contact)
              : ''
          ].filter(Boolean).join(' | ')}"
        >
          🏪 ${esc(displayName)}
        </div>

        ${vendor.description
          ? `<div style="font-size:0.875rem;color:var(--text-muted);margin:0.35rem 0;">
              ${esc(vendor.description)}
            </div>`
          : ''
        }

        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
          <button
            class="btn btn-primary btn-sm"
            onclick="window.showVendorMenu('${esc(vendor.id)}', '${esc(displayName)}')"
          >
            View Menu →
          </button>

          ${hasProfile ? `
            <button
              class="btn btn-sm"
              style="background:var(--surface-alt);border:1px solid var(--border);"
              data-vendor-id="${esc(vendor.id)}"
              data-vendor-name="${esc(displayName)}"
              data-vendor-desc="${esc(vendor.description)}"
              data-vendor-hours="${esc(vendor.opening_hours)}"
              data-vendor-contact="${esc(vendor.contact)}"
              onclick="window.showVendorProfile(this.dataset)"
            >
              ℹ️ Profile
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Show menu for a specific vendor
export async function showVendorMenu(vendorId, vendorName) {
  const container = document.getElementById('menuContainer');
  const menuView = document.getElementById('menuView');
  const vendorsView = document.getElementById('vendorsView');
  const browseByMenuBtn = document.getElementById('browseByMenuBtn');
  const browseByVendorBtn = document.getElementById('browseByVendorBtn');

  if (!container) return;

  if (menuView && vendorsView) {
    menuView.style.display = 'block';
    vendorsView.style.display = 'none';
  }

  if (browseByMenuBtn && browseByVendorBtn) {
    browseByMenuBtn.className = 'btn btn-primary';

    browseByVendorBtn.className = 'btn';
    browseByVendorBtn.style.background = 'var(--surface-alt)';
    browseByVendorBtn.style.color = 'var(--text)';
  }

  const searchContainer = document.getElementById('searchContainer');
  const filterPanel = document.getElementById('filterPanel');

  if (searchContainer) searchContainer.style.display = 'block';
  if (filterPanel) filterPanel.style.display = 'block';

  container.innerHTML =
    `<p style="color:var(--muted)">Loading ${vendorName}'s menu...</p>`;

  const { data: menu, error } = await sb
    .from('menu')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('status', 'available');

  if (error || !menu || menu.length === 0) {
    container.innerHTML =
      `<p style="color:var(--muted)">No items available from ${vendorName} yet.</p>`;
    return;
  }

  currentVendorId = vendorId;
  currentVendorName = vendorName;

  currentVendorMenu = menu.map(item => ({
    ...item,
    vendor_name: vendorName,
    vendor_id: vendorId
  }));

  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';

  const menuHeading = document.querySelector('#menuView h2');

  if (menuHeading) {
    menuHeading.innerHTML = `
      ${vendorName} Menu
      <button
        onclick="window.resetToAllMenu()"
        style="margin-left:1rem;padding:0.25rem 0.75rem;font-size:0.8rem;"
        class="btn"
      >
        Back to All Menu
      </button>
    `;
  }

  setupFilterListeners();

  await renderVendorMenu();

  const savedCart = sessionStorage.getItem('cart');

  if (savedCart) {
    setCart(JSON.parse(savedCart));
    updateCartDisplay();
  }
}

// Reset to all menu view
export function resetToAllMenu() {
  currentVendorMenu = [];
  currentVendorId = null;
  currentVendorName = '';
  currentSearchText = '';
  currentPriceFilter = '';
  currentRatingFilter = '';

  const menuHeading = document.querySelector('#menuView h2');

  if (menuHeading) {
    menuHeading.innerHTML = 'Available Menu';
  }

  const filterPanel = document.getElementById('filterPanel');

  if (filterPanel) {
    filterPanel.style.display = 'none';
  }

  const searchInput = document.getElementById('searchInput');

  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = null;
  }

  loadStudentMenu();
}

// Make functions global
window.showVendorMenu = showVendorMenu;
window.resetToAllMenu = resetToAllMenu;
window.showVendorProfile = showVendorProfile;
window.closeVendorProfile = closeVendorProfile;

window.addToCartFromVendor = (itemId, name, price, vendorId) => {
  const cart = JSON.parse(sessionStorage.getItem('cart') || '[]');

  cart.push({
    id: itemId,
    name,
    price,
    vendor_id: vendorId
  });

  sessionStorage.setItem('cart', JSON.stringify(cart));

  updateCartDisplay();

  const toast = document.getElementById('toast');

  if (toast) {
    toast.textContent = `${name} added to cart`;
    toast.className = 'show success';

    setTimeout(() => {
      toast.className = '';
    }, 3000);
  }
};
```
