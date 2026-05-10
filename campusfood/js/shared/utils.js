import { sb } from '../config/supabase.js';

export function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => el.className = '', 3000);
}

export async function logout() {
  try {
    await sb.auth.signOut();
  } catch(e) {
    console.error(e);
  }
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = 'index.html';
}

export function checkAuth(requiredRole) {
  const role = sessionStorage.getItem('role');
  const userId = sessionStorage.getItem('userId');
  
  if (!userId) {
    window.location.href = 'index.html';
    return false;
  }
  
  if (requiredRole && role !== requiredRole) {
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}
