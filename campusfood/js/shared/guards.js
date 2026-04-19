import { sb } from "../config/supabase.js";

function redirectToHome() {
  const currentPath = window.location.pathname.toLowerCase();

  if (
    currentPath.includes("/pages/") ||
    currentPath.includes("/admin/") ||
    currentPath.includes("/vendor/") ||
    currentPath.includes("/student/")
  ) {
    window.location.href = "../index.html";
  } else {
    window.location.href = "index.html";
  }
}

export function requireRole(expectedRole) {
  const role = sessionStorage.getItem("role");

  if (role !== expectedRole) {
    redirectToHome();
    return false;
  }

  return true;
}

export async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();

  if (userError || !user) {
    redirectToHome();
    return false;
  }

  const { data, error } = await sb
    .from("admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (error || !data) {
    alert("Access denied. Admins only.");
    redirectToHome();
    return false;
  }

  return true;
}

export async function requireVendor() {
  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();

  if (userError || !user) {
    redirectToHome();
    return false;
  }

  const { data, error } = await sb
    .from("vendors")
    .select("id, username, status")
    .eq("username", user.user_metadata?.username || user.email?.split("@")[0])
    .maybeSingle();

  if (error || !data) {
    alert("Access denied. Vendors only.");
    redirectToHome();
    return false;
  }

  return true;
}

export async function requireStudent() {
  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();

  if (userError || !user) {
    redirectToHome();
    return false;
  }

  const { data, error } = await sb
    .from("students")
    .select("id, username")
    .eq("username", user.user_metadata?.username || user.email?.split("@")[0])
    .maybeSingle();

  if (error || !data) {
    alert("Access denied. Students only.");
    redirectToHome();
    return false;
  }

  return true;
}
