import { loadCompliance } from './compliance.js';
import { sb } from '../config/supabase.js';

// Mock Supabase
jest.mock('../config/supabase.js', () => ({
  sb: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn()
  }
}));

describe('loadCompliance', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="complianceBody"></div>
      <div id="adminName"></div>
      <div id="toast"></div>
      <button id="logoutBtn"></button>
    `;

    sessionStorage.setItem('username', 'AdminUser');
    sessionStorage.setItem('role', 'admin');
    sessionStorage.setItem('userId', 'user-123');

    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  test('shows no vendors message when vendors table is empty', async () => {
    sb.eq.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadCompliance();

    const tbody = document.getElementById('complianceBody');
    expect(tbody.innerHTML).toContain('No vendors found');
  });

  test('displays vendor with no menu items correctly', async () => {
    sb.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Test Vendor' }],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
      data: [],
      error: null
    });

    await loadCompliance();

    const html = document.getElementById('complianceBody').innerHTML;
    expect(html).toContain('Test Vendor');
    expect(html).toContain('No Items');
  });

  test('calculates 100% compliance when all items have both arrays', async () => {
    sb.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Full Compliance Vendor' }],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
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
    sb.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Non Compliant Vendor' }],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
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
    sb.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Allergen Test Vendor' }],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
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
    sb.eq.mockResolvedValueOnce({
      data: [
        { id: 'v1', username: 'Vendor A' },
        { id: 'v2', username: 'Vendor B' }
      ],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
      data: [
        { allergens: ['peanuts'], dietary_labels: ['halal'] }
      ],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
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
    sb.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Null Vendor' }],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
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
    sb.eq.mockResolvedValueOnce({
      data: [{ id: 'v1', username: 'Green Vendor' }],
      error: null
    });

    sb.eq.mockResolvedValueOnce({
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
