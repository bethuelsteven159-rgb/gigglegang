// ==================== SUPABASE CONFIGURATION ====================
const SUPABASE_URL = 'https://mslvqduxmkuusuyaewej.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

// IMPORTANT:
// Paste your exact anon key from your current script.js above.
// I removed it here only so you do not keep exposing it everywhere publicly.

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
  if (roleSection) {
    roleSection.style.display = show ? "block" : "none";
  }
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

async function logout() {
  try {
    await sb.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  }
  sessionStorage.clear();
  window.location.href = "index.html";
}

async function getVendorId(username) {
  const { data, error } = await sb
    .from("vendors")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

async function getStudentId(username) {
  const { data, error } = await sb
    .from("students")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

// ==================== AUTH / ROLE LOGIC ====================
async function signInWithGoogle() {
  try {
    setLoading(true, "Redirecting to Google...");

    const redirectTo = window.location.origin + window.location.pathname;

    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account"
        }
      }
    });

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

  // Optional admin shortcut
  if (email === "admin123@campusfood.com") {
    return { role: "admin", username };
  }

  // Check vendors table first
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

  // Check students table
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

async function handleLoggedInUser() {
  try {
    setLoading(true, "Checking your account...");

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

    if (existing.role === "vendor" && existing.status === "pending") {
      toast("Vendor account found. Awaiting admin approval.", "success");
    }

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

    const roleSelect = document.getElementById("roleSelect");
    const chosenRole = roleSelect?.value;

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

    // Save role in auth metadata too
    const { error: updateError } = await sb.auth.updateUser({
      data: {
        username,
        role: chosenRole
      }
    });

    if (updateError) {
      console.error("Metadata update warning:", updateError);
    }

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
      toast("Vendor account created. Awaiting admin approval.");
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
      toast("Student account created successfully!");
      redirectByRole("student");
      return;
    }

    toast("Invalid role selected", "error");
    setLoading(false);
  } catch (err) {
    console.error("Save role error:", err);
    toast(err.message || "Failed to save role", "error");
    setLoading(false);
  }
}

// ==================== ADMIN: VENDOR CONTROL ====================
async function loadVendors() {
  const tbody = document.getElementById("vendorBody");
  if (!tbody) return;

  const { data, error } = await sb
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--danger)">Failed to load</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted)">No vendors yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(v => `
    <tr>
      <td>${v.username}</td>
      <td><span class="status status-${v.status}">${v.status}</span></td>
      <td style="display:flex; gap:0.5rem;">
        ${v.status !== "approved"
          ? `<button class="btn btn-sm" style="background:var(--success);color:#fff" onclick="updateVendorStatus('${v.id}', 'approved')">Approve</button>`
          : `<button class="btn btn-sm" style="background:#f59e0b;color:#fff" onclick="updateVendorStatus('${v.id}', 'suspended')">Suspend</button>`
        }
        <button class="btn btn-sm btn-danger" onclick="deleteVendor('${v.id}')">Remove</button>
      </td>
    </tr>
  `).join("");
}

async function updateVendorStatus(vendorId, status) {
  const { error } = await sb
    .from("vendors")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", vendorId);

  if (error) {
    toast("Update failed", "error");
  } else {
    toast(`Vendor ${status}`);
    loadVendors();
  }
}

async function deleteVendor(vendorId) {
  if (!confirm("Remove this vendor?")) return;

  const { error } = await sb
    .from("vendors")
    .delete()
    .eq("id", vendorId);

  if (error) {
    toast("Delete failed", "error");
  } else {
    toast("Vendor removed");
    loadVendors();
  }
}

