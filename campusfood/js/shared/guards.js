import { sb } from '../config/supabase.js';

function redirectToHome() {
  window.location.href = 'index.html';
}

export function requireRole(expectedRole) {
  const role = sessionStorage.getItem('role');

  if (role !== expectedRole) {
    redirectToHome();
    return false;
  }

  return true;
}

export async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();

  if (userError || !user) {
    redirectToHome();
    return false;
  }

  const { data, error } = await sb
    .from('admins')
    .select('email')
    .eq('email', user.email)
    .maybeSingle();

  if (error || !data) {
    alert('Access denied. Admins only.');
    redirectToHome();
    return false;
  }

  return true;
}

export async function requireVendor() {
  const userId = sessionStorage.getItem('userId');

  if (!userId) {
    redirectToHome();
    return false;
  }

  const { data, error } = await sb
    .from('vendors')
    .select('id, username, status')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    alert('Access denied. Vendors only.');
    redirectToHome();
    return false;
  }

  return true;
}

export async function requireStudent() {
  const userId = sessionStorage.getItem('userId');

  if (!userId) {
    redirectToHome();
    return false;
  }

  const { data, error } = await sb
    .from('students')
    .select('id, username')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    alert('Access denied. Students only.');
    redirectToHome();
    return false;
  }

  return true;
}
