import { sb } from '../config/supabase.js';
import { setCart, updateCartDisplay } from './cart.js';

export async function loadStudentMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;

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

  if (allMenu.length === 0) {
    container.innerHTML = '<p>No menu available yet.</p>';
    return;
  }

  container.innerHTML = allMenu.map(item => `
    <div class="menu-item">
      <div style="font-weight: bold;">${item.name}</div>
      <div>R${item.price}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.vendor_name}</div>
      <div style="font-size: 12px; color: var(--text-muted);">${item.description || ''}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
      <button class="btn btn-primary btn-sm" onclick="addToCart('${item.id}', '${item.name}', ${item.price}, '${item.vendor_id}')">
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
