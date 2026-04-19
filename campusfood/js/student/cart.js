import { toast } from '../shared/notifications.js';

let cart = [];

export function getCart() {
  return cart;
}

export function setCart(newCart) {
  cart = Array.isArray(newCart) ? newCart : [];
}

export function addToCart(itemId, name, price, vendorId) {
  cart.push({ id: itemId, name, price, vendor_id: vendorId });
  sessionStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
  toast(`${name} added to cart`);
}

export function removeFromCart(index) {
  cart.splice(index, 1);
  sessionStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
}

export function updateCartDisplay() {
  const cartPanel = document.getElementById('cartPanel');
  const cartItems = document.getElementById('cartItems');
  const cartTotalSpan = document.getElementById('cartTotal');

  if (!cartPanel || !cartItems || !cartTotalSpan) return;

  if (cart.length === 0) {
    cartPanel.style.display = 'none';
    return;
  }

  cartPanel.style.display = 'block';

  cartItems.innerHTML = cart.map((item, idx) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #ddd;">
      <span>${item.name}</span>
      <span>
        R${item.price}
        <button onclick="removeFromCart(${idx})">✕</button>
      </span>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotalSpan.textContent = `R${total}`;
}
