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

function setLoadingMessage(msg = "") {
  const loadingText = document.getElementById("loadingText");
  const googleBtn = document.getElementById("googleLoginBtn");
  const saveRoleBtn = document.getElementById("saveRoleBtn");

  if (loadingText) {
    if (msg) {
      loadingText.style.display = "block";
      loadingText.textContent = msg;
    } else {
      loadingText.style.display = "none";
      loadingText.textContent = "";
    }
  }

  if (googleBtn) googleBtn.disabled = !!msg;
  if (saveRoleBtn) saveRoleBtn.disabled = !!msg;
}

function showRoleSection(show = true) {
  const roleSection = document.getElementById("roleSection");
  if (roleSection) {
    roleSection.style.display = show ? "block" : "none";
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

  const target = routes[role] || "dashboard_student.html";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  if (currentPage !== target) {
    window.location.href = target;
  }
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
    setLoadingMessage("");
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

    const { error: updateError } = await sb.auth.updateUser({
      data: {
        role: role,
        username: username
      }
    });

    if (updateError) {
      console.warn("Metadata update warning:", updateError.message);
    }

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
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const googleBtn = document.getElementById("googleLoginBtn");
  const saveRoleBtn = document.getElementById("saveRoleBtn");

  if (googleBtn) googleBtn.addEventListener("click", signInWithGoogle);
  if (saveRoleBtn) saveRoleBtn.addEventListener("click", saveRoleForFirstTimeUser);

  // Only run login redirect logic on index page
  if (currentPage === "index.html" || currentPage === "") {
    checkLoginAfterRedirect();
  }
});

// ==================== ADMIN: VENDOR CONTROL ====================
async function loadVendors() {
  const tbody = document.getElementById("vendorBody");
  if (!tbody) return;

  const { data, error } = await sb
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:red;">Failed to load</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No vendors yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(v => `
    <tr>
      <td>${v.username}</td>
      <td>${v.status}</td>
      <td style="display:flex; gap:0.5rem;">
        ${v.status !== "approved"
          ? `<button onclick="updateVendorStatus('${v.id}', 'approved')">Approve</button>`
          : `<button onclick="updateVendorStatus('${v.id}', 'suspended')">Suspend</button>`
        }
        <button onclick="deleteVendor('${v.id}')">Remove</button>
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

// ==================== VENDOR: MENU ====================
async function loadVendorMenu() {
  const container = document.getElementById("vendorMenu");
  if (!container) return;

  const username = sessionStorage.getItem("username");
  const vendorId = await getVendorId(username);

  if (!vendorId) {
    container.innerHTML = "<p>Vendor not found</p>";
    return;
  }

  const { data, error } = await sb
    .from("menu")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: true });

  if (error) {
    container.innerHTML = "<p>Failed to load menu</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No items yet.</p>";
    return;
  }
container.innerHTML = data.map(item => `
  <div class="menu-item">
    <div><b>${item.name}</b></div>

    <img src="${item.image_url}" 
         style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin:5px 0;" />

    <div>${item.description || ""}</div>

    <div>R${item.price}</div>

    <div>${item.status}</div>

    <button onclick="toggleSoldOut(${item.id}, ${item.status === "sold_out"})">
      ${item.status === "sold_out" ? "Mark Available" : "Mark Sold Out"}
    </button>

    <button onclick="deleteMenuItem(${item.id})">Delete</button>
  </div>
`).join("");
}

async function addMenuItem() {
  const name = document.getElementById("itemName")?.value.trim();
  const price = Number(document.getElementById("itemPrice")?.value);
  const description = document.getElementById("itemDescription")?.value.trim();
  const file = document.getElementById("itemImage")?.files[0];

  const username = sessionStorage.getItem("username");

  if (!name || !price || !file) {
    toast("Fill all fields including image", "error");
    return;
  }

  const vendorId = await getVendorId(username);
  if (!vendorId) {
    toast("Vendor not found", "error");
    return;
  }

  //  Upload image to Supabase Storage
  const fileName = `${Date.now()}_${file.name}`;

  const { error: uploadError } = await sb.storage
    .from("menu_images")
    .upload(fileName, file);

  if (uploadError) {
    console.error(uploadError);
    toast("Image upload failed", "error");
    return;
  }

  // Get public URL
  const { data: urlData } = sb.storage
    .from("menu_images")
    .getPublicUrl(fileName);

  const imageUrl = urlData.publicUrl;

  // Save menu item in database
  const { error } = await sb
    .from("menu")
    .insert([{
      vendor_id: vendorId,
      name,
      price,
      description,
      image_url: imageUrl,
      status: "available"
    }]);

  if (error) {
    console.error(error);
    toast("Failed to add item", "error");
  } else {
    toast("Item added successfully");
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
    toast("Item updated");
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
    tbody.innerHTML = "<tr><td colspan='6'>Vendor not found</td></tr>";
    return;
  }

  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = "<tr><td colspan='6'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6'>No orders yet</td></tr>";
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.student_username}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(", ") : ""}</td>
      <td>R${order.total_price}</td>
      <td>${order.status}</td>
      <td>
        <select onchange="updateOrderStatus(${order.id}, this.value)">
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
    toast("Order updated");
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
    container.innerHTML = "<p>Failed to load menu</p>";
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
    container.innerHTML = "<p>No menu available yet.</p>";
    return;
  }

  container.innerHTML = allMenu.map(item => `
    <div class="menu-item">
      <div>${item.name}</div>
      <div>R${item.price}</div>
      <div>${item.vendor_name}</div>
      <button onclick="addToCart('${item.id}', '${item.name}', ${item.price}, '${item.vendor_id}')">
        Add to Cart
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

  if (!cartPanel || !cartItems || !cartTotalSpan) return;

  if (cart.length === 0) {
    cartPanel.style.display = "none";
    return;
  }

  cartPanel.style.display = "block";

  cartItems.innerHTML = cart.map((item, idx) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #ddd;">
      <span>${item.name}</span>
      <span>
        R${item.price}
        <button onclick="removeFromCart(${idx})">✕</button>
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
    toast("Failed to place order", "error");
  } else {
    toast("Order placed");
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
    tbody.innerHTML = "<tr><td colspan='6'>Student not found</td></tr>";
    return;
  }

  const { data, error } = await sb
    .from("orders")
    .select("*, vendors(username)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = "<tr><td colspan='6'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6'>No orders yet</td></tr>";
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.vendors?.username || "Unknown"}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(", ") : ""}</td>
      <td>R${order.total_price}</td>
      <td>${order.status}</td>
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
    tbody.innerHTML = "<tr><td colspan='7'>Failed to load orders</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7'>No orders yet</td></tr>";
    return;
  }

  tbody.innerHTML = data.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>${order.vendors?.username || "Unknown"}</td>
      <td>${order.student_username}</td>
      <td>${Array.isArray(order.items) ? order.items.map(i => i.name).join(", ") : ""}</td>
      <td>R${order.total_price}</td>
      <td>${order.status}</td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
    </tr>
  `).join("");
}

// ==================== GLOBAL EXPORTS ====================
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
window.updateCartDisplay = updateCartDisplay;
window.placeOrder = placeOrder;
window.loadStudentOrderHistory = loadStudentOrderHistory;
window.loadAllOrders = loadAllOrders;
