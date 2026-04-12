// ======================== SUPABASE BACKEND CONNECTION ========================
const SUPABASE_URL = 'https://slkereqjtknbvtywncph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa2VyZXFqdGtuYnZ0eXduY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDU1MTksImV4cCI6MjA5MTIyMTUxOX0.Yz9IpZWGDB5hKpLHZJIJseNCTe9YacpVzeuDOybj9ws';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================== API ENDPOINTS ========================
const API = {
    profiles: `${SUPABASE_URL}/rest/v1/profiles`,
    vendors: `${SUPABASE_URL}/rest/v1/vendors`,
    menuItems: `${SUPABASE_URL}/rest/v1/menu_items`,
    orders: `${SUPABASE_URL}/rest/v1/orders`,
    orderItems: `${SUPABASE_URL}/rest/v1/order_items`
};

// ======================== GLOBAL STATE ========================
let currentUser = null;
let activeDashboardPage = "overview";
let sidebarCollapsed = false;
let selectedRoleForLogin = "student";

// ======================== HELPER FUNCTIONS ========================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showMessage(container, message, isError = false) {
    if (container) {
        container.innerHTML = `<div class="${isError ? 'error-message' : 'success-message'}" style="padding: 10px; border-radius: 10px; margin-bottom: 10px; background: ${isError ? '#fee2e2' : '#d1fae5'}; color: ${isError ? '#dc2626' : '#059669'};">${message}</div>`;
        setTimeout(() => {
            if (container.innerHTML === `<div class="${isError ? 'error-message' : 'success-message'}" style="padding: 10px; border-radius: 10px; margin-bottom: 10px; background: ${isError ? '#fee2e2' : '#d1fae5'}; color: ${isError ? '#dc2626' : '#059669'};">${message}</div>`) {
                container.innerHTML = '';
            }
        }, 3000);
    }
}

