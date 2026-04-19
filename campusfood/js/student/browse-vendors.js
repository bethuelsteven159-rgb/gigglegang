import { sb } from '../config/supabase.js';
import { updateCartDisplay, getCart, setCart } from './cart.js';
import { loadStudentMenu } from './menu.js';

export async function loadVendorsList() {
  const container = document.getElementById('vendorsContainer');
  if (!container) return;

  const { data: vendors, error } = await sb
    .from('vendors')
    .select('id, username')
    .eq('status', 'approved');

  if (error || !vendors || vendors.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No vendors available yet.</p>';
    return;
  }

  container.innerHTML = vendors.map(vendor => `
    <div class="menu-item" style="cursor: pointer;" onclick="showVendorMenu('${vendor.id}', '${vendor.username}')">
      <div style="font-weight: bold; font-size: 1.2rem;">🏪 ${vendor.username}</div>
      <div style="color: var(--accent); margin-top: 0.5rem;">Click to view menu →</div>
    </div>
  `).join('');
}

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

  const menuHeading = document.querySelector('#menuView h2');
  if (menuHeading) {
    menuHeading.innerHTML = `${vendorName} Menu <button onclick="resetToAllMenu()" style="margin-left: 1rem; padding: 0.25rem 0.75rem; font-size: 0.8rem;" class="btn">Back to All Menu</button>`;
  }

  container.innerHTML = menu.map(item => `
    <div class="menu-item">
      <div style="font-weight: bold;">${item.name}</div>
      <div>R${item.price}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.description || ''}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
      <button class="btn btn-primary btn-sm" onclick="addToCart('${item.id}', '${item.name}', ${item.price}, '${vendorId}')">
        + Add to Cart
      </button>
    </div>
  `).join('');

  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    setCart(JSON.parse(savedCart));
    updateCartDisplay();
  }
}

export function resetToAllMenu() {
  const menuHeading = document.querySelector('#menuView h2');
  if (menuHeading) {
    menuHeading.innerHTML = 'Available Menu';
  }
  loadStudentMenu();
}
