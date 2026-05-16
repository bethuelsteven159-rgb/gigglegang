import { sb } from '../config/supabase.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Supabase may return arrays as real JS arrays or as JSON strings —
// handle both cases safely
function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

export async function loadCompliance() {
  const tbody = document.getElementById('complianceBody');
  if (!tbody) return;

  // Query all vendors (not just approved) so compliance covers everyone
  const { data: vendors, error } = await sb
    .from('vendors')
    .select('id, username, status')
    .order('username', { ascending: true });

  if (error || !vendors || vendors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No vendors found</td></tr>';
    return;
  }

  const complianceData = [];

  for (const vendor of vendors) {
    const { data: menuItems, error: menuError } = await sb
      .from('menu')
      .select('id, allergens, dietary_labels')
      .eq('vendor_id', vendor.id);

    if (menuError) {
      console.error(`Menu fetch error for vendor ${vendor.username}:`, menuError);
    }

    if (!menuItems || menuItems.length === 0) {
      complianceData.push({
        vendor:            vendor.username,
        status:            vendor.status,
        totalItems:        0,
        itemsWithAllergens: 0,
        itemsWithDietary:  0,
        percentage:        0,
        complianceStatus:  'No Items'
      });
      continue;
    }

    let itemsWithAllergens = 0;
    let itemsWithDietary   = 0;

    for (const item of menuItems) {
      const allergens     = parseArray(item.allergens);
      const dietaryLabels = parseArray(item.dietary_labels);
      if (allergens.length > 0)     itemsWithAllergens++;
      if (dietaryLabels.length > 0) itemsWithDietary++;
    }

    const itemsWithBoth = menuItems.filter(item =>
      parseArray(item.allergens).length > 0 &&
      parseArray(item.dietary_labels).length > 0
    ).length;

    const percentage = Math.round((itemsWithBoth / menuItems.length) * 100);

    let complianceStatus;
    if (percentage === 100)    complianceStatus = '✅ Fully Compliant';
    else if (percentage >= 75) complianceStatus = '⚠️ Partially Compliant';
    else if (percentage > 0)   complianceStatus = '❌ Low Compliance';
    else                       complianceStatus = '❌ Non-Compliant';

    complianceData.push({
      vendor:             vendor.username,
      status:             vendor.status,
      totalItems:         menuItems.length,
      itemsWithAllergens,
      itemsWithDietary,
      percentage,
      complianceStatus
    });
  }

  tbody.innerHTML = complianceData.map(v => `
    <tr>
      <td style="font-weight:500;">${escapeHtml(v.vendor)}</td>
      <td><span class="badge ${v.status === 'approved' ? 'badge-success' : v.status === 'suspended' ? 'badge-warning' : 'badge-neutral'}">${escapeHtml(v.status)}</span></td>
      <td>${v.totalItems}</td>
      <td>${v.itemsWithAllergens} / ${v.totalItems}</td>
      <td>${v.itemsWithDietary} / ${v.totalItems}</td>
      <td>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:80px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
            <div style="width:${v.percentage}%;height:100%;background:${v.percentage === 100 ? '#10b981' : v.percentage >= 75 ? '#f59e0b' : '#ef4444'};border-radius:3px;"></div>
          </div>
          <span>${v.percentage}%</span>
        </div>
      </td>
      <td>${v.complianceStatus}</td>
    </tr>
  `).join('');
}
