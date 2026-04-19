export function requireRole(expectedRole) {
  const role = sessionStorage.getItem('role');
  if (role !== expectedRole) {
    window.location.href = 'index.html';
  }
}
