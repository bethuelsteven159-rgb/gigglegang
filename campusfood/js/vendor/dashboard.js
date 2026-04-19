export function renderVendorName() {
  const username = sessionStorage.getItem('username') || 'Vendor';
  const name = document.getElementById('vendorName');
  const welcome = document.getElementById('vendorNameWelcome');

  if (name) name.textContent = username;
  if (welcome) welcome.textContent = username;
}
