import { sb } from "../config/supabase.js";

export async function getUserId() {
  const {
    data: { user },
    error
  } = await sb.auth.getUser();

  if (error) {
    console.error("getUserId error:", error);
    return null;
  }

  return user ? user.id : null;
}

export function logout() {
  sb.auth.signOut().finally(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "index.html";
  });
}

window.logout = logout;
