export function getUserId() {
  return localStorage.getItem("user_id");
}

export function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

window.logout = logout;
