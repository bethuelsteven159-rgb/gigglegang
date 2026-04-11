// ======================== MOCK USER DATABASE (EDITABLE - PLACED CLEARLY AT THE TOP) ========================
// You can easily add/modify users here. Each user must have role, email, password, and role-specific fields.
let MOCK_USERS = [
    { id: 1, email: "student@uni-eats.com", password: "student123", role: "student", fullName: "Lerato Ndlovu", age: 20, studentId: "STU-101", avatarInitial: "LN" },
    { id: 2, email: "vendor@uni-eats.com", password: "vendor123", role: "vendor", companyName: "Campus Bites", age: 35, regNumber: "VEN-882", fullName: "Campus Bites", avatarInitial: "CB" },
    { id: 3, email: "admin@uni-eats.com", password: "admin123", role: "admin", fullName: "Thabo Mbeki", age: 45, employeeId: "ADM-009", avatarInitial: "TM" },
    { id: 4, email: "sarah@student.uni", password: "sarahpass", role: "student", fullName: "Sarah Chen", age: 22, studentId: "STU-204", avatarInitial: "SC" },
    { id: 5, email: "grill@campus.com", password: "grill123", role: "vendor", companyName: "Grill Masters", age: 41, regNumber: "VEN-112", fullName: "Grill Masters", avatarInitial: "GM" }
];

// Helper to save changes to MOCK_USERS
function updateUserInMock(updatedUser) {
    const index = MOCK_USERS.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) MOCK_USERS[index] = { ...updatedUser };
}

// Global state
let currentUser = null;
let activeDashboardPage = "overview";
let sidebarCollapsed = false;

function renderApp() {
    if (!currentUser) renderLanding();
    else renderDashboard();
}

// ---------- LANDING PAGE (UberEats/MrD style) ----------
let selectedRoleForLogin = "student";

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
                <div class="form-group"><label>Email</label><input type="email" id="loginEmail" placeholder="student@uni-eats.com"></div>
                <div class="form-group"><label>Password</label><input type="password" id="loginPassword" placeholder="••••••"></div>
                <button class="btn-primary" id="performLoginBtn">Sign In →</button>
                <div class="switch-signup" style="text-align:center; margin-top:12px; font-size:0.8rem;">
                    💡 Demo accounts: student@uni-eats.com / student123 | vendor@uni-eats.com / vendor123 | admin@uni-eats.com / admin123
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
            const emailInput = document.getElementById('loginEmail');
            if (selectedRoleForLogin === 'student') emailInput.value = "student@uni-eats.com";
            else if (selectedRoleForLogin === 'vendor') emailInput.value = "vendor@uni-eats.com";
            else emailInput.value = "admin@uni-eats.com";
            document.getElementById('loginPassword').value = "";
            panel.style.display = "block";
            panel.scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.getElementById('performLoginBtn').addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value.trim();
        const pwd = document.getElementById('loginPassword').value.trim();
        const user = MOCK_USERS.find(u => u.email === email && u.password === pwd && u.role === selectedRoleForLogin);
        if (!user) {
            alert(`Invalid credentials or role mismatch.\nUse demo accounts:\nStudent: student@uni-eats.com / student123\nVendor: vendor@uni-eats.com / vendor123\nAdmin: admin@uni-eats.com / admin123`);
            return;
        }
        currentUser = { ...user };
        renderApp();
    });
}

