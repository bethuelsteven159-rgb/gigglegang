import { sb } from '../config/supabase.js';
import { checkAuth, toast, logout, escapeHtml } from '../shared/utils.js';

checkAuth('admin');

const adminName = sessionStorage.getItem('username');
document.getElementById('adminName').textContent = adminName;

window.logout = logout;

async function loadComplianceReport() {
  const tbody = document.getElementById('complianceBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading compliance data...<\/td><\/tr>';

  // Get all approved vendors
  const { data: vendors, error: vendorError } = await sb
    .from('vendors')
    .select('id, username, status')
    .order('username');

  if (vendorError || !vendors || vendors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No vendors found<\/td><\/tr>';
    return;
  }

  const complianceData = [];

  for (const vendor of vendors) {
    // Get vendor's menu items
    const { data: menuItems, error: menuError } = await sb
      .from('menu')
      .select('allergens, dietary_labels')
      .eq('vendor_id', vendor.id);

    if (menuError || !menuItems || menuItems.length === 0) {
      complianceData.push({
        vendor: vendor.username,
        status: vendor.status,
        totalItems: 0,
        itemsWithAllergens: 0,
        itemsWithDietary: 0,
        percentage: 0,
        level: 'No Items'
      });
      continue;
    }

    let itemsWithAllergens = 0;
    let itemsWithDietary = 0;

    for (const item of menuItems) {
      // Check if item has any allergens declared
      const hasAllergens = item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0;
      const hasDietary = item.dietary_labels && Array.isArray(item.dietary_labels) && item.dietary_labels.length > 0;
      
      if (hasAllergens) itemsWithAllergens++;
      if (hasDietary) itemsWithDietary++;
    }

    // Calculate compliance (items with BOTH allergen AND dietary info)
    const itemsWithBoth = menuItems.filter(item => {
      const hasAllergens = item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0;
      const hasDietary = item.dietary_labels && Array.isArray(item.dietary_labels) && item.dietary_labels.length > 0;
      return hasAllergens && hasDietary;
    }).length;

    const percentage = Math.round((itemsWithBoth / menuItems.length) * 100);
    
    let complianceLevel = '';
    let badgeClass = '';
    
    if (percentage === 100) {
      complianceLevel = '✅ Fully Compliant';
      badgeClass = 'status-approved';
    } else if (percentage >= 75) {
      complianceLevel = '⚠️ Partially Compliant';
      badgeClass = 'status-pending';
    } else if (percentage > 0) {
      complianceLevel = '❌ Low Compliance';
      badgeClass = 'status-suspended';
    } else {
      complianceLevel = '❌ Non-Compliant';
      badgeClass = 'status-suspended';
    }

    complianceData.push({
      vendor: vendor.username,
      status: vendor.status,
      totalItems: menuItems.length,
      itemsWithAllergens: itemsWithAllergens,
      itemsWithDietary: itemsWithDietary,
      percentage: percentage,
      level: complianceLevel,
      badgeClass: badgeClass
    });
  }

  // Render table
  tbody.innerHTML = complianceData.map(v => `
    <tr>
      <td style="font-weight: 500;">${escapeHtml(v.vendor)}<\/td>
      <td><span class="status status-${v.status === 'approved' ? 'approved' : 'suspended'}">${v.status}<\/span><\/td>
      <td>${v.totalItems}<\/td>
      <td>${v.itemsWithAllergens} / ${v.totalItems}<\/td>
      <td>${v.itemsWithDietary} / ${v.totalItems}<\/td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 80px; height: 6px; background: var(--gray-200); border-radius: 3px; overflow: hidden;">
            <div style="width: ${v.percentage}%; height: 100%; background: ${v.percentage === 100 ? '#10b981' : v.percentage >= 75 ? '#f59e0b' : '#ef4444'}; border-radius: 3px;"><\/div>
          <\/div>
          <span>${v.percentage}%<\/span>
        <\/div>
      <\/td>
      <td><span class="${v.badgeClass}" style="padding: 0.2rem 0.6rem; border-radius: 20px;">${v.level}<\/span><\/td>
    <\/tr>
  `).join('');
}

// Load compliance report when page loads
document.addEventListener('DOMContentLoaded', loadComplianceReport);
