import { sb } from '../config/supabase.js';
import { checkAuth, logout } from '../shared/utils.js';

checkAuth('admin');

document.getElementById('adminName').textContent = sessionStorage.getItem('username');
document.getElementById('logoutBtn').addEventListener('click', logout);

async function loadCompliance() {
  const tbody = document.getElementById('complianceBody');
  const { data: vendors, error } = await sb.from('vendors').select('id, username').eq('status', 'approved');

  if (error || !vendors || vendors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No vendors found<\/td><\/tr>';
    return;
  }

  const complianceData = [];

  for (const vendor of vendors) {
    // Get vendor's menu items with new columns (allergens and dietary_labels arrays)
    const { data: menuItems } = await sb
      .from('menu')
      .select('allergens, dietary_labels')
      .eq('vendor_id', vendor.id);

    if (!menuItems || menuItems.length === 0) {
      complianceData.push({
        vendor: vendor.username,
        totalItems: 0,
        itemsWithAllergens: 0,
        itemsWithDietary: 0,
        percentage: 0,
        status: 'No Items'
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

    // Items with BOTH allergen AND dietary info
    const itemsWithBoth = menuItems.filter(item => {
      const hasAllergens = item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0;
      const hasDietary = item.dietary_labels && Array.isArray(item.dietary_labels) && item.dietary_labels.length > 0;
      return hasAllergens && hasDietary;
    }).length;

    const percentage = Math.round((itemsWithBoth / menuItems.length) * 100);
    
    let complianceStatus = '';
    if (percentage === 100) {
      complianceStatus = '✅ Fully Compliant';
    } else if (percentage >= 75) {
      complianceStatus = '⚠️ Partially Compliant';
    } else if (percentage > 0) {
      complianceStatus = '❌ Low Compliance';
    } else {
      complianceStatus = '❌ Non-Compliant';
    }

    complianceData.push({
      vendor: vendor.username,
      totalItems: menuItems.length,
      itemsWithAllergens: itemsWithAllergens,
      itemsWithDietary: itemsWithDietary,
      percentage: percentage,
      status: complianceStatus
    });
  }

  // Render table with 7 columns
  tbody.innerHTML = complianceData.map(v => `
    <tr>
      <td style="font-weight: 500;">${escapeHtml(v.vendor)}<\/td>
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
      <td>${v.status}<\/td>
    <\/tr>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

loadCompliance();
