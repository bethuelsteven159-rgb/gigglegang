import { sb } from '../config/supabase.js';

export function setLoadingMessage(message = '') {
  const loadingText = document.getElementById('loadingText');
  const googleBtn = document.getElementById('googleLoginBtn');
  const saveRoleBtn = document.getElementById('saveRoleBtn');

  const isLoading = Boolean(message);

  if (loadingText) {
    loadingText.style.display = isLoading ? 'block' : 'none';
    loadingText.textContent = message;
  }

  if (googleBtn) googleBtn.disabled = isLoading;
  if (saveRoleBtn) saveRoleBtn.disabled = isLoading;
}

export function showRoleSection(show = true) {
  const roleSection = document.getElementById('roleSection');
  if (roleSection) {
    roleSection.style.display = show ? 'block' : 'none';
  }
}

export function getUsernameFromUser(user) {
  const fullName = user?.user_metadata?.full_name;
  if (fullName?.trim()) return fullName.trim();

  const email = user?.email || '';
  return email.split('@')[0] || 'user';
}

export function redirectByRole(role) {
  const routes = {
    admin: 'dashboard_admin.html',
    vendor: 'dashboard_vendor.html',
    student: 'dashboard_student.html',
  };

  window.location.href = routes[role] || 'dashboard_student.html';
}

export async function getVendorId(username) {
  if (!username) return null;

  const { data, error } = await sb
    .from('vendors')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error || !data) {
    console.warn('Vendor not found for username:', username, error);
    return null;
  }

  return data.id;
}

export async function getStudentId(username) {
  if (!username) return null;

  const { data, error } = await sb
    .from('students')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error || !data) {
    console.warn('Student not found for username:', username, error);
    return null;
  }

  return data.id;
}
