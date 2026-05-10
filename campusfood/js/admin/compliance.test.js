import { jest } from '@jest/globals';

// Mock Supabase
const mockEqSecond = jest.fn();
const mockEqFirst = jest.fn(() => ({
  eq: mockEqSecond
}));
const mockSelect = jest.fn(() => ({
  eq: mockEqFirst
}));
const mockFrom = jest.fn(() => ({
  select: mockSelect
}));

const mockSb = {
  from: mockFrom
};

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: mockSb
}));

// Mock shared utils
jest.unstable_mockModule('../shared/utils.js', () => ({
  checkAuth: jest.fn(),
  toast: jest.fn(),
  logout: jest.fn(),
  escapeHtml: (str) => str || ''
}));

// Mock localStorage and sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock window.location
delete window.location;
window.location = { href: '' };

// Import after mocks
const { loadComplianceReport } = await import('./compliance.js');

describe('admin/compliance.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    jest.clearAllMocks();

    mockEqSecond.mockReset();
    mockEqFirst.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReset();
  });

  test('shows loading state initially', async () => {
    document.body.innerHTML = `
      <div id="complianceBody">Loading...</div>
    `;

    // Don't await to check initial state
    const promise = loadComplianceReport();
    
    const tbody = document.getElementById('complianceBody');
    expect(tbody.innerHTML).toContain('Loading compliance data');
    
    // Clean up
    mockEqSecond.mockResolvedValueOnce({ data: [], error: null });
    await promise;
  });

  test('shows no vendors message when vendors table is empty', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadComplianceReport();

    const tbody = document.getElementById('complianceBody');
    expect(tbody.innerHTML).toContain('No vendors found');
  });

  test('shows error when vendors query fails', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' }
    });

    await loadComplianceReport();

    const tbody = document.getElementById('complianceBody');
    expect(tbody.innerHTML).toContain('No vendors found');
  });

  test('displays vendor with no menu items correctly', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Test Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Test Vendor');
    expect(html).toContain('approved');
    expect(html).toContain('No Items');
  });

  test('calculates 100% compliance when all items have both allergen and dietary info', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Full Compliance Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] },
        { allergens: ['gluten'], dietary_labels: ['vegetarian'] },
        { allergens: ['eggs'], dietary_labels: ['vegan'] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Full Compliance Vendor');
    expect(html).toContain('100%');
    expect(html).toContain('✅ Fully Compliant');
  });

  test('calculates 75% compliance correctly', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Partial Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] },
        { allergens: ['gluten'], dietary_labels: ['vegetarian'] },
        { allergens: ['eggs'], dietary_labels: [] },
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Partial Vendor');
    expect(html).toContain('50%'); // 2 out of 4 items have both = 50%
    expect(html).toContain('❌ Low Compliance');
  });

  test('calculates 0% compliance when no items have any data', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Non Compliant Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: [], dietary_labels: [] },
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Non Compliant Vendor');
    expect(html).toContain('0%');
    expect(html).toContain('❌ Non-Compliant');
  });

  test('counts items with allergen info correctly', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Allergen Test Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: [] },
        { allergens: ['gluten'], dietary_labels: [] },
        { allergens: [], dietary_labels: ['halal'] },
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    // 2 items with allergens, 1 item with dietary, 0 items with both = 0%
    expect(html).toContain('Allergen Test Vendor');
    expect(html).toContain('2 / 4'); // items with allergens
    expect(html).toContain('1 / 4'); // items with dietary
    expect(html).toContain('0%');
  });

  test('handles partially filled arrays correctly', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Mixed Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts', 'eggs'], dietary_labels: ['halal', 'vegan'] },
        { allergens: ['gluten'], dietary_labels: [] },
        { allergens: [], dietary_labels: ['vegetarian'] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    // 1 item has both (first), 2 items have allergen only/dietary only
    // 1 out of 3 = 33%
    expect(html).toContain('Mixed Vendor');
    expect(html).toContain('33%');
    expect(html).toContain('❌ Low Compliance');
  });

  test('displays multiple vendors correctly', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [
        { id: 'v1', username: 'Vendor A', status: 'approved' },
        { id: 'v2', username: 'Vendor B', status: 'suspended' }
      ],
      error: null
    });

    // First vendor's menu
    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] }
      ],
      error: null
    });

    // Second vendor's menu
    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Vendor A');
    expect(html).toContain('Vendor B');
    expect(html).toContain('approved');
    expect(html).toContain('suspended');
    expect(html).toContain('100%');
    expect(html).toContain('0%');
  });

  test('handles null or undefined allergens/dietary_labels arrays', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Null Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { }, // no allergens or dietary_labels fields
        { allergens: null, dietary_labels: null },
        { allergens: undefined, dietary_labels: undefined }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Null Vendor');
    expect(html).toContain('0 / 3'); // items with allergens
    expect(html).toContain('0 / 3'); // items with dietary
    expect(html).toContain('0%');
  });

  test('shows progress bar with correct width and color for 100%', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Green Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('width: 100%');
    expect(html).toContain('background: #10b981'); // green for 100%
  });

  test('shows progress bar with correct width and color for partial compliance', async () => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
    `;

    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Orange Vendor', status: 'approved' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] },
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('width: 50%');
    expect(html).toContain('background: #ef4444'); // red for below 75%
  });
});
