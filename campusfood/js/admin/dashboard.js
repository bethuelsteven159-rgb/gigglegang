// Updated dashboard.js with Supabase support

import { supabase } from '../supabase.js';

// Function to render admin name (keeping your existing function)
export function renderAdminName(username = null) {
  // Try to get username from sessionStorage first (backward compatibility)
  let displayName = username || sessionStorage.getItem('username') || 'Admin';
  
  // Update both locations in the HTML
  const name = document.getElementById('adminName');
  const welcome = document.getElementById('adminNameWelcome');
  
  // Check if welcome element exists (for older dashboard version)
  if (name) name.textContent = displayName;
  if (welcome) welcome.textContent = displayName;
}

// New function to fetch admin data from Supabase
export async function fetchAndRenderAdminName() {
  try {
    // Get current user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('No user found, using session storage');
      renderAdminName();
      return;
    }
    
    // Fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('full_name, email, role')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      renderAdminName(user.email);
      return;
    }
    
    // Check if user is admin
    if (profile.role !== 'admin') {
      console.error('User is not an admin');
      window.location.href = 'index.html';
      return;
    }
    
    // Render the admin name (prefer full_name, fallback to email)
    const adminName = profile.full_name || profile.email || 'Admin';
    renderAdminName(adminName);
    
    // Also store in sessionStorage for backward compatibility
    sessionStorage.setItem('username', adminName);
    sessionStorage.setItem('userRole', profile.role);
    
  } catch (err) {
    console.error('Error in fetchAndRenderAdminName:', err);
    renderAdminName(); // Fallback to default
  }
}

// Function to handle logout
export async function handleLogout() {
  try {
    await supabase.auth.signOut();
    sessionStorage.clear(); // Clear session storage
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Logout error:', err);
    alert('Error logging out');
  }
}

// Initialize dashboard (call this from your main script)
export async function initDashboard() {
  await fetchAndRenderAdminName();
  
  // Set up logout button if it exists
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Auto-initialize if this is the main module
// This runs when the script is loaded as a module
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a page that needs admin initialization
    if (document.getElementById('adminName')) {
      initDashboard();
    }
  });
} else {
  if (document.getElementById('adminName')) {
    initDashboard();
  }
}