// ==================== VENDOR: MENU MANAGEMENT ====================
async function loadVendorMenu() {
  const container = document.getElementById("vendorMenu");
  if (!container) return;

  const username = sessionStorage.getItem("username");
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    container.innerHTML = '<p style="color:var(--danger)">Vendor not found</p>';
    return;
  }

  const { data, error } = await sb
    .from("menu")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: true });

  if (error) {
    container.innerHTML = '<p style="color:var(--danger)">Failed to load menu</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No items yet. Add one above.</p>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="menu-item ${item.status === "sold_out" ? "sold-out" : ""}">
      <div class="item-name">${item.name}</div>
      <div class="item-price">R${item.price}</div>
      ${item.status === "sold_out" ? '<span class="badge">Sold Out</span>' : ""}
      <div class="item-actions">
        <button class="btn btn-sm" style="background:var(--teal-light);color:var(--teal-dark)"
          onclick="toggleSoldOut(${item.id}, ${item.status === "sold_out"})">
          ${item.status === "sold_out" ? "Mark Available" : "Mark Sold Out"}
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteMenuItem(${item.id})">Delete</button>
      </div>
    </div>
  `).join("");
}

async function addMenuItem() {
  const nameEl = document.getElementById("itemName");
  const priceEl = document.getElementById("itemPrice");
  const name = nameEl?.value.trim();
  const price = Number(priceEl?.value);
  const username = sessionStorage.getItem("username");

  if (!name || !price) {
    toast("Fill in both fields", "error");
    return;
  }

  const vendorId = await getVendorId(username);
  if (!vendorId) {
    toast("Vendor not found", "error");
    return;
  }

  const { error } = await sb
    .from("menu")
    .insert([{ vendor_id: vendorId, name, price, status: "available" }]);

  if (error) {
    toast("Failed to add item: " + error.message, "error");
  } else {
    toast("Item added!");
    nameEl.value = "";
    priceEl.value = "";
    loadVendorMenu();
  }
}

async function toggleSoldOut(itemId, currentlySoldOut) {
  const newStatus = currentlySoldOut ? "available" : "sold_out";

  const { error } = await sb
    .from("menu")
    .update({ status: newStatus })
    .eq("id", itemId);

  if (error) {
    toast("Update failed", "error");
  } else {
    toast(currentlySoldOut ? "Item available again" : "Marked as sold out");
    loadVendorMenu();
  }
}

async function deleteMenuItem(itemId) {
  if (!confirm("Delete this item?")) return;

  const { error } = await sb
    .from("menu")
    .delete()
    .eq("id", itemId);

  if (error) {
    toast("Delete failed", "error");
  } else {
    toast("Item deleted");
    loadVendorMenu();
  }
}

// ==================== VENDOR: ORDERS ====================
async function loadVendorOrders() {
  const tbody = document.getElementById("ordersBody");
  if (!tbody) return;

  const username = sessionStorage.getItem("username");
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    tbody.innerHTML = '<tr><td colspan="6">Vendor not found</td></tr>';
    return;
  }

  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="6">Failed to load orders</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No orders yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.student_username}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(", ") : ""}</td>
      <td>R${order.total_price}</td>
      <td><span class="status status-${order.status}">${order.status}</span></td>
      <td>
        <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding:4px;border-radius:4px;">
          <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>Confirmed</option>
          <option value="completed" ${order.status === "completed" ? "selected" : ""}>Completed</option>
          <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
    </tr>
  `).join("");
}

async function updateOrderStatus(orderId, newStatus) {
  const { error } = await sb
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    toast("Update failed", "error");
  } else {
    toast(`Order status updated to ${newStatus}`);
    loadVendorOrders();
  }
}

// ==================== STUDENT: MENU & CART ====================
async function loadStudentMenu() {
  const container = document.getElementById("menuContainer");
  if (!container) return;

  const { data: vendors, error: vendorError } = await sb
    .from("vendors")
    .select("id, username")
    .eq("status", "approved");

  if (vendorError || !vendors) {
    container.innerHTML = '<p style="color:var(--danger)">Failed to load menu</p>';
    return;
  }

  let allMenu = [];

  for (const vendor of vendors) {
    const { data: menu, error: menuError } = await sb
      .from("menu")
      .select("*")
      .eq("vendor_id", vendor.id)
      .eq("status", "available");

    if (!menuError && menu) {
      allMenu.push(...menu.map(item => ({
        ...item,
        vendor_name: vendor.username,
        vendor_id: vendor.id
      })));
    }
  }

  if (allMenu.length === 0) {
    container.innerHTML = '<p style="color:var(--muted)">No menu available yet.</p>';
    return;
  }

  container.innerHTML = allMenu.map(item => `
    <div class="menu-item">
      <div class="item-name">${item.name}</div>
      <div class="item-price">R${item.price}</div>
      <div style="font-size:12px;color:var(--muted)">${item.vendor_name}</div>
      <button class="btn btn-primary btn-sm" onclick="addToCart('${item.id}', '${item.name}', ${item.price}, '${item.vendor_id}')">
        + Add to Cart
      </button>
    </div>
  `).join("");

  const savedCart = sessionStorage.getItem("cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartDisplay();
  }
}

