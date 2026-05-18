import { requireRole } from '../shared/guards.js';
import { loadVendorProfile, saveVendorProfile } from '../vendor/profile.js';
import { logout } from '../shared/session.js';

export async function initVendorProfilePage() {
  if (!requireRole('vendor')) return;

  window.logout = logout;
  window.saveVendorProfile = saveVendorProfile;

  await loadVendorProfile();
}
