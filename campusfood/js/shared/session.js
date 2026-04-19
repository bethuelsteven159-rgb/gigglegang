import { sb } from '../config/supabase.js';

export function storeSessionUser(user, role, username) {
  sessionStorage.setItem('userId', user.id);
  sessionStorage.setItem('email', user.email || '');
  sessionStorage.setItem('username', username);
  sessionStorage.setItem('role', role);
}

export function getSessionUsername() {
  return sessionStorage.getItem('username');
}

export function getSessionRole() {
  return sessionStorage.getItem('role');
}

export function clearSession() {
  sessionStorage.clear();
}

export async function logout() {
  try {
    await sb.auth.signOut();
  } catch (err) {
    console.error('Logout error:', err);
  }

  clearSession();
  window.location.href = 'index.html';
}