function addToCart(itemId, name, price, vendorId) {
  cart.push({ id: itemId, name, price, vendor_id: vendorId });
  sessionStorage.setItem("cart", JSON.stringify(cart));
  updateCartDisplay();
  toast(`${name} added to cart`);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  sessionStorage.setItem("cart", JSON.stringify(cart));
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartPanel = document.getElementById("cartPanel");
  const cartItems = document.getElementById("cartItems");
  const cartTotalSpan = document.getElementById("cartTotal");

  if (!cartPanel) return;

  if (cart.length === 0) {
    cartPanel.style.display = "none";
    return;
  }

  cartPanel.style.display = "block";

  cartItems.innerHTML = cart.map((item, idx) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #e5e7eb;">
      <span>${item.name}</span>
      <span style="display:flex;align-items:center;gap:0.75rem;">
        R${item.price}
        <button class="btn btn-danger btn-sm" onclick="removeFromCart(${idx})">✕</button>
      </span>
    </div>
  `).join("");

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotalSpan.textContent = `R${total}`;
}

async function placeOrder() {
  if (cart.length === 0) {
    toast("Your cart is empty", "error");
    return;
  }

  const username = sessionStorage.getItem("username");
  const studentId = await getStudentId(username);

  if (!studentId) {
    toast("Student not found. Please login again.", "error");
    return;
  }

  const vendorIds = [...new Set(cart.map(item => item.vendor_id))];
  if (vendorIds.length > 1) {
    toast("Please order from one vendor at a time", "error");
    return;
  }

  const vendorId = vendorIds[0];
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const { error } = await sb
    .from("orders")
    .insert([{
      order_number: orderNumber,
      student_id: studentId,
      student_username: username,
      vendor_id: vendorId,
      items: cart.map(item => ({ id: item.id, name: item.name, price: item.price })),
      total_price: totalPrice,
      status: "pending"
    }]);

  if (error) {
    toast("Failed to place order: " + error.message, "error");
  } else {
    toast("Order placed! 🎉");
    cart = [];
    sessionStorage.removeItem("cart");
    updateCartDisplay();
  }
}

// ==================== STUDENT: ORDER HISTORY ====================
async function loadStudentOrderHistory() {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;

  const username = sessionStorage.getItem("username");
  const studentId = await getStudentId(username);

  if (!studentId) {
    tbody.innerHTML = '<tr><td colspan="6">Student not found</td></tr>';
    return;
  }

  const { data, error } = await sb
    .from("orders")
    .select("*, vendors(username)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="6">Failed to load orders</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No orders yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.vendors?.username || "Unknown"}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(", ") : ""}</td>
      <td>R${order.total_price}</td>
      <td><span class="status status-${order.status}">${order.status}</span></td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
    </tr>
  `).join("");
}

// ==================== ADMIN: ALL ORDERS ====================
async function loadAllOrders() {
  const tbody = document.getElementById("allOrdersBody");
  if (!tbody) return;

  const { data, error } = await sb
    .from("orders")
    .select("*, vendors(username)")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="7">Failed to load orders</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No orders yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.vendors?.username || "Unknown"}</td>
      <td>${order.student_username}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(", ") : ""}</td>
      <td>R${order.total_price}</td>
      <td><span class="status status-${order.status}">${order.status}</span></td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
    </tr>
  `).join("");
}

// ==================== STARTUP ====================
document.addEventListener("DOMContentLoaded", async () => {
  const googleBtn = document.getElementById("googleLoginBtn");
  const saveRoleBtn = document.getElementById("saveRoleBtn");

  if (googleBtn) {
    googleBtn.addEventListener("click", signInWithGoogle);
  }

  if (saveRoleBtn) {
    saveRoleBtn.addEventListener("click", saveRoleForFirstTimeUser);
  }

  await handleLoggedInUser();

  sb.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_IN") {
      await handleLoggedInUser();
    }
  });
});

// ==================== MAKE FUNCTIONS GLOBAL ====================
window.logout = logout;
window.loadVendors = loadVendors;
window.updateVendorStatus = updateVendorStatus;
window.deleteVendor = deleteVendor;
window.loadVendorMenu = loadVendorMenu;
window.addMenuItem = addMenuItem;
window.toggleSoldOut = toggleSoldOut;
window.deleteMenuItem = deleteMenuItem;
window.loadVendorOrders = loadVendorOrders;
window.updateOrderStatus = updateOrderStatus;
window.loadStudentMenu = loadStudentMenu;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.placeOrder = placeOrder;
window.loadStudentOrderHistory = loadStudentOrderHistory;
window.loadAllOrders = loadAllOrders;
