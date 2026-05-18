import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import { getVendorId } from '../shared/auth-helpers.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getVal(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

export async function loadVendorProfile() {
  const username = sessionStorage.getItem('username');
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    toast('Vendor not found', 'error');
    return;
  }

  const { data, error } = await sb
    .from('vendors')
    .select('username, shop_name, description, opening_hours, contact')
    .eq('id', vendorId)
    .single();

  if (error || !data) {
    console.error('Load profile error:', error);
    toast('Failed to load profile', 'error');
    return;
  }

  // Populate name badge in nav
  const nameEl = document.getElementById('vendorName');
  if (nameEl) nameEl.textContent = data.username || '';

  setVal('shopName',      data.shop_name);
  setVal('description',   data.description);
  setVal('openingHours',  data.opening_hours);
  setVal('contact',       data.contact);
}

export async function saveVendorProfile() {
  const shopName     = getVal('shopName');
  const description  = getVal('description');
  const openingHours = getVal('openingHours');
  const contact      = getVal('contact');

  if (!shopName) {
    toast('Shop name is required', 'error');
    return;
  }

  const username = sessionStorage.getItem('username');
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    toast('Vendor not found', 'error');
    return;
  }

  const { error } = await sb
    .from('vendors')
    .update({
      shop_name:     shopName,
      description:   description || null,
      opening_hours: openingHours || null,
      contact:       contact || null,
      updated_at:    new Date().toISOString()
    })
    .eq('id', vendorId);

  if (error) {
    console.error('Save profile error:', error);
    toast('Failed to save profile', 'error');
    return;
  }

  toast('Profile saved successfully');

  // Refresh the preview card
  renderProfilePreview({ shopName, description, openingHours, contact });
}

export function renderProfilePreview({ shopName, description, openingHours, contact }) {
  const preview = document.getElementById('profilePreview');
  if (!preview) return;

  const hasAny = shopName || description || openingHours || contact;

  if (!hasAny) {
    preview.innerHTML = '<p style="color:var(--text-muted)">Fill in your details and save to see a preview.</p>';
    return;
  }

  preview.innerHTML = `
    <div class="profile-card-preview">
      <div class="preview-shop-name">${escapeHtml(shopName || 'Your Shop')}</div>
      ${description ? `<p class="preview-description">${escapeHtml(description)}</p>` : ''}
      <div class="preview-meta">
        ${openingHours ? `<div class="preview-row">🕐 <span>${escapeHtml(openingHours)}</span></div>` : ''}
        ${contact      ? `<div class="preview-row">📞 <span>${escapeHtml(contact)}</span></div>`      : ''}
      </div>
    </div>
  `;
}