// ======================== LOGIN WITH SUPABASE (Name + Role from profiles table) ========================
async function loginUser(name, role) {
    try {
        // Query profiles table for matching name and role
        const response = await fetch(`${API.profiles}?name=eq.${encodeURIComponent(name)}&role=eq.${role}`, {
            headers: { 
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const profiles = await response.json();
        const profile = profiles[0];
        
        if (!profile) {
            throw new Error(`No ${role} found with name "${name}". Please check your name and role.`);
        }
        
        // If vendor, fetch vendor details
        let vendorData = null;
        if (role === 'vendor') {
            const vendorResponse = await fetch(`${API.vendors}?profile_id=eq.${profile.id}`, {
                headers: { 'apikey': SUPABASE_ANON_KEY }
            });
            const vendors = await vendorResponse.json();
            vendorData = vendors[0];
        }
        
        return {
            success: true,
            user: {
                ...profile,
                profile_id: profile.id,
                vendor: vendorData,
                id: profile.id,
                fullName: profile.name,
                avatarInitial: (profile.name || 'U').substring(0, 2).toUpperCase()
            }
        };
        
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// ======================== FETCH FUNCTIONS ========================
async function getVendors() {
    try {
        const response = await fetch(`${API.vendors}?status=eq.active`, {
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        return await response.json();
    } catch (error) {
        console.error('Get vendors error:', error);
        return [];
    }
}

async function getAllVendors() {
    try {
        const response = await fetch(API.vendors, {
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        return await response.json();
    } catch (error) {
        console.error('Get all vendors error:', error);
        return [];
    }
}

async function getMenuItems() {
    try {
        const response = await fetch(`${API.menuItems}?available=eq.true`, {
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        return await response.json();
    } catch (error) {
        console.error('Get menu items error:', error);
        return [];
    }
}

async function getVendorMenu(vendorId) {
    try {
        const response = await fetch(`${API.menuItems}?vendor_id=eq.${vendorId}`, {
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        return await response.json();
    } catch (error) {
        console.error('Get vendor menu error:', error);
        return [];
    }
}

async function getStudentOrders(studentId) {
    try {
        const response = await fetch(`${API.orders}?student_id=eq.${studentId}&order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        return await response.json();
    } catch (error) {
        console.error('Get student orders error:', error);
        return [];
    }
}

async function getVendorOrders(vendorId) {
    try {
        const response = await fetch(`${API.orders}?vendor_id=eq.${vendorId}&order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        return await response.json();
    } catch (error) {
        console.error('Get vendor orders error:', error);
        return [];
    }
}

async function updateVendorStatus(vendorId, status) {
    try {
        const response = await fetch(`${API.vendors}?id=eq.${vendorId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ status: status })
        });
        return await response.json();
    } catch (error) {
        console.error('Update vendor status error:', error);
        return null;
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API.orders}?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ status: status })
        });
        return await response.json();
    } catch (error) {
        console.error('Update order status error:', error);
        return null;
    }
}

async function createMenuItem(menuItem) {
    try {
        const response = await fetch(API.menuItems, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(menuItem)
        });
        return await response.json();
    } catch (error) {
        console.error('Create menu item error:', error);
        return null;
    }
}

async function updateMenuItem(itemId, updates) {
    try {
        const response = await fetch(`${API.menuItems}?id=eq.${itemId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(updates)
        });
        return await response.json();
    } catch (error) {
        console.error('Update menu item error:', error);
        return null;
    }
}

async function deleteMenuItem(itemId) {
    try {
        await fetch(`${API.menuItems}?id=eq.${itemId}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        return true;
    } catch (error) {
        console.error('Delete menu item error:', error);
        return false;
    }
}

async function placeOrder(orderData, orderItems) {
    try {
        const orderResponse = await fetch(API.orders, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(orderData)
        });
        
        const newOrder = await orderResponse.json();
        if (!newOrder || newOrder.length === 0) throw new Error('Failed to create order');
        
        const orderId = newOrder[0].id;
        
        for (const item of orderItems) {
            await fetch(API.orderItems, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ ...item, order_id: orderId })
            });
        }
        
        return { success: true, order: newOrder[0] };
    } catch (error) {
        console.error('Place order error:', error);
        return { success: false, error: error.message };
    }
}

// ======================== RENDER FUNCTIONS ========================
function renderApp() {
    if (!currentUser) renderLanding();
    else renderDashboard();
}

function renderLanding() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
        <div class="landing-container">
            <div class="hero">
                <div class="hero-icon"><i class="fas fa-bowl-food"></i></div>
                <h1>Uni-Eats</h1>
                <p>Craving? Order from campus vendors — skip the queue, enjoy the taste</p>
                <div class="food-tags">
                    <span class="food-tag"><i class="fas fa-pepper-hot"></i> SA Flavours</span>
                    <span class="food-tag"><i class="fas fa-leaf"></i> Allergen Smart</span>
                    <span class="food-tag"><i class="fas fa-clock"></i> Real-time Tracking</span>
                </div>
            </div>
            <div class="role-cards" id="roleCardsContainer">
                <div class="role-card" data-role="student">
                    <div class="role-emoji">🎓</div>
                    <h3>Student</h3>
                    <p>Order & track meals, collect fast</p>
                    <button class="role-login-btn" data-role="student">Login as Student</button>
                </div>
                <div class="role-card" data-role="vendor">
                    <div class="role-emoji">🍔</div>
                    <h3>Vendor</h3>
                    <p>Manage kitchen & live orders</p>
                    <button class="role-login-btn" data-role="vendor">Login as Vendor</button>
                </div>
                <div class="role-card" data-role="admin">
                    <div class="role-emoji">📊</div>
                    <h3>Admin</h3>
                    <p>Campus analytics & vendor control</p>
                    <button class="role-login-btn" data-role="admin">Login as Admin</button>
                </div>
            </div>
            <div id="loginPanel" class="login-panel" style="display: none;">
                <h3 id="loginRoleTitle">🔐 Student Login</h3>
                <div id="loginMessage"></div>
                <div class="form-group">
                    <label>Your Name</label>
                    <input type="text" id="loginName" placeholder="Enter your name exactly as in database">
                </div>
                <button class="btn-primary" id="performLoginBtn">Sign In →</button>
                <div class="switch-signup" style="text-align:center; margin-top:12px; font-size:0.8rem;">
                    💡 Connected to Supabase backend! Use names from your profiles table.
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll('.role-login-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedRoleForLogin = btn.getAttribute('data-role');
            const panel = document.getElementById('loginPanel');
            const titleElem = document.getElementById('loginRoleTitle');
            titleElem.innerText = `🔐 ${selectedRoleForLogin.charAt(0).toUpperCase() + selectedRoleForLogin.slice(1)} Login`;
            document.getElementById('loginName').value = "";
            document.getElementById('loginMessage').innerHTML = '';
            panel.style.display = "block";
            panel.scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.getElementById('performLoginBtn').addEventListener('click', async () => {
        const name = document.getElementById('loginName').value.trim();
        const messageDiv = document.getElementById('loginMessage');
        
        if (!name) {
            showMessage(messageDiv, 'Please enter your name', true);
            return;
        }
        
        const btn = document.getElementById('performLoginBtn');
        btn.disabled = true;
        btn.textContent = 'Signing in...';
        
        const result = await loginUser(name, selectedRoleForLogin);
        
        if (result.success) {
            currentUser = result.user;
            renderApp();
        } else {
            showMessage(messageDiv, result.error, true);
            btn.disabled = false;
            btn.textContent = 'Sign In →';
        }
    });
}

function renderDashboard() {
    const appDiv = document.getElementById("app");
    const role = currentUser.role;
    const displayName = currentUser.name || currentUser.fullName;
    const secondaryInfo = role === 'vendor' ? `🆔 Vendor` : `🎂 ${currentUser.age || 'N/A'} yrs`;
    const avatarInitial = currentUser.avatarInitial || (displayName ? displayName.substring(0,2).toUpperCase() : "U");

    let navItems = [];
    if (role === 'student') {
        navItems = [
            { id: "overview", label: "Dashboard", icon: "fas fa-home" },
            { id: "orders", label: "My Orders", icon: "fas fa-shopping-bag" },
            { id: "vendors", label: "Campus Vendors", icon: "fas fa-store" },
            { id: "cart", label: "My Cart", icon: "fas fa-shopping-cart" }
        ];
    } else if (role === 'vendor') {
        navItems = [
            { id: "overview", label: "Vendor Home", icon: "fas fa-chalkboard-user" },
            { id: "orders", label: "Incoming Orders", icon: "fas fa-clipboard-list" },
            { id: "menu", label: "Menu Manager", icon: "fas fa-utensil-spoon" },
            { id: "analytics", label: "Sales Pulse", icon: "fas fa-chart-simple" }
        ];
    } else if (role === 'admin') {
        navItems = [
            { id: "overview", label: "Admin Console", icon: "fas fa-gauge-high" },
            { id: "vendors", label: "Vendor Ecosystem", icon: "fas fa-building" },
            { id: "orders", label: "All Orders", icon: "fas fa-receipt" }
        ];
    }

    appDiv.innerHTML = `
        <div class="dashboard-wrapper">
            <div class="sidebar ${sidebarCollapsed ? 'collapsed' : ''}" id="mainSidebar">
                <div class="sidebar-header">
                    <div class="logo-small"><i class="fas fa-bowl-food"></i> <span>Uni-Eats</span></div>
                    <button class="menu-toggle" id="toggleSidebarBtn"><i class="fas fa-bars"></i></button>
                </div>
                <div class="nav-items" id="navItemsContainer"></div>
                <div class="profile-card" id="profileSidebarBtn">
                    <div class="profile-avatar">${avatarInitial}</div>
                    <div class="profile-info">
                        <div class="profile-name">${escapeHtml(displayName)}</div>
                        <div class="profile-role">${role} • ${secondaryInfo}</div>
                    </div>
                </div>
            </div>
            <div class="main-content">
                <div class="top-bar">
                    <div class="user-greeting"><i class="fas fa-hand-peace"></i> Welcome, ${escapeHtml(displayName)}</div>
                    <button class="logout-top" id="dashboardLogoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
                <div id="dynamicContentArea"><div class="loading" style="text-align:center; padding:2rem;"><i class="fas fa-spinner fa-pulse"></i> Loading...</div></div>
            </div>
        </div>
    `;

    const navContainer = document.getElementById("navItemsContainer");
    navItems.forEach(item => {
        const navDiv = document.createElement("div");
        navDiv.className = `nav-item ${activeDashboardPage === item.id ? 'active' : ''}`;
        navDiv.setAttribute("data-page", item.id);
        navDiv.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
        navDiv.addEventListener("click", () => {
            activeDashboardPage = item.id;
            renderDashboard();
        });
        navContainer.appendChild(navDiv);
    });

    document.getElementById("toggleSidebarBtn").addEventListener("click", () => {
        sidebarCollapsed = !sidebarCollapsed;
        renderDashboard();
    });
    document.getElementById("dashboardLogoutBtn").addEventListener("click", () => {
        currentUser = null;
        activeDashboardPage = "overview";
        sidebarCollapsed = false;
        renderApp();
    });

    const profileBtn = document.getElementById("profileSidebarBtn");
    if (profileBtn) profileBtn.addEventListener("click", () => openProfileModal());

    renderDynamicContent();
}

async function renderDynamicContent() {
    const contentDiv = document.getElementById("dynamicContentArea");
    if (!contentDiv) return;
    
    const role = currentUser.role;
    
    try {
        if (role === 'student') {
            if (activeDashboardPage === "overview") {
                const vendors = await getVendors();
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-graduation-cap"></i> Student Dashboard</h2>
                    <div class="card-grid">
                        <div class="stat-card"><div class="stat-number" style="font-size:2rem;">0</div><div>Active Orders</div></div>
                        <div class="stat-card"><div class="stat-number" style="font-size:2rem;">${vendors.length}</div><div>Vendors nearby</div></div>
                        <div class="stat-card"><div class="stat-number" style="font-size:2rem;">★ 4.8</div><div>Campus rating</div></div>
                    </div>
                    <div class="mock-table"><h3>📋 Connected to Supabase!</h3><p>✅ Backend connected successfully using your Supabase URL</p><p>📊 Data is being fetched from your live database</p></div>
                `;
            } else if (activeDashboardPage === "vendors") {
                const vendors = await getVendors();
                const menuItems = await getMenuItems();
                
                let html = `<h2><i class="fas fa-store"></i> Campus Vendors</h2>`;
                for (const vendor of vendors) {
                    const vendorMenu = menuItems.filter(item => item.vendor_id === vendor.id);
                    html += `<div class="mock-table" style="margin-bottom:1rem;">
                        <h3>🍽️ ${escapeHtml(vendor.company_name)}</h3>
                        <p>${vendor.cuisine_type || 'Various cuisines'}</p>
                        <table><thead><tr><th>Item</th><th>Price</th><th>Action</th></tr></thead><tbody>`;
                    if (vendorMenu.length === 0) {
                        html += `<tr><td colspan="3">No menu items available</td></tr>`;
                    } else {
                        for (const item of vendorMenu) {
                            html += `<tr><td>${escapeHtml(item.name)}</td><td>R${item.price}</td><td><button class="small-mock" onclick="addToCart(${item.id}, '${escapeHtml(item.name)}', ${item.price}, '${vendor.id}')">Add to Cart</button></td></tr>`;
                        }
                    }
                    html += `</tbody></table></div>`;
                }
                contentDiv.innerHTML = html;
            } else if (activeDashboardPage === "orders") {
                const orders = await getStudentOrders(currentUser.id);
                if (orders.length === 0) {
                    contentDiv.innerHTML = `<h2><i class="fas fa-receipt"></i> My Orders</h2><div class="mock-table"><p>No orders yet. Browse vendors to place an order!</p></div>`;
                } else {
                    let html = `<h2><i class="fas fa-receipt"></i> My Orders</h2><div class="mock-table"><table><thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>`;
                    for (const order of orders) {
                        html += `<tr><td>#${order.id}</td><td><span class="badge">${order.status}</span></td><td>R${order.total_amount}</td><td>${new Date(order.created_at).toLocaleDateString()}</td></tr>`;
                    }
                    html += `</tbody></table></div>`;
                    contentDiv.innerHTML = html;
                }
            } else if (activeDashboardPage === "cart") {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                if (cart.length === 0) {
                    contentDiv.innerHTML = `<h2><i class="fas fa-shopping-cart"></i> My Cart</h2><div class="mock-table"><p>Your cart is empty.</p></div>`;
                } else {
                    let total = 0;
                    let html = `<h2><i class="fas fa-shopping-cart"></i> My Cart</h2><div class="mock-table"><table><thead><tr><th>Item</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr></thead><tbody>`;
                    cart.forEach(item => {
                        const subtotal = item.price * item.quantity;
                        total += subtotal;
                        html += `<tr><td>${escapeHtml(item.name)}</td><td>R${item.price}</td><td>${item.quantity}</td><td>R${subtotal}</td><td><button class="small-mock" onclick="removeFromCart(${item.id})">Remove</button></td></tr>`;
                    });
                    html += `<tr style="font-weight:bold;"><td colspan="3">Total</td><td>R${total}</td><td></td></tr>`;
                    html += `</tbody></table><button class="btn-primary" style="margin-top:1rem;" onclick="checkout()">Place Order</button></div>`;
                    contentDiv.innerHTML = html;
                }
            }
        } else if (role === 'vendor') {
            if (activeDashboardPage === "overview") {
                const orders = await getVendorOrders(currentUser.vendor?.id);
                contentDiv.innerHTML = `<h2><i class="fas fa-kitchen-set"></i> Vendor Panel — ${currentUser.name}</h2>
                    <div class="card-grid">
                        <div class="stat-card">📦 Today's orders: ${orders.length}</div>
                        <div class="stat-card">⭐ Rating: 4.7</div>
                        <div class="stat-card">🆔 Vendor ID: ${currentUser.vendor?.id || 'N/A'}</div>
                    </div>
                    <div class="mock-table"><h3>✅ Connected to Supabase Backend</h3><p>Your data is live from the database!</p></div>`;
            } else if (activeDashboardPage === "orders") {
                const orders = await getVendorOrders(currentUser.vendor?.id);
                if (orders.length === 0) {
                    contentDiv.innerHTML = `<h2><i class="fas fa-truck-fast"></i> Incoming Orders</h2><div class="mock-table"><p>No orders yet.</p></div>`;
                } else {
                    let html = `<h2><i class="fas fa-truck-fast"></i> Incoming Orders</h2><div class="mock-table"><table><thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Action</th></tr></thead><tbody>`;
                    for (const order of orders) {
                        html += `<tr><td>#${order.id}</td><td><span class="badge">${order.status}</span></td><td>R${order.total_amount}</td><td>`;
                        if (order.status === 'pending') html += `<button class="small-mock" onclick="updateVendorOrderStatus(${order.id}, 'preparing')">Start Preparing</button>`;
                        else if (order.status === 'preparing') html += `<button class="small-mock" onclick="updateVendorOrderStatus(${order.id}, 'ready')">Mark Ready</button>`;
                        html += `</td></tr>`;
                    }
                    html += `</tbody></table></div>`;
                    contentDiv.innerHTML = html;
                }
            } else if (activeDashboardPage === "menu") {
                const menu = await getVendorMenu(currentUser.vendor?.id);
                let html = `<h2><i class="fas fa-list-ul"></i> Menu Manager</h2>
                    <button class="btn-primary" onclick="showAddMenuItemModal()" style="width:auto; margin-bottom:1rem;">+ Add Menu Item</button>
                    <div class="mock-table"><table><thead><tr><th>Item</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
                for (const item of menu) {
                    html += `<tr><td>${escapeHtml(item.name)}</td><td>R${item.price}</td><td>${item.available ? 'Available' : 'Sold Out'}</td>
                    <td><button class="small-mock" onclick="toggleMenuItemAvailability(${item.id}, ${!item.available})">${item.available ? 'Mark Sold Out' : 'Mark Available'}</button>
                    <button class="small-mock" onclick="deleteMenuItem(${item.id})">Delete</button></td></tr>`;
                }
                html += `</tbody></table></div>`;
                contentDiv.innerHTML = html;
            } else if (activeDashboardPage === "analytics") {
                const orders = await getVendorOrders(currentUser.vendor?.id);
                const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                contentDiv.innerHTML = `<h2><i class="fas fa-chart-simple"></i> Sales Pulse</h2>
                    <div class="card-grid"><div class="stat-card">📈 Total Orders: ${orders.length}</div><div class="stat-card">💰 Revenue: R${revenue}</div></div>
                    <div class="mock-table"><p>✅ Live data from your Supabase database</p></div>`;
            }
        } else if (role === 'admin') {
            if (activeDashboardPage === "overview") {
                const vendors = await getAllVendors();
                const pending = vendors.filter(v => v.status === 'pending').length;
                const active = vendors.filter(v => v.status === 'active').length;
                contentDiv.innerHTML = `<h2><i class="fas fa-chart-pie"></i> Admin Console</h2>
                    <div class="card-grid">
                        <div class="stat-card"><div class="stat-number">${active}</div><div>Active Vendors</div></div>
                        <div class="stat-card"><div class="stat-number">${pending}</div><div>Pending</div></div>
                        <div class="stat-card"><div class="stat-number">${vendors.length}</div><div>Total Vendors</div></div>
                    </div>
                    <div class="mock-table"><p>✅ Connected to Supabase - ${vendors.length} vendors in system</p></div>`;
            } else if (activeDashboardPage === "vendors") {
                const vendors = await getAllVendors();
                let html = `<h2><i class="fas fa-shield-alt"></i> Vendor Ecosystem</h2><div class="mock-table"><table><thead><tr><th>Vendor</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
                for (const vendor of vendors) {
                    html += `<tr><td>${escapeHtml(vendor.company_name)}</td><td><span class="badge">${vendor.status || 'pending'}</span></td><td>`;
                    if (vendor.status === 'pending') html += `<button class="small-mock" onclick="approveVendor(${vendor.id})">Approve</button>`;
                    else if (vendor.status === 'active') html += `<button class="small-mock" onclick="suspendVendor(${vendor.id})">Suspend</button>`;
                    else if (vendor.status === 'suspended') html += `<button class="small-mock" onclick="approveVendor(${vendor.id})">Reactivate</button>`;
                    html += `</td></tr>`;
                }
                html += `</tbody></table></div>`;
                contentDiv.innerHTML = html;
            } else if (activeDashboardPage === "orders") {
                const response = await fetch(API.orders, { headers: { 'apikey': SUPABASE_ANON_KEY } });
                const orders = await response.json();
                let html = `<h2><i class="fas fa-globe"></i> All Campus Orders</h2><div class="mock-table"><table><thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>`;
                for (const order of orders) {
                    html += `<tr><td>#${order.id}</td><td><span class="badge">${order.status}</span></td><td>R${order.total_amount}</td><td>${new Date(order.created_at).toLocaleString()}</td></tr>`;
                }
                html += `</tbody></table></div>`;
                contentDiv.innerHTML = html;
            }
        }
    } catch (error) {
        contentDiv.innerHTML = `<div class="placeholder-alert" style="color:red;">Error loading data: ${error.message}. Please check your Supabase connection.</div>`;
    }
}

// ======================== PROFILE MODAL ========================
function openProfileModal() {
    const modalDiv = document.createElement("div");
    modalDiv.className = "modal-overlay";
    const isVendor = currentUser.role === "vendor";
    modalDiv.innerHTML = `
        <div class="modal-content">
            <h3><i class="fas fa-user-edit"></i> Edit Profile</h3>
            <div id="modalMessage"></div>
            <div class="form-group">
                <label>${isVendor ? "Company Name" : "Full Name"}</label>
                <input type="text" id="editFullName" value="${escapeHtml(isVendor ? currentUser.vendor?.company_name || currentUser.name : currentUser.name)}">
            </div>
            <div class="form-group">
                <label>Email (read only)</label>
                <input type="email" value="${currentUser.email || 'N/A'}" disabled>
            </div>
            <div class="modal-buttons">
                <button class="btn-primary" id="saveProfileBtn">Save Changes</button>
                <button class="btn-secondary" id="closeModalBtn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);

    const saveBtn = modalDiv.querySelector("#saveProfileBtn");
    const closeBtn = modalDiv.querySelector("#closeModalBtn");
    saveBtn.addEventListener("click", async () => {
        const newName = modalDiv.querySelector("#editFullName").value.trim();
        if (!newName) {
            showMessage(modalDiv.querySelector("#modalMessage"), "Name cannot be empty", true);
            return;
        }
        
        const response = await fetch(`${API.profiles}?id=eq.${currentUser.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ name: newName })
        });
        
        if (response.ok) {
            currentUser.name = newName;
            modalDiv.remove();
            renderDashboard();
        } else {
            showMessage(modalDiv.querySelector("#modalMessage"), "Failed to update profile", true);
        }
    });
    closeBtn.addEventListener("click", () => modalDiv.remove());
}

// ======================== GLOBAL FUNCTIONS ========================
window.addToCart = (itemId, itemName, price, vendorId) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(i => i.id === itemId);
    if (existing) existing.quantity++;
    else cart.push({ id: itemId, name: itemName, price: price, quantity: 1, vendorId: vendorId });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`${itemName} added to cart!`);
};

window.removeFromCart = (itemId) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(i => i.id !== itemId);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderDashboard();
};

window.checkout = async () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }
    
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const orderData = { student_id: currentUser.id, vendor_id: cart[0].vendorId, total_amount: total, status: 'pending' };
    const orderItems = cart.map(i => ({ menu_item_id: i.id, quantity: i.quantity, price: i.price }));
    
    const result = await placeOrder(orderData, orderItems);
    if (result.success) {
        localStorage.removeItem('cart');
        alert("Order placed successfully!");
        activeDashboardPage = "orders";
        renderDashboard();
    } else {
        alert("Failed to place order: " + result.error);
    }
};

window.updateVendorOrderStatus = async (orderId, status) => {
    await updateOrderStatus(orderId, status);
    alert(`Order #${orderId} updated to ${status}`);
    renderDashboard();
};

window.approveVendor = async (vendorId) => {
    await updateVendorStatus(vendorId, 'active');
    alert("Vendor approved!");
    renderDashboard();
};

window.suspendVendor = async (vendorId) => {
    await updateVendorStatus(vendorId, 'suspended');
    alert("Vendor suspended!");
    renderDashboard();
};

window.showAddMenuItemModal = () => {
    const modalDiv = document.createElement("div");
    modalDiv.className = "modal-overlay";
    modalDiv.innerHTML = `
        <div class="modal-content">
            <h3>Add Menu Item</h3>
            <div id="modalMessage"></div>
            <div class="form-group"><label>Item Name</label><input type="text" id="itemName" placeholder="e.g., Chicken Burger"></div>
            <div class="form-group"><label>Price (R)</label><input type="number" id="itemPrice" step="0.01" placeholder="49.99"></div>
            <div class="modal-buttons"><button class="btn-primary" id="saveItemBtn">Add Item</button><button class="btn-secondary" id="closeModalBtn">Cancel</button></div>
        </div>
    `;
    document.body.appendChild(modalDiv);
    document.getElementById("saveItemBtn").addEventListener("click", async () => {
        const name = document.getElementById("itemName").value.trim();
        const price = parseFloat(document.getElementById("itemPrice").value);
        if (!name || isNaN(price)) { alert("Please fill all fields"); return; }
        await createMenuItem({ vendor_id: currentUser.vendor.id, name: name, price: price, available: true });
        modalDiv.remove();
        renderDashboard();
    });
    document.getElementById("closeModalBtn").addEventListener("click", () => modalDiv.remove());
};

window.toggleMenuItemAvailability = async (itemId, available) => {
    await updateMenuItem(itemId, { available: available });
    renderDashboard();
};

window.deleteMenuItem = async (itemId) => {
    if (confirm("Delete this menu item?")) {
        await deleteMenuItem(itemId);
        renderDashboard();
    }
};

// Start the app
renderApp();
