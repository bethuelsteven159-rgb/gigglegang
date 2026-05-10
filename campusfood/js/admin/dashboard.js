export function renderAdminName() {
  const username = sessionStorage.getItem('username') || 'Admin';
  const name = document.getElementById('adminName');
  const welcome = document.getElementById('adminNameWelcome');

  if (name) name.textContent = username;
  if (welcome) welcome.textContent = username;
}
