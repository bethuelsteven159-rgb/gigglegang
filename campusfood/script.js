// ==================== SUPABASE CONFIGURATION ====================
const SUPABASE_URL = 'https://mslvqduxmkuusuyaewej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbHZxZHV4bWt1dXN1eWFld2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODkzNDcsImV4cCI6MjA5MTU2NTM0N30.VxvR39nI5lNK_JZ6fwctQJgAH06YhbCTd8bXuiLpJgs';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== GLOBAL VARIABLES ====================
let cart = [];

// ==================== HELPERS ====================
function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  if (!el) {
    alert(msg);
    return;
  }

  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => {
    el.className = "";
  }, 3000);
}

function showRoleSection(show = true) {
  const roleSection = document.getElementById("roleSection");
  if (roleSection) roleSection.style.display = show ? "block" : "none";
}

function setLoadingMessage(msg = "") {
  const loadingText = document.getElementById("loadingText");
  if (!loadingText) return;

  if (msg) {
    loadingText.style.display = "block";
    loadingText.textContent = msg;
  } else {
    loadingText.style.display = "none";
    loadingText.textContent = "";
  }
}

function getUsernameFromUser(user) {
  const fullName = user?.user_metadata?.full_name;
  if (fullName && fullName.trim()) return fullName.trim();

  const email = user?.email || "";
  return email.split("@")[0] || "user";
}

function storeSessionUser(user, role, username) {
  sessionStorage.setItem("userId", user.id);
  sessionStorage.setItem("email", user.email || "");
  sessionStorage.setItem("username", username);
  sessionStorage.setItem("role", role);
}

function redirectByRole(role) {
  const routes = {
    admin: "dashboard_admin.html",
    vendor: "dashboard_vendor.html",
    student: "dashboard_student.html",
  };

  window.location.href = routes[role] || "dashboard_student.html";
}

// ==================== AUTH ====================
async function signInWithGoogle() {
  try {
    setLoadingMessage("Redirecting to Google...");

    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://bethuelsteven159-rgb.github.io/gigglegang/"
      }
    });

    if (error) throw error;
  } catch (err) {
    console.error("Google login error:", err);
    toast(err.message || "Google sign in failed", "error");
    setLoadingMessage("");
  }
}

async function getExistingRole(user) {
  const username = getUsernameFromUser(user);

  if (user.email === "admin123@campusfood.com") {
    return { role: "admin", username };
  }

  const { data: vendorData, error: vendorError } = await sb
    .from("vendors")
    .select("id, username, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!vendorError && vendorData) {
    return {
      role: "vendor",
      username: vendorData.username || username,
      status: vendorData.status || "pending"
    };
  }

  const { data: studentData, error: studentError } = await sb
    .from("students")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (!studentError && studentData) {
    return {
      role: "student",
      username: studentData.username || username
    };
  }

  return null;
}

async function checkLoginAfterRedirect() {
  try {
    setLoadingMessage("Checking your account...");

    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;
    if (!user) {
      setLoadingMessage("");
      return;
    }

    const username = getUsernameFromUser(user);
    const existingRole = await getExistingRole(user);

    if (!existingRole) {
      setLoadingMessage("");
      showRoleSection(true);
      return;
    }

    storeSessionUser(user, existingRole.role, existingRole.username || username);
    redirectByRole(existingRole.role);
  } catch (err) {
    console.error("Session check error:", err);
    toast(err.message || "Failed to check login", "error");
    setLoadingMessage("");
  }
}

async function saveRoleForFirstTimeUser() {
  try {
    setLoadingMessage("Saving account type...");

    const role = document.getElementById("roleSelect")?.value;
    if (!role) {
      toast("Choose a role first", "error");
      setLoadingMessage("");
      return;
    }

    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;
    if (!user) {
      toast("Please sign in with Google first", "error");
      setLoadingMessage("");
      return;
    }

    const username = getUsernameFromUser(user);

    if (role === "vendor") {
      const { error: vendorError } = await sb
        .from("vendors")
        .upsert([{
          id: user.id,
          username: username,
          status: "pending"
        }], { onConflict: "id" });

      if (vendorError) throw vendorError;
    }

    if (role === "student") {
      const { error: studentError } = await sb
        .from("students")
        .upsert([{
          id: user.id,
          username: username
        }], { onConflict: "id" });

      if (studentError) throw studentError;
    }

    await sb.auth.updateUser({
      data: {
        role: role,
        username: username
      }
    });

    storeSessionUser(user, role, username);
    redirectByRole(role);
  } catch (err) {
    console.error("Save role error:", err);
    toast(err.message || "Failed to save role", "error");
    setLoadingMessage("");
  }
}

// ==================== STARTUP ====================
document.addEventListener("DOMContentLoaded", () => {
  const googleBtn = document.getElementById("googleLoginBtn");
  const saveRoleBtn = document.getElementById("saveRoleBtn");

  if (googleBtn) googleBtn.addEventListener("click", signInWithGoogle);
  if (saveRoleBtn) saveRoleBtn.addEventListener("click", saveRoleForFirstTimeUser);

  checkLoginAfterRedirect();
});

// ==================== LOGOUT ====================
async function logout() {
  try {
    await sb.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  }

  sessionStorage.clear();
  window.location.href = "index.html";
}
