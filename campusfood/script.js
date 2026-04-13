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

function setLoading(isLoading, text = "Checking your account...") {
  const loadingText = document.getElementById("loadingText");
  const googleBtn = document.getElementById("googleLoginBtn");
  const saveRoleBtn = document.getElementById("saveRoleBtn");

  if (loadingText) {
    loadingText.style.display = isLoading ? "block" : "none";
    loadingText.textContent = text;
  }

  if (googleBtn) googleBtn.disabled = isLoading;
  if (saveRoleBtn) saveRoleBtn.disabled = isLoading;
}

function getUsernameFromUser(user) {
  const metaUsername = user?.user_metadata?.username;
  if (metaUsername && metaUsername.trim()) return metaUsername.trim();

  const fullName = user?.user_metadata?.full_name;
  if (fullName && fullName.trim()) return fullName.trim();

  const email = user?.email || "";
  return email.split("@")[0] || "user";
}

function showRoleSection(show = true) {
  const roleSection = document.getElementById("roleSection");
  if (roleSection) roleSection.style.display = show ? "block" : "none";
}

function storeSessionUser(user, role, username) {
  sessionStorage.setItem("userId", user.id);
  sessionStorage.setItem("email", user.email || "");
  sessionStorage.setItem("username", username || getUsernameFromUser(user));
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

// ==================== GOOGLE LOGIN ====================
async function signInWithGoogle() {
  try {
    console.log("Google button clicked");

    setLoading(true, "Redirecting to Google...");

    const redirectTo = "https://bethuelsteven159-rgb.github.io/gigglegang/";

    const { data, error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    console.log("OAuth result:", data, error);

    if (error) throw error;
  } catch (err) {
    console.error("Google sign-in error:", err);
    toast(err.message || "Google sign-in failed", "error");
    setLoading(false);
  }
}

async function getExistingRole(user) {
  const email = user.email || "";
  const username = getUsernameFromUser(user);

  if (email === "admin123@campusfood.com") {
    return { role: "admin", username };
  }

  const { data: vendorData } = await sb
    .from("vendors")
    .select("id, username, status")
    .eq("id", user.id)
    .maybeSingle();

  if (vendorData) {
    return {
      role: "vendor",
      username: vendorData.username || username,
      status: vendorData.status || "pending"
    };
  }

  const { data: studentData } = await sb
    .from("students")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (studentData) {
    return {
      role: "student",
      username: studentData.username || username
    };
  }

  return null;
}

async function handleLoggedInUser() {
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    const session = data.session;
    if (!session || !session.user) {
      setLoading(false);
      return;
    }

    const user = session.user;
    const username = getUsernameFromUser(user);
    const existing = await getExistingRole(user);

    if (!existing) {
      showRoleSection(true);
      setLoading(false);
      return;
    }

    storeSessionUser(user, existing.role, existing.username || username);
    redirectByRole(existing.role);
  } catch (err) {
    console.error("Session handling error:", err);
    toast(err.message || "Failed to check login session", "error");
    setLoading(false);
  }
}

async function saveRoleForFirstTimeUser() {
  try {
    setLoading(true, "Saving your account type...");

    const chosenRole = document.getElementById("roleSelect")?.value;

    if (!chosenRole) {
      toast("Please choose a role", "error");
      setLoading(false);
      return;
    }

    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;
    if (!user) {
      toast("No active session found. Please sign in again.", "error");
      setLoading(false);
      return;
    }

    const username = getUsernameFromUser(user);

    await sb.auth.updateUser({
      data: {
        username,
        role: chosenRole
      }
    });

    if (chosenRole === "vendor") {
      const { error: insertVendorError } = await sb
        .from("vendors")
        .upsert([{
          id: user.id,
          username,
          status: "pending"
        }], { onConflict: "id" });

      if (insertVendorError) throw insertVendorError;

      storeSessionUser(user, "vendor", username);
      redirectByRole("vendor");
      return;
    }

    if (chosenRole === "student") {
      const { error: insertStudentError } = await sb
        .from("students")
        .upsert([{
          id: user.id,
          username
        }], { onConflict: "id" });

      if (insertStudentError) throw insertStudentError;

      storeSessionUser(user, "student", username);
      redirectByRole("student");
      return;
    }

    setLoading(false);
  } catch (err) {
    console.error("Save role error:", err);
    toast(err.message || "Failed to save role", "error");
    setLoading(false);
  }
}

// ==================== STARTUP ====================
window.addEventListener("load", async () => {
  console.log("script loaded");

  const googleBtn = document.getElementById("googleLoginBtn");
  const saveRoleBtn = document.getElementById("saveRoleBtn");

  console.log("googleBtn =", googleBtn);
  console.log("saveRoleBtn =", saveRoleBtn);

  if (googleBtn) {
    googleBtn.onclick = signInWithGoogle;
  }

  if (saveRoleBtn) {
    saveRoleBtn.onclick = saveRoleForFirstTimeUser;
  }

  await handleLoggedInUser();
});
