import { sb } from '../config/supabase.js';
import { setCart, updateCartDisplay } from './cart.js';

let currentAllMenu = [];
let currentSearchText = '';

// Render menu with search filter only
async function renderMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;

  if (!currentAllMenu.length) {
    container.innerHTML = '<p style="color:var(--muted)">No menu available yet.</p>';
    return;
  }

  let filtered = [...currentAllMenu];

  // Apply search only
  if (currentSearchText) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(currentSearchText.toLowerCase())
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No items match your search.</p>';
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="menu-item">
      <div style="font-weight: bold;">${item.name}</div>
      <div>R${item.price}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.vendor_name}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.description || ''}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
      <button class="btn btn-primary btn-sm" onclick="window.addToCartFromMenu('${item.id}', '${item.name}', ${item.price}, '${item.vendor_id}')">
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

  // Reset search
  currentSearchText = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

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

  await renderMenu();

  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    setCart(JSON.parse(savedCart));
    updateCartDisplay();
  }
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
