import { jest } from '@jest/globals';

const mockVendorOrder  = jest.fn();
const mockVendorSelect = jest.fn(() => ({ order: mockVendorOrder }));

const mockMenuEq     = jest.fn();
const mockMenuSelect = jest.fn(() => ({ eq: mockMenuEq }));

const mockFrom = jest.fn((table) => {
  if (table === 'vendors') return { select: mockVendorSelect };
  if (table === 'menu')    return { select: mockMenuSelect };
  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: { from: mockFrom }
}));

const { loadCompliance } = await import('./compliance.js');

function setupDom() {
  document.body.innerHTML = `<table><tbody id="complianceBody"></tbody></table>`;
}

describe('admin/compliance.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockFrom.mockClear();
    mockVendorSelect.mockClear();
    mockVendorOrder.mockReset();
    mockMenuSelect.mockClear();
    mockMenuEq.mockReset();
    global.console.error = jest.fn();
  });

  test('returns early when tbody element is missing', async () => {
    await loadCompliance();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('shows no vendors message on error', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({ data: null, error: { message: 'db error' } });
    await loadCompliance();
    expect(document.getElementById('complianceBody').innerHTML).toContain('No vendors found');
  });

  test('shows no vendors message when vendor list is empty', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({ data: [], error: null });
    await loadCompliance();
    expect(document.getElementById('complianceBody').innerHTML).toContain('No vendors found');
  });

  test('shows No Items row when vendor has no menu items', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({ data: [], error: null });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('ShopA');
    expect(html).toContain('No Items');
  });

  test('renders fully compliant vendor (100%) with real arrays', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'HealthyBite', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: ['peanuts'], dietary_labels: ['halal'] },
        { id: 2, allergens: ['gluten'],  dietary_labels: ['vegan'] }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('HealthyBite');
    expect(html).toContain('100%');
    expect(html).toContain('✅ Fully Compliant');
  });

  test('renders fully compliant vendor (100%) with JSON string arrays', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'JsonShop', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: '["peanuts","gluten"]', dietary_labels: '["halal"]' },
        { id: 2, allergens: '["dairy"]',            dietary_labels: '["vegan"]' }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('100%');
    expect(html).toContain('✅ Fully Compliant');
  });

  test('renders partially compliant vendor (75–99%)', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'MixedGrill', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: ['peanuts'], dietary_labels: ['halal'] },
        { id: 2, allergens: ['gluten'],  dietary_labels: ['vegan'] },
        { id: 3, allergens: ['dairy'],   dietary_labels: ['vegetarian'] },
        { id: 4, allergens: [],          dietary_labels: [] }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('75%');
    expect(html).toContain('⚠️ Partially Compliant');
  });

  test('renders low compliance vendor (1–74%)', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'QuickByte', status: 'pending' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: ['peanuts'], dietary_labels: ['halal'] },
        { id: 2, allergens: [],          dietary_labels: [] },
        { id: 3, allergens: [],          dietary_labels: [] },
        { id: 4, allergens: [],          dietary_labels: [] }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('25%');
    expect(html).toContain('❌ Low Compliance');
  });

  test('renders non-compliant vendor (0%)', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'BareMinimum', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: [], dietary_labels: [] },
        { id: 2, allergens: [], dietary_labels: [] }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('0%');
    expect(html).toContain('❌ Non-Compliant');
  });

  test('shows vendor status badge in table', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'ShopA', status: 'suspended' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({ data: [], error: null });
    await loadCompliance();
    expect(document.getElementById('complianceBody').innerHTML).toContain('suspended');
  });

  test('renders multiple vendors in one table', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [
        { id: 'v1', username: 'VendorOne', status: 'approved' },
        { id: 'v2', username: 'VendorTwo', status: 'approved' }
      ],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [{ id: 1, allergens: ['peanuts'], dietary_labels: ['halal'] }],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('VendorOne');
    expect(html).toContain('VendorTwo');
  });

  test('counts allergen-only and dietary-only items separately', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'Counts', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: ['peanuts'], dietary_labels: [] },
        { id: 2, allergens: [],          dietary_labels: ['halal'] },
        { id: 3, allergens: ['gluten'],  dietary_labels: ['vegan'] }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('2 / 3');
    expect(html).toContain('33%');
  });

  test('handles mixed real arrays and JSON strings in same dataset', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'Mixed', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: ['peanuts'],  dietary_labels: '["halal"]' },
        { id: 2, allergens: '["gluten"]', dietary_labels: ['vegan'] }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('100%');
    expect(html).toContain('✅ Fully Compliant');
  });

  test('handles null allergens and dietary_labels gracefully', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [{ id: 'v1', username: 'NullShop', status: 'approved' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [
        { id: 1, allergens: null, dietary_labels: null },
        { id: 2, allergens: null, dietary_labels: null }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('0%');
    expect(html).toContain('❌ Non-Compliant');
  });

  test('includes pending vendors in the report', async () => {
    setupDom();
    mockVendorOrder.mockResolvedValue({
      data: [
        { id: 'v1', username: 'ApprovedShop', status: 'approved' },
        { id: 'v2', username: 'PendingShop',  status: 'pending' }
      ],
      error: null
    });
    mockMenuEq.mockResolvedValue({ data: [], error: null });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('ApprovedShop');
    expect(html).toContain('PendingShop');
  });
});
