import { jest } from '@jest/globals';

const mockVendorEq = jest.fn();
const mockVendorSelect = jest.fn(() => ({ eq: mockVendorEq }));

const mockMenuEq = jest.fn();
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
    mockVendorEq.mockReset();
    mockMenuSelect.mockClear();
    mockMenuEq.mockReset();
  });

  test('returns early when tbody element is missing', async () => {
    await loadCompliance();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('shows no vendors message on error', async () => {
    setupDom();
    mockVendorEq.mockResolvedValue({ data: null, error: { message: 'db error' } });
    await loadCompliance();
    expect(document.getElementById('complianceBody').innerHTML).toContain('No vendors found');
  });

  test('shows no vendors message when vendor list is empty', async () => {
    setupDom();
    mockVendorEq.mockResolvedValue({ data: [], error: null });
    await loadCompliance();
    expect(document.getElementById('complianceBody').innerHTML).toContain('No vendors found');
  });

  test('shows No Items row when vendor has no menu items', async () => {
    setupDom();
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'ShopA' }], error: null });
    mockMenuEq.mockResolvedValue({ data: [], error: null });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('ShopA');
    expect(html).toContain('No Items');
  });

  test('renders fully compliant vendor (100%) with real arrays', async () => {
    setupDom();
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'HealthyBite' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] },
        { allergens: ['gluten'],  dietary_labels: ['vegan'] }
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
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'JsonShop' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: '["peanuts","gluten"]', dietary_labels: '["halal"]' },
        { allergens: '["dairy"]',            dietary_labels: '["vegan"]' }
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
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'MixedGrill' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] },
        { allergens: ['gluten'],  dietary_labels: ['vegan'] },
        { allergens: ['dairy'],   dietary_labels: ['vegetarian'] },
        { allergens: [],          dietary_labels: [] }
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
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'QuickByte' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] },
        { allergens: [],          dietary_labels: [] },
        { allergens: [],          dietary_labels: [] },
        { allergens: [],          dietary_labels: [] }
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
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'BareMinimum' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: [], dietary_labels: [] },
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('0%');
    expect(html).toContain('❌ Non-Compliant');
  });

  test('renders multiple vendors in one table', async () => {
    setupDom();
    mockVendorEq.mockResolvedValue({
      data: [{ id: 'v1', username: 'VendorOne' }, { id: 'v2', username: 'VendorTwo' }],
      error: null
    });
    mockMenuEq.mockResolvedValue({
      data: [{ allergens: ['peanuts'], dietary_labels: ['halal'] }],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('VendorOne');
    expect(html).toContain('VendorTwo');
  });

  test('counts allergen-only and dietary-only items separately', async () => {
    setupDom();
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'Counts' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: ['peanuts'], dietary_labels: [] },
        { allergens: [],          dietary_labels: ['halal'] },
        { allergens: ['gluten'],  dietary_labels: ['vegan'] }
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
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'Mixed' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: ['peanuts'],  dietary_labels: '["halal"]' },
        { allergens: '["gluten"]', dietary_labels: ['vegan'] }
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
    mockVendorEq.mockResolvedValue({ data: [{ id: 'v1', username: 'NullShop' }], error: null });
    mockMenuEq.mockResolvedValue({
      data: [
        { allergens: null, dietary_labels: null },
        { allergens: null, dietary_labels: null }
      ],
      error: null
    });
    await loadCompliance();
    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('0%');
    expect(html).toContain('❌ Non-Compliant');
  });
});
