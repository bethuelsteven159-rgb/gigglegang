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

// Mock shared utils
jest.unstable_mockModule('../../js/shared/utils.js', () => ({
  checkAuth: jest.fn(),
  logout: jest.fn(),
  toast: jest.fn(),
  escapeHtml: (str) => str || ''
}));

// Mock sessionStorage with proper Jest spies
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock window.location
delete window.location;
window.location = { href: '' };

// Set up DOM elements BEFORE importing the module
document.body.innerHTML = `
  <div id="adminName"></div>
  <div id="complianceBody"></div>
  <div id="toast"></div>
  <button id="logoutBtn"></button>
`;

// Set up sessionStorage mock return values
sessionStorageMock.getItem.mockImplementation((key) => {
  if (key === 'username') return 'Admin User';
  if (key === 'role') return 'admin';
  if (key === 'userId') return 'user-123';
  return null;
});

// Import after DOM is set up
const { loadCompliance } = await import('../../js/admin/compliance.js');

describe('admin/compliance.js', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="adminName"></div>
      <div id="complianceBody"></div>
      <div id="toast"></div>
      <button id="logoutBtn"></button>
    `;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Re-setup sessionStorage mock return values
    sessionStorageMock.getItem.mockImplementation((key) => {
      if (key === 'username') return 'Admin User';
      if (key === 'role') return 'admin';
      if (key === 'userId') return 'user-123';
      return null;
    });

    mockEqSecond.mockReset();
    mockEqFirst.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReset();
  });

  test('shows no vendors message when vendors table is empty', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadCompliance();

    const tbody = document.getElementById('complianceBody');
    expect(tbody.innerHTML).toContain('No vendors found');
  });

  test('displays vendor with no menu items correctly', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Test Vendor' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Test Vendor');
    expect(html).toContain('No Items');
  });

  test('calculates 100% compliance when all items have both arrays', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Full Compliance Vendor' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] },
        { allergens: ['gluten'], dietary_labels: ['vegetarian'] },
        { allergens: ['eggs', 'dairy'], dietary_labels: ['vegan'] }
      ],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Full Compliance Vendor');
    expect(html).toContain('100%');
    expect(html).toContain('✅ Fully Compliant');
  });

  test('calculates 0% compliance when no items have both arrays', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Non Compliant Vendor' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: [] },
        { allergens: [], dietary_labels: ['halal'] },
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Non Compliant Vendor');
    expect(html).toContain('0%');
    expect(html).toContain('❌ Non-Compliant');
  });

  test('counts items with allergen info correctly', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Allergen Test Vendor' }],
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

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Allergen Test Vendor');
    expect(html).toContain('2 / 4');
    expect(html).toContain('1 / 4');
  });

  test('handles multiple vendors correctly', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [
        { id: 'v1', username: 'Vendor A' },
        { id: 'v2', username: 'Vendor B' }
      ],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] }
      ],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: [], dietary_labels: [] }
      ],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Vendor A');
    expect(html).toContain('Vendor B');
    expect(html).toContain('100%');
    expect(html).toContain('0%');
  });

  test('handles null or undefined arrays gracefully', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Null Vendor' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { },
        { allergens: null, dietary_labels: null },
        { allergens: undefined, dietary_labels: undefined }
      ],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Null Vendor');
    expect(html).toContain('0 / 3');
    expect(html).toContain('0 / 3');
  });

  test('shows progress bar with correct width and color for 100%', async () => {
    mockEqFirst.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Green Vendor' }],
      error: null
    });

    mockEqSecond.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] }
      ],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('width: 100%');
    expect(html).toContain('#10b981');
  });
});
