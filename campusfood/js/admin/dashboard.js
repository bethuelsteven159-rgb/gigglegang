import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://mslvqduxmkuusuyaewej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbHZxZHV4bWt1dXN1eWFld2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODkzNDcsImV4cCI6MjA5MTU2NTM0N30.VxvR39nI5lNK_JZ6fwctQJgAH06YhbCTd8bXuiLpJgs'
);

export function renderAdminName() {
  const username = sessionStorage.getItem('username') || 'Admin';
  const name = document.getElementById('adminName');
  const welcome = document.getElementById('adminNameWelcome');
  if (name) name.textContent = username;
  if (welcome) welcome.textContent = username;
}

renderAdminName();

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/gigglegang/index.html';
  });
}
