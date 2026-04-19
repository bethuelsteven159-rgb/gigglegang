import { sb } from "../config/supabase.js";

export async function getUserId() {
  const { data, error } = await sb.auth.getSession();

  if (error) {
    console.error("getUserId session error:", error);
    return null;
  }

  const user = data?.session?.user || null;
  console.log("getUserId user:", user);

  return user?.id || null;
}

export async function logout() {
  await sb.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "index.html";
}

window.logout = logout;
