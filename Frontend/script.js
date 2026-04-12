(function() {
    // Supabase Configuration
    const SUPABASE_URL = 'https://slkereqjtknbvtywncph.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa2VyZXFqdGtuYnZ0eXduY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDU1MTksImV4cCI6MjA5MTIyMTUxOX0.Yz9IpZWGDB5hKpLHZJIJseNCTe9YacpVzeuDOybj9ws';
    
    let supabase = null;
    let currentUser = null;
    let activeDashboardPage = "overview";
    let sidebarCollapsed = false;

    // Initialize Supabase
    function initSupabase() {
        try {
            if (typeof window.supabase !== 'undefined') {
                const { createClient } = window.supabase;
                supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log("✅ Supabase initialized");
                return true;
            } else {
                console.warn("⚠️ Supabase SDK not loaded");
                return false;
            }
        } catch (error) {
            console.error("❌ Supabase init error:", error);
            return false;
        }
    }

    // Database functions for user management (using localStorage for persistence)
    function createUserInDatabase(userData) {
        const users = JSON.parse(localStorage.getItem('unieats_registered_users') || '{}');
        users[userData.email] = {
            email: userData.email,
            role: userData.role,
            fullName: userData.fullName,
            createdAt: new Date().toISOString(),
            ...userData
        };
        localStorage.setItem('unieats_registered_users', JSON.stringify(users));
        return users[userData.email];
    }

    function getUserFromDatabase(email) {
        const users = JSON.parse(localStorage.getItem('unieats_registered_users') || '{}');
        return users[email] || null;
    }

    // Get or create user from Google Sign In
    async function getOrCreateUserFromGoogle(supabaseUser) {
        if (!supabaseUser) return null;
        
        const email = supabaseUser.email;
        const metadata = supabaseUser.user_metadata || {};
        const fullName = metadata.full_name || metadata.name || email.split('@')[0];
        
        // Check if user exists in our database
        let existingUser = getUserFromDatabase(email);
        
        if (existingUser) {
            console.log("✅ Existing user found:", existingUser);
            return {
                ...existingUser,
                supabaseId: supabaseUser.id,
                avatarInitial: fullName.substring(0, 2).toUpperCase()
            };
        }
        
        // New user - they need to select their role
        console.log("🆕 New user detected, needs role selection");
        return {
            email: email,
            fullName: fullName,
            avatarInitial: fullName.substring(0, 2).toUpperCase(),
            supabaseId: supabaseUser.id,
            isNewUser: true,
            needsRoleSelection: true
        };
    }

    // Complete registration for new user
    async function completeUserRegistration(selectedRole) {
        if (!currentUser || !currentUser.isNewUser) return false;
        
        const userData = {
            email: currentUser.email,
            role: selectedRole,
            fullName: currentUser.fullName,
            avatarInitial: currentUser.avatarInitial,
            age: 20,
            supabaseId: currentUser.supabaseId
        };
        
        // Add role-specific fields
        if (selectedRole === 'vendor') {
            userData.companyName = currentUser.fullName;
            userData.regNumber = 'VEN-' + Math.floor(Math.random() * 1000);
        } else if (selectedRole === 'admin') {
            userData.employeeId = 'ADM-' + Math.floor(Math.random() * 1000);
        } else {
            userData.studentId = 'STU-' + Math.floor(Math.random() * 1000);
        }
        
        createUserInDatabase(userData);
        currentUser = { ...userData, isNewUser: false, needsRoleSelection: false };
        return true;
    }

    // Google Sign In
    async function signInWithGoogle() {
        if (!supabase) {
            showError("Supabase not initialized. Please refresh the page.");
            return;
        }
        
        showLoading(true);
        
        try {
            // Get the current URL for redirect
            const redirectUrl = window.location.origin + window.location.pathname;
            console.log("Redirect URL:", redirectUrl);
            
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Google sign-in error:', error);
            showError('Google login failed: ' + error.message);
            showLoading(false);
        }
    }

    // Sign Out
    async function signOut() {
        if (supabase) {
            try {
                await supabase.auth.signOut();
            } catch(error) {
                console.error('Sign out error:', error);
            }
        }
        currentUser = null;
        // Clear any stored session data
        localStorage.removeItem('supabase.auth.token');
        renderApp();
    }

    // Helper functions
    function showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                if (errorDiv) errorDiv.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    function showLoading(show) {
        const loadingDiv = document.getElementById('loadingIndicator');
        if (loadingDiv) {
            loadingDiv.style.display = show ? 'block' : 'none';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // Render functions
    function renderApp() {
        const appDiv = document.getElementById("app");
        if (!appDiv) return;
        
        if (!currentUser) {
            renderLanding(appDiv);
        } else if (currentUser.needsRoleSelection) {
            renderRoleSelection(appDiv);
        } else {
            renderDashboard(appDiv);
        }
    }

    function renderLanding(appDiv) {
        appDiv.innerHTML = `
            <div class="landing-container">
                <div class="hero">
                    <div class="hero-icon"><i class="fas fa-bowl-food"></i></div>
                    <h1>Uni-Eats</h1>
                    <p>Smart Campus Food Ordering System</p>
                    <div class="food-tags">
                        <span class="food-tag"><i class="fas fa-pepper-hot"></i> SA Flavours</span>
                        <span class="food-tag"><i class="fas fa-leaf"></i> Allergen Smart</span>
                        <span class="food-tag"><i class="fas fa-clock"></i> Real-time Tracking</span>
                    </div>
                </div>
                
                <div class="login-container">
                    <h2 style="color: #c2410c; margin-bottom: 1rem;">Welcome to Uni-Eats</h2>
                    <p style="color: #7a4c2c; margin-bottom: 1rem;">Please sign in with your Google account to continue</p>
                    
                    <button id="googleSignInBtn" class="google-login-btn">
                        <i class="fab fa-google"></i> Sign in with Google
                    </button>
                    
                    <div id="errorMessage" class="error-message" style="display: none;"></div>
                    <div id="loadingIndicator" class="info-message" style="display: none;">
                        <div class="spinner"></div> Redirecting to Google...
                    </div>
                </div>
            </div>
        `;
        
        const googleBtn = document.getElementById("googleSignInBtn");
        if (googleBtn) googleBtn.addEventListener("click", signInWithGoogle);
    }

    function renderRoleSelection(appDiv) {
        appDiv.innerHTML = `
            <div class="landing-container">
                <div class="hero">
                    <div class="hero-icon"><i class="fas fa-user-plus"></i></div>
                    <h1>Welcome ${escapeHtml(currentUser.fullName)}!</h1>
                    <p>Please select your role to continue</p>
                </div>
                
                <div class="role-cards">
                    <div class="role-card" data-role="student">
                        <div class="role-emoji">🎓</div>
                        <h3>Student</h3>
                        <p>Order food from campus vendors</p>
                        <button class="role-login-btn" data-role="student">Continue as Student</button>
                    </div>
                    <div class="role-card" data-role="vendor">
                        <div class="role-emoji">🍔</div>
                        <h3>Vendor</h3>
                        <p>Manage your restaurant</p>
                        <button class="role-login-btn" data-role="vendor">Continue as Vendor</button>
                    </div>
                    <div class="role-card" data-role="admin">
                        <div class="role-emoji">📊</div>
                        <h3>Admin</h3>
                        <p>Manage campus operations</p>
                        <button class="role-login-btn" data-role="admin">Continue as Admin</button>
                    </div>
                </div>
                
                <div id="errorMessage" class="error-message" style="display: none;"></div>
            </div>
        `;
        
        document.querySelectorAll('.role-login-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const role = btn.getAttribute('data-role');
                await completeUserRegistration(role);
                renderApp();
            });
        });
    }

    function renderDashboard(appDiv) {
        const role = currentUser.role;
        const displayName = role === 'vendor' ? currentUser.companyName : currentUser.fullName;
        const avatarInitial = currentUser.avatarInitial || (displayName ? displayName.substring(0,2).toUpperCase() : "U");
        
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
        } else {
            navItems = [
                { id: "overview", label: "Admin Console", icon: "fas fa-gauge-high" },
                { id: "vendors", label: "Vendor Ecosystem", icon: "fas fa-building" },
                { id: "analytics", label: "Reports", icon: "fas fa-chart-column" },
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
                        <div class="profile-avatar">${escapeHtml(avatarInitial)}</div>
                        <div class="profile-info">
                            <div class="profile-name">${escapeHtml(displayName)}</div>
                            <div class="profile-role">${role}</div>
                        </div>
                    </div>
                </div>
                <div class="main-content">
                    <div class="top-bar">
                        <div class="user-greeting">
                            <i class="fas fa-hand-peace"></i> Welcome, ${escapeHtml(displayName)}
                            <small style="display:block; font-size:0.7rem;">${escapeHtml(currentUser.email)}</small>
                        </div>
                        <button class="logout-top" id="dashboardLogoutBtn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                    <div id="dynamicContentArea"></div>
                </div>
            </div>
        `;
        
        const navContainer = document.getElementById("navItemsContainer");
        if (navContainer) {
            navItems.forEach(item => {
                const navDiv = document.createElement("div");
                navDiv.className = `nav-item ${activeDashboardPage === item.id ? 'active' : ''}`;
                navDiv.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
                navDiv.addEventListener("click", () => {
                    activeDashboardPage = item.id;
                    renderApp();
                });
                navContainer.appendChild(navDiv);
            });
        }
        
        const toggleBtn = document.getElementById("toggleSidebarBtn");
        if (toggleBtn) toggleBtn.addEventListener("click", () => {
            sidebarCollapsed = !sidebarCollapsed;
            renderApp();
        });
        
        const logoutBtn = document.getElementById("dashboardLogoutBtn");
        if (logoutBtn) logoutBtn.addEventListener("click", () => signOut());
        
        const profileBtn = document.getElementById("profileSidebarBtn");
        if (profileBtn) profileBtn.addEventListener("click", () => openProfileModal());
        
        renderDynamicContent();
    }

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
                    <input type="email" value="${escapeHtml(currentUser.email)}" disabled>
                </div>
                ${!isVendor ? `<div class="form-group"><label>Age</label><input type="number" id="editAge" value="${currentUser.age}"></div>` : 
                              `<div class="form-group"><label>Vendor ID</label><input value="${escapeHtml(currentUser.regNumber)}" disabled></div>`}
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
            currentUser.avatarInitial = newName.substring(0, 2).toUpperCase();
            createUserInDatabase(currentUser);
            modalDiv.remove();
            renderApp();
        });
        
        closeBtn.addEventListener("click", () => modalDiv.remove());
    }

    function renderDynamicContent() {
        const contentDiv = document.getElementById("dynamicContentArea");
        if (!contentDiv) return;
        
        const role = currentUser.role;
        
        if (role === 'student') {
            if (activeDashboardPage === "overview") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-graduation-cap"></i> Student Dashboard</h2>
                    <div class="card-grid">
                        <div class="stat-card"><div class="stat-number">8</div><div>Active Orders</div></div>
                        <div class="stat-card"><div class="stat-number">12</div><div>Vendors nearby</div></div>
                        <div class="stat-card"><div class="stat-number">★ 4.8</div><div>Campus rating</div></div>
                    </div>
                    <div class="mock-table">
                        <h3>📋 Recent Activity</h3>
                        <p>Last order: <strong>#UNI-234</strong> — Ready for pickup</p>
                    </div>
                `;
            } else if (activeDashboardPage === "orders") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-receipt"></i> My Orders</h2>
                    <div class="mock-table">
                        <table>
                            <tr><th>Order ID</th><th>Vendor</th><th>Status</th><th>ETA</th></tr>
                            <tr><td>#ORD101</td><td>Campus Bites</td><td><span class="badge">Preparing</span></td><td>~10 min</td></tr>
                            <tr><td>#ORD102</td><td>Grill Masters</td><td><span class="badge">Ready</span></td><td>Now</td></tr>
                        </table>
                    </div>
                `;
            } else if (activeDashboardPage === "vendors") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-store"></i> Campus Vendors</h2>
                    <div class="mock-table">
                        <table>
                            <tr><th>Vendor</th><th>Cuisine</th><th>Distance</th><th>Action</th></tr>
                            <tr><td>Campus Bites</td><td>Global Bowls</td><td>50m</td><td><button class="small-mock" disabled>Order Soon</button></td></tr>
                            <tr><td>Grill Masters</td><td>Braai & Grill</td><td>120m</td><td><button class="small-mock" disabled>Order Soon</button></td></tr>
                        </table>
                    </div>
                `;
            } else {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-chart-line"></i> Insights</h2>
                    <div class="card-grid">
                        <div class="stat-card">📊 Peak hours: 12:30-13:30</div>
                        <div class="stat-card">🍽️ Top vendor: Campus Bites</div>
                    </div>
                `;
            }
        } else if (role === 'vendor') {
            if (activeDashboardPage === "overview") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-kitchen-set"></i> Vendor Panel — ${escapeHtml(currentUser.companyName)}</h2>
                    <div class="card-grid">
                        <div class="stat-card">📦 Today's orders: 24</div>
                        <div class="stat-card">⭐ Rating: 4.7</div>
                        <div class="stat-card">🆔 Vendor ID: ${escapeHtml(currentUser.regNumber)}</div>
                    </div>
                    <div class="mock-table">
                        <h3>🍽️ Sample Menu</h3>
                        <p>• Combo-A - R55 - Available</p>
                        <p>• Combo-B - R65 - Available</p>
                    </div>
                `;
            } else if (activeDashboardPage === "orders") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-truck-fast"></i> Incoming Orders</h2>
                    <div class="mock-table">
                        <table>
                            <tr><th>Order ID</th><th>Student</th><th>Items</th><th>Status</th></tr>
                            <tr><td>#V221</td><td>Lerato N.</td><td>Meal Deal</td><td><span class="badge">Preparing</span></td>
                            </tr>
                            <tr><td>#V222</td><td>Sarah C.</td><td>Combo-A</td><td><span class="badge">Received</span></td>
                            </tr>
                        </table>
                    </div>
                `;
            } else if (activeDashboardPage === "menu") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-list-ul"></i> Menu Manager</h2>
                    <div class="placeholder-alert">
                        🔧 Allergen data: SA National Food Database integration ready
                    </div>
                `;
            } else {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-chart-simple"></i> Sales Pulse</h2>
                    <div class="card-grid">
                        <div class="stat-card">📈 +12% weekly orders</div>
                        <div class="stat-card">⏰ Peak: 12-2PM</div>
                    </div>
                `;
            }
        } else {
            if (activeDashboardPage === "overview") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-chart-pie"></i> Admin Console</h2>
                    <div class="card-grid">
                        <div class="stat-card"><div class="stat-number">124</div><div>Active Vendors</div></div>
                        <div class="stat-card"><div class="stat-number">12</div><div>Pending</div></div>
                        <div class="stat-card"><div class="stat-number">3</div><div>Suspended</div></div>
                    </div>
                `;
            } else if (activeDashboardPage === "vendors") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-shield-alt"></i> Vendor Ecosystem</h2>
                    <div class="mock-table">
                        <p>✅ Campus Bites - Approved</p>
                        <p>⏳ Grill Masters - Pending Review</p>
                        <p>✅ Green Bowl - Approved</p>
                    </div>
                `;
            } else if (activeDashboardPage === "analytics") {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-chart-column"></i> Reports & CSV</h2>
                    <button class="small-mock" id="exportBtn">⬇️ Download Audit Report</button>
                `;
                setTimeout(() => {
                    const exportBtn = document.getElementById("exportBtn");
                    if (exportBtn) exportBtn.addEventListener("click", () => alert("📁 CSV Export: vendor_audit.csv (Backend ready)"));
                }, 100);
            } else {
                contentDiv.innerHTML = `
                    <h2><i class="fas fa-globe"></i> All Campus Orders</h2>
                    <div class="mock-table">
                        <table>
                            <tr><th>Order ID</th><th>Student</th><th>Vendor</th><th>Status</th></tr>
                            <tr><td>#9991</td><td>Lerato</td><td>Campus Bites</td><td>Ready</td>
                            </tr>
                            <tr><td>#9992</td><td>Sarah</td><td>Grill Masters</td><td>Preparing</td>
                            </tr>
                        </table>
                    </div>
                `;
            }
        }
        
        const footer = document.createElement("div");
        footer.className = "placeholder-alert";
        footer.style.marginTop = "1.5rem";
        footer.innerHTML = `<i class="fas fa-id-card"></i> ✅ Authenticated via Google | Role: ${currentUser.role} | Email: ${escapeHtml(currentUser.email)}`;
        contentDiv.appendChild(footer);
    }

    // Initialize authentication - THIS IS KEY FOR HANDLING THE REDIRECT
    async function initAuth() {
        initSupabase();
        
        if (supabase) {
            try {
                // Check for existing session (this handles the redirect from Google)
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error("Session error:", error);
                }
                
                if (session && session.user) {
                    console.log("Session found, processing user...");
                    const user = await getOrCreateUserFromGoogle(session.user);
                    if (user) {
                        currentUser = user;
                    }
                } else {
                    console.log("No active session");
                }
            } catch (error) {
                console.error("Auth init error:", error);
            }
            
            // Listen for auth state changes (important for OAuth redirect)
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log("Auth state changed:", event);
                
                if (event === 'SIGNED_IN' && session && session.user) {
                    console.log("User signed in, processing...");
                    const user = await getOrCreateUserFromGoogle(session.user);
                    if (user) {
                        currentUser = user;
                        renderApp();
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log("User signed out");
                    currentUser = null;
                    renderApp();
                } else if (event === 'TOKEN_REFRESHED') {
                    console.log("Token refreshed");
                }
            });
        }
        
        renderApp();
    }
    
    // Start the app
    initAuth();
})();
