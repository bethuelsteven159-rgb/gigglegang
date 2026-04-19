import { sb } from '../config/supabase.js';

export function storeSessionUser(user, role, username) {
  sessionStorage.setItem('userId', user.id);
  sessionStorage.setItem('email', user.email || '');
  sessionStorage.setItem('username', username);
  sessionStorage.setItem('role', role);
}

export function getSessionUserId() {
  return sessionStorage.getItem('userId');
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

export async function getUserId() {
  const { data, error } = await sb.auth.getSession();

  if (error) {
    console.error('getUserId session error:', error);
    return null;
  }

  return data?.session?.user?.id || null;
}

export async function logout() {
  try {
    await sb.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
  }

  clearSession();
  localStorage.removeItem('cart');
  window.location.href = 'index.html';
}
