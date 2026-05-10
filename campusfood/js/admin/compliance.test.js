import { jest } from '@jest/globals';

// Create a proper chainable mock for Supabase
const createChainableMock = () => {
  const mock = {
    select: jest.fn(),
    eq: jest.fn(),
    then: jest.fn(),
    catch: jest.fn()
  };
  
  // Make methods return the mock object for chaining
  mock.select.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  
  return mock;
};

const mockFrom = jest.fn(() => createChainableMock());

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

// Mock sessionStorage
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

// Set up DOM elements
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

    // Reset mockFrom
    mockFrom.mockReset();
  });

  test('shows no vendors message when vendors table is empty', async () => {
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValue({
      data: [],
      error: null
    });

    await loadCompliance();

    const tbody = document.getElementById('complianceBody');
    expect(tbody.innerHTML).toContain('No vendors found');
  });

  test('displays vendor with no menu items correctly', async () => {
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Test Vendor' }],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Test Vendor');
    expect(html).toContain('No Items');
  });

  test('calculates 100% compliance when all items have both arrays', async () => {
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Full Compliance Vendor' }],
      error: null
    });

    // Mock menu query
    const menuChainableMock = createChainableMock();
    mockFrom.mockReturnValueOnce(menuChainableMock);
    menuChainableMock.eq.mockResolvedValueOnce({
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
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Non Compliant Vendor' }],
      error: null
    });

    const menuChainableMock = createChainableMock();
    mockFrom.mockReturnValueOnce(menuChainableMock);
    menuChainableMock.eq.mockResolvedValueOnce({
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
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Allergen Test Vendor' }],
      error: null
    });

    const menuChainableMock = createChainableMock();
    mockFrom.mockReturnValueOnce(menuChainableMock);
    menuChainableMock.eq.mockResolvedValueOnce({
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
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValueOnce({
      data: [
        { id: 'v1', username: 'Vendor A' },
        { id: 'v2', username: 'Vendor B' }
      ],
      error: null
    });

    const menuChainableMock1 = createChainableMock();
    mockFrom.mockReturnValueOnce(menuChainableMock1);
    menuChainableMock1.eq.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] }
      ],
      error: null
    });

    const menuChainableMock2 = createChainableMock();
    mockFrom.mockReturnValueOnce(menuChainableMock2);
    menuChainableMock2.eq.mockResolvedValueOnce({
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
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Null Vendor' }],
      error: null
    });

    const menuChainableMock = createChainableMock();
    mockFrom.mockReturnValueOnce(menuChainableMock);
    menuChainableMock.eq.mockResolvedValueOnce({
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
    const chainableMock = createChainableMock();
    mockFrom.mockReturnValue(chainableMock);
    
    chainableMock.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Green Vendor' }],
      error: null
    });

    const menuChainableMock = createChainableMock();
    mockFrom.mockReturnValueOnce(menuChainableMock);
    menuChainableMock.eq.mockResolvedValueOnce({
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