// ---------- DASHBOARD + Profile Edit Modal ----------
function renderDashboard() {
    const appDiv = document.getElementById("app");
    const role = currentUser.role;
    const displayName = role === 'vendor' ? currentUser.companyName : (currentUser.fullName || currentUser.email.split('@')[0]);
    
    // For vendor, show Vendor ID (regNumber) instead of age
    let secondaryInfo = "";
    if (role === 'vendor') {
        secondaryInfo = `🆔 ID: ${currentUser.regNumber || 'N/A'}`;
    } else {
        secondaryInfo = `🎂 ${currentUser.age} yrs`;
    }
    const avatarInitial = currentUser.avatarInitial || (displayName ? displayName[0].toUpperCase() : "U");

    let navItems = [];
    if (role === 'student') {
        navItems = [
            { id: "overview", label: "Dashboard", icon: "fas fa-home" },
            { id: "orders", label: "My Orders", icon: "fas fa-shopping-bag" },
            { id: "vendors", label: "Campus Vendors", icon: "fas fa-store" },
            { id: "analytics", label: "Insights", icon: "fas fa-chart-line" }
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
            { id: "analytics", label: "Reports & CSV", icon: "fas fa-chart-column" },
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
                <div id="dynamicContentArea"></div>
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

    renderDynamicContent(role);
}

// Profile edit modal (email is read-only, name and age editable; vendor shows company name and regNumber read-only)
function openProfileModal() {
    const modalDiv = document.createElement("div");
    modalDiv.className = "modal-overlay";
    const isVendor = currentUser.role === "vendor";
    modalDiv.innerHTML = `
        <div class="modal-content">
            <h3><i class="fas fa-user-edit"></i> Edit Profile</h3>
            <div class="form-group">
                <label>${isVendor ? "Company Name" : "Full Name"}</label>
                <input type="text" id="editFullName" value="${escapeHtml(isVendor ? currentUser.companyName : currentUser.fullName)}">
            </div>
            <div class="form-group">
                <label>Email (read only)</label>
                <input type="email" value="${currentUser.email}" disabled>
            </div>
            ${!isVendor ? `<div class="form-group"><label>Age</label><input type="number" id="editAge" value="${currentUser.age}"></div>` : 
                          `<div class="form-group"><label>Vendor ID (read only)</label><input type="text" value="${currentUser.regNumber || 'N/A'}" disabled></div>`}
            <div class="modal-buttons">
                <button class="btn-primary" id="saveProfileBtn">Save Changes</button>
                <button class="btn-secondary" id="closeModalBtn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);

    const saveBtn = modalDiv.querySelector("#saveProfileBtn");
    const closeBtn = modalDiv.querySelector("#closeModalBtn");
    saveBtn.addEventListener("click", () => {
        const newName = modalDiv.querySelector("#editFullName").value.trim();
        if (!isVendor) {
            const newAge = parseInt(modalDiv.querySelector("#editAge").value);
            if (!newName || isNaN(newAge) || newAge < 16) {
                alert("Please provide valid name and age (>=16).");
                return;
            }
            currentUser.fullName = newName;
            currentUser.age = newAge;
        } else {
            if (!newName) {
                alert("Please provide a valid company name.");
                return;
            }
            currentUser.companyName = newName;
            currentUser.fullName = newName;
        }
        currentUser.avatarInitial = newName.substring(0,2).toUpperCase();
        updateUserInMock(currentUser);
        modalDiv.remove();
        renderDashboard();
    });
    closeBtn.addEventListener("click", () => modalDiv.remove());
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

// ---------- DYNAMIC PAGE CONTENT (mock UI, backend later) ----------
function renderDynamicContent(role) {
    const contentDiv = document.getElementById("dynamicContentArea");
    if (!contentDiv) return;
    const mockMsg = (feature) => `<div class="placeholder-alert"><i class="fas fa-code-branch"></i> 🧩 Frontend prototype: "${feature}" — ready for backend integration (API, DB).</div>`;

    if (role === 'student') {
        if (activeDashboardPage === "overview") {
            contentDiv.innerHTML = `
                <h2><i class="fas fa-graduation-cap"></i> Student Dashboard</h2>
                <div class="card-grid">
                    <div class="stat-card"><div class="stat-number" style="font-size:2rem;">8</div><div>Active Orders</div><small>preview</small></div>
                    <div class="stat-card"><div class="stat-number" style="font-size:2rem;">12</div><div>Vendors nearby</div></div>
                    <div class="stat-card"><div class="stat-number" style="font-size:2rem;">★ 4.8</div><div>Campus rating</div></div>
                </div>
                <div class="mock-table"><h3>📋 Recent Activity</h3><p>Last order: <strong>#UNI-234</strong> — Ready for pickup (mock)</p>${mockMsg("real-time order placement & tracking")}</div>
            `;
        } else if (activeDashboardPage === "orders") {
            contentDiv.innerHTML = `<h2><i class="fas fa-receipt"></i> My Orders</h2><div class="mock-table"><table><tr><th>Order ID</th><th>Vendor</th><th>Status</th><th>ETA</th></tr><tr><td>#ORD101</td><td>Campus Bites</td><td><span class="badge">Preparing</span></td><td>~10 min</td></tr>
                <tr><td>#ORD102</td><td>Grill Masters</td><td><span class="badge">Ready for Pickup</span></td><td>Now</td></tr>
            </table>${mockMsg("live order updates & push notifications")}</div>`;
        } else if (activeDashboardPage === "vendors") {
            contentDiv.innerHTML = `<h2><i class="fas fa-store"></i> Campus Vendors</h2><div class="mock-table">\n\n<th>Vendor</th><th>Cuisine</th><th>Distance</th><th>Action</th>\n\n\n<td>Campus Bites</td><td>Global Bowls</td><td>50m</td><td><button class="small-mock" disabled>Order (soon)</button></td>\n\n\n<td>Grill Masters</td><td>Braai & Grill</td><td>120m</td><td><button class="small-mock" disabled>Order (soon)</button></td>\n\n</table>${mockMsg("menu browsing, allergen data (SA R427)")}</div>`;
        } else if (activeDashboardPage === "analytics") {
            contentDiv.innerHTML = `<h2><i class="fas fa-chart-line"></i> Insights</h2><div class="card-grid"><div class="stat-card">📊 Peak hours: 12:30-13:30</div><div class="stat-card">🍽️ Top vendor: Campus Bites</div></div>${mockMsg("export CSV/PDF analytics")}</div>`;
        }
    } 
    else if (role === 'vendor') {
        if (activeDashboardPage === "overview") {
            contentDiv.innerHTML = `<h2><i class="fas fa-kitchen-set"></i> Vendor Panel — ${currentUser.companyName}</h2><div class="card-grid"><div class="stat-card">📦 Today's orders: 24</div><div class="stat-card">⭐ Rating: 4.7</div><div class="stat-card">🆔 Vendor ID: ${currentUser.regNumber}</div></div><div class="mock-table"><h3>🍽️ Sample Menu (mock)</h3><table><th>Item</th><th>Price</th><th>Status</th>\n\n<td>Combo-A</td><td>R55</td><td>Available</td>\n</table>${mockMsg("full menu management & sold-out toggle")}</div>`;
        } else if (activeDashboardPage === "orders") {
            contentDiv.innerHTML = `<h2><i class="fas fa-truck-fast"></i> Incoming Orders</h2><div class="mock-table">\n<th>Order ID</th><th>Student</th><th>Items</th><th>Status</th>\n\n<td>#V221</td><td>Lerato N.</td><td>Meal Deal</td><td><span class="badge">Preparing</span></td>\n</table>${mockMsg("update status: Received → Preparing → Ready")}</div>`;
        } else if (activeDashboardPage === "menu") {
            contentDiv.innerHTML = `<h2><i class="fas fa-list-ul"></i> Menu Manager</h2><div class="placeholder-alert">🔧 Allergen data: SA National Food Database (mock). No real food items yet.</div><div class="mock-table">\n<th>Item code</th><th>Price</th><th>Sold out?</th><th>Edit</th>\n\n<td>GENERIC-01</td><td>R42</td><td>No</td><td><button class="small-mock" disabled>Edit (mock)</button></td>\n</table><button class="small-mock" disabled>+ Add Item (future)</button></div>`;
        } else if (activeDashboardPage === "analytics") {
            contentDiv.innerHTML = `<h2><i class="fas fa-chart-simple"></i> Sales Pulse</h2><div class="card-grid"><div class="stat-card">📈 +12% weekly orders</div><div class="stat-card">⏰ Peak: 12-2PM</div></div><button class="small-mock" id="mockExportBtn">📎 Export CSV (demo)</button>${mockMsg("real analytics & PDF export")}</div>`;
            document.getElementById("mockExportBtn")?.addEventListener("click", () => alert("📄 CSV export simulation (backend ready)."));
        }
    } 
    else if (role === 'admin') {
        if (activeDashboardPage === "overview") {
            contentDiv.innerHTML = `<h2><i class="fas fa-chart-pie"></i> Admin Console</h2><div class="card-grid"><div class="stat-card"><div class="stat-number">124</div><div>Active Vendors</div></div><div class="stat-card"><div class="stat-number">12</div><div>Pending</div></div><div class="stat-card"><div class="stat-number">3</div><div>Suspended</div></div></div><div class="mock-table"><p>📌 Operational Pulse: all channels healthy</p>${mockMsg("vendor approval/suspension, full ecosystem control")}</div>`;
        } else if (activeDashboardPage === "vendors") {
            contentDiv.innerHTML = `<h2><i class="fas fa-shield-alt"></i> Vendor Ecosystem</h2><div class="mock-table">\n<th>Vendor</th><th>Email</th><th>Status</th><th>Mock action</th>\n\n<td>Campus Bites</td><td>vendor@uni-eats.com</td><td>✅ Approved</td><td><button class="small-mock" disabled>Suspend</button></td>\n\n\n<td>Grill Masters</td><td>grill@campus.com</td><td>⏳ Pending</td><td><button class="small-mock" disabled>Approve</button></td>\n</table></div>`;
        } else if (activeDashboardPage === "analytics") {
            contentDiv.innerHTML = `<h2><i class="fas fa-chart-column"></i> Reports & CSV</h2><div class="card-grid"><div class="stat-card">📅 Sales per vendor (mock)</div><div class="stat-card">⏲️ Peak hours: 12:30-13:30</div></div><button class="small-mock" id="adminExportCsv">⬇️ Download Audit (CSV mock)</button>`;
            document.getElementById("adminExportCsv")?.addEventListener("click", () => alert("📁 Mock CSV: vendor_audit.csv will be generated with backend."));
        } else if (activeDashboardPage === "orders") {
            contentDiv.innerHTML = `<h2><i class="fas fa-globe"></i> All Campus Orders</h2><div class="mock-table">\n<th>OrderID</th><th>Student</th><th>Vendor</th><th>Status</th>\n\n<td>#9991</td><td>Lerato</td><td>Campus Bites</td><td>Ready</td>\n</table></div>`;
        }
    }

    // SA Data Integration footnote
    const footnote = document.createElement("div");
    footnote.className = "placeholder-alert";
    footnote.style.marginTop = "1.5rem";
    footnote.innerHTML = "<i class='fas fa-database'></i> 📍 SA Data Integration: Allergen/dietary info referenced from South African R427 / National Food Composition Database (mock integration ready).";
    contentDiv.appendChild(footnote);
}

// Start the app
renderApp();