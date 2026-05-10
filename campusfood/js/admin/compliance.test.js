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

jest.unstable_mockModule('../../js/config/supabase.js', () => ({
  sb: mockSb
}));

// Mock sessionStorage
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
const { loadComplianceReport } = await import('../../js/admin/compliance.js');

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

    const promise = loadComplianceReport();
    
    const tbody = document.getElementById('complianceBody');
    expect(tbody.innerHTML).toContain('Loading compliance data');
    
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
    expect(html).toContain('No Items');
  });

  test('calculates 100% compliance correctly', async () => {
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
        { allergens: ['gluten'], dietary_labels: ['vegetarian'] }
      ],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Full Compliance Vendor');
    expect(html).toContain('100%');
    expect(html).toContain('✅ Fully Compliant');
  });

  test('calculates 0% compliance correctly', async () => {
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

  test('handles multiple vendors correctly', async () => {
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

    mockEqSecond.mockResolvedValueOnce({
      data: [{ allergens: ['peanuts'], dietary_labels: ['halal'] }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [{ allergens: [], dietary_labels: [] }],
      error: null
    });

    await loadComplianceReport();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Vendor A');
    expect(html).toContain('Vendor B');
    expect(html).toContain('100%');
    expect(html).toContain('0%');
  });
});
