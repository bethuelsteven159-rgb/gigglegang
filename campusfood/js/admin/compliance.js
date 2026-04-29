import { sb } from '../config/supabase.js';
import { checkAuth, toast, logout, escapeHtml } from '../shared/utils.js';

checkAuth('admin');

const adminName = sessionStorage.getItem('username');
document.getElementById('adminName').textContent = adminName;

let currentComplianceData = [];

window.logout = async function() {
  await sb.auth.signOut();
  sessionStorage.clear();
  window.location.href = 'index.html';
};

async function loadComplianceReport() {
  const tbody = document.getElementById('complianceBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading compliance data...</td></tr>';
  
  const { data: vendors, error: vendorError } = await sb
    .from('vendors')
    .select('id, username, status')
    .order('username');
  
  if (vendorError || !vendors || vendors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No vendors found</td></tr>';
    return;
  }
  
  const complianceData = [];
  
  for (const vendor of vendors) {
    const { data: menuItems, error: menuError } = await sb
      .from('menu')
      .select('contains_peanuts, contains_tree_nuts, contains_dairy, contains_eggs, contains_soy, contains_fish, contains_shellfish, contains_gluten, is_halal, is_vegan, is_vegetarian, is_gluten_free')
      .eq('vendor_id', vendor.id);
    
    if (menuError || !menuItems || menuItems.length === 0) {
      complianceData.push({
        vendor: vendor.username,
        status: vendor.status,
        totalItems: 0,
        itemsWithInfo: 0,
        percentage: 0,
        complianceStatus: '❌ No Menu Items',
        missingInfo: 'No menu items added'
      });
      continue;
    }
    
    let itemsWithAllergenInfo = 0;
    
    for (const item of menuItems) {
      const hasAllergenInfo = item.contains_peanuts || item.contains_tree_nuts || item.contains_dairy || 
                              item.contains_eggs || item.contains_soy || item.contains_fish || 
                              item.contains_shellfish || item.contains_gluten;
      const hasDietaryInfo = item.is_halal || item.is_vegan || item.is_vegetarian || item.is_gluten_free;
      
      if (hasAllergenInfo && hasDietaryInfo) {
        itemsWithAllergenInfo++;
      }
    }
    
    const percentage = Math.round((itemsWithAllergenInfo / menuItems.length) * 100);
    let complianceStatus = '';
    let missingInfo = '';
    
    if (percentage === 100) {
      complianceStatus = '✅ Fully Compliant';
      missingInfo = 'None';
    } else if (percentage >= 75) {
      complianceStatus = '⚠️ Partially Compliant';
      missingInfo = `${menuItems.length - itemsWithAllergenInfo} item(s) missing info`;
    } else if (percentage > 0) {
      complianceStatus = '❌ Low Compliance';
      missingInfo = `${menuItems.length - itemsWithAllergenInfo} item(s) missing info`;
    } else {
      complianceStatus = '❌ Non-Compliant';
      missingInfo = 'No allergen/dietary information provided';
    }
    
    complianceData.push({
      vendor: vendor.username,
      status: vendor.status,
      totalItems: menuItems.length,
      itemsWithInfo: itemsWithAllergenInfo,
      percentage: percentage,
      complianceStatus: complianceStatus,
      missingInfo: missingInfo
    });
  }
  
  currentComplianceData = complianceData;
  
  tbody.innerHTML = complianceData.map(v => `
    <tr>
      <td>${escapeHtml(v.vendor)}</td>
      <td>${v.totalItems}</td>
      <td>${v.itemsWithInfo} / ${v.totalItems}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 80px; height: 6px; background: var(--gray-200); border-radius: 3px; overflow: hidden;">
            <div style="width: ${v.percentage}%; height: 100%; background: ${v.percentage === 100 ? '#10b981' : v.percentage >= 75 ? '#f59e0b' : '#ef4444'}; border-radius: 3px;"></div>
          </div>
          <span>${v.percentage}%</span>
        </div>
      </td>
      <td>${v.complianceStatus}</td>
      <td>${escapeHtml(v.missingInfo)}</td>
    </tr>
  `).join('');
}

function exportToCSV() {
  if (!currentComplianceData.length) {
    toast('No data to export', 'error');
    return;
  }
  
  const headers = ['Vendor', 'Total Items', 'Items with Allergen Info', 'Compliance %', 'Status', 'Missing Info'];
  const rows = currentComplianceData.map(v => [
    v.vendor,
    v.totalItems,
    `${v.itemsWithInfo} / ${v.totalItems}`,
    `${v.percentage}%`,
    v.complianceStatus,
    v.missingInfo
  ]);
  
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported successfully', 'success');
}

function exportToPDF() {
  if (!currentComplianceData.length) {
    toast('No data to export', 'error');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Campus Food - Compliance Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #0f766e; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #0f766e; color: white; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Campus Food - Allergen Compliance Report</h1>
      <p>Based on SA R146/2010 Food Labelling Regulations</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr><th>Vendor</th><th>Total Items</th><th>Items with Info</th><th>Compliance %</th><th>Status</th><th>Missing Info</th></tr>
        </thead>
        <tbody>
          ${currentComplianceData.map(v => `
            <tr>
              <td>${escapeHtml(v.vendor)}</td>
              <td>${v.totalItems}</td>
              <td>${v.itemsWithInfo} / ${v.totalItems}</td>
              <td>${v.percentage}%</td>
              <td>${v.complianceStatus}</td>
              <td>${escapeHtml(v.missingInfo)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">Campus Food Ordering System - Compliance Report</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function updateAdminDashboard() {
  const cardsContainer = document.querySelector('.cards');
  if (cardsContainer && !document.querySelector('.card[href="admin_compliance.html"]')) {
    const complianceCard = document.createElement('a');
    complianceCard.className = 'card';
    complianceCard.href = 'admin_compliance.html';
    complianceCard.innerHTML = `<div class="icon">✅</div><div class="label">Compliance Report</div>`;
    cardsContainer.appendChild(complianceCard);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadComplianceReport();
  updateAdminDashboard();
  
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
});
