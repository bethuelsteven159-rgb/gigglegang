import { jest } from '@jest/globals';

const mockToast       = jest.fn();
const mockGetVendorId = jest.fn();
const mockSingle      = jest.fn();
const mockUpdateEq    = jest.fn();
const mockUpdate      = jest.fn(() => ({ eq: mockUpdateEq }));

const mockFrom = jest.fn((table) => {
  if (table === 'vendors') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: mockSingle }))
      })),
      update: mockUpdate
    };
  }
  return {};
});

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: { from: mockFrom }
}));
jest.unstable_mockModule('../shared/notifications.js', () => ({ toast: mockToast }));
jest.unstable_mockModule('../shared/auth-helpers.js', () => ({ getVendorId: mockGetVendorId }));

const { loadVendorProfile, saveVendorProfile, renderProfilePreview } =
  await import('./profile.js');

describe('vendor/profile.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    mockToast.mockReset();
    mockGetVendorId.mockReset();
    mockSingle.mockReset();
    mockUpdateEq.mockReset();
    mockUpdate.mockClear();
    mockFrom.mockClear();
    global.console.error = jest.fn();
  });

  // ── loadVendorProfile ───────────────────────────────────────────────────────

  describe('loadVendorProfile', () => {
    test('shows error toast when vendor not found', async () => {
      mockGetVendorId.mockResolvedValue(null);
      await loadVendorProfile();
      expect(mockToast).toHaveBeenCalledWith('Vendor not found', 'error');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    test('shows error toast on DB error', async () => {
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockSingle.mockResolvedValue({ data: null, error: { message: 'db error' } });
      await loadVendorProfile();
      expect(mockToast).toHaveBeenCalledWith('Failed to load profile', 'error');
      expect(console.error).toHaveBeenCalled();
    });

    test('populates form fields from DB data', async () => {
      document.body.innerHTML = `
        <span id="vendorName"></span>
        <input id="shopName">
        <textarea id="description"></textarea>
        <input id="openingHours">
        <input id="contact">
      `;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockSingle.mockResolvedValue({
        data: {
          username:      'shop1',
          shop_name:     'Bobs Burgers',
          description:   'Best burgers on campus',
          opening_hours: 'Mon-Fri 08:00-17:00',
          contact:       '011 123 4567'
        },
        error: null
      });

      await loadVendorProfile();

      expect(document.getElementById('vendorName').textContent).toBe('shop1');
      expect(document.getElementById('shopName').value).toBe('Bobs Burgers');
      expect(document.getElementById('description').value).toBe('Best burgers on campus');
      expect(document.getElementById('openingHours').value).toBe('Mon-Fri 08:00-17:00');
      expect(document.getElementById('contact').value).toBe('011 123 4567');
    });

    test('handles null/missing optional fields gracefully', async () => {
      document.body.innerHTML = `
        <span id="vendorName"></span>
        <input id="shopName">
        <textarea id="description"></textarea>
        <input id="openingHours">
        <input id="contact">
      `;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockSingle.mockResolvedValue({
        data: { username: 'shop1', shop_name: 'ShopA', description: null,
                opening_hours: null, contact: null },
        error: null
      });

      await loadVendorProfile();

      expect(document.getElementById('description').value).toBe('');
      expect(document.getElementById('openingHours').value).toBe('');
      expect(document.getElementById('contact').value).toBe('');
    });
  });

  // ── saveVendorProfile ───────────────────────────────────────────────────────

  describe('saveVendorProfile', () => {
    test('shows error when shop name is empty', async () => {
      document.body.innerHTML = `
        <input id="shopName" value="">
        <textarea id="description"></textarea>
        <input id="openingHours">
        <input id="contact">
      `;
      await saveVendorProfile();
      expect(mockToast).toHaveBeenCalledWith('Shop name is required', 'error');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('shows error when vendor not found', async () => {
      document.body.innerHTML = `
        <input id="shopName" value="My Shop">
        <textarea id="description">Good food</textarea>
        <input id="openingHours" value="08:00-17:00">
        <input id="contact" value="012 345 6789">
      `;
      mockGetVendorId.mockResolvedValue(null);
      await saveVendorProfile();
      expect(mockToast).toHaveBeenCalledWith('Vendor not found', 'error');
    });

    test('saves all fields and shows success toast', async () => {
      document.body.innerHTML = `
        <input id="shopName" value="My Shop">
        <textarea id="description">Good food</textarea>
        <input id="openingHours" value="Mon-Fri 08:00-17:00">
        <input id="contact" value="012 345 6789">
        <div id="profilePreview"></div>
      `;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockUpdateEq.mockResolvedValue({ error: null });

      await saveVendorProfile();

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        shop_name:     'My Shop',
        description:   'Good food',
        opening_hours: 'Mon-Fri 08:00-17:00',
        contact:       '012 345 6789'
      }));
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'v1');
      expect(mockToast).toHaveBeenCalledWith('Profile saved successfully');
    });

    test('saves null for empty optional fields', async () => {
      document.body.innerHTML = `
        <input id="shopName" value="My Shop">
        <textarea id="description"></textarea>
        <input id="openingHours" value="">
        <input id="contact" value="">
        <div id="profilePreview"></div>
      `;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockUpdateEq.mockResolvedValue({ error: null });

      await saveVendorProfile();

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        description:   null,
        opening_hours: null,
        contact:       null
      }));
    });

    test('shows error toast when update fails', async () => {
      document.body.innerHTML = `
        <input id="shopName" value="My Shop">
        <textarea id="description"></textarea>
        <input id="openingHours" value="">
        <input id="contact" value="">
      `;
      sessionStorage.setItem('username', 'shop1');
      mockGetVendorId.mockResolvedValue('v1');
      mockUpdateEq.mockResolvedValue({ error: { message: 'update failed' } });

      await saveVendorProfile();

      expect(console.error).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Failed to save profile', 'error');
    });
  });

  // ── renderProfilePreview ────────────────────────────────────────────────────

  describe('renderProfilePreview', () => {
    test('shows placeholder when all fields empty', () => {
      document.body.innerHTML = `<div id="profilePreview"></div>`;
      renderProfilePreview({ shopName: '', description: '', openingHours: '', contact: '' });
      expect(document.getElementById('profilePreview').innerHTML)
        .toContain('Fill in your details');
    });

    test('renders shop name', () => {
      document.body.innerHTML = `<div id="profilePreview"></div>`;
      renderProfilePreview({ shopName: 'Bobs Burgers', description: '', openingHours: '', contact: '' });
      expect(document.getElementById('profilePreview').innerHTML)
        .toContain('Bobs Burgers');
    });

    test('renders description, opening hours and contact when provided', () => {
      document.body.innerHTML = `<div id="profilePreview"></div>`;
      renderProfilePreview({
        shopName:     'Bobs Burgers',
        description:  'Best burgers',
        openingHours: 'Mon-Fri 08:00-17:00',
        contact:      '011 123 4567'
      });
      const html = document.getElementById('profilePreview').innerHTML;
      expect(html).toContain('Best burgers');
      expect(html).toContain('Mon-Fri 08:00-17:00');
      expect(html).toContain('011 123 4567');
    });

    test('omits optional sections when not provided', () => {
      document.body.innerHTML = `<div id="profilePreview"></div>`;
      renderProfilePreview({ shopName: 'Bobs Burgers', description: '', openingHours: '', contact: '' });
      const html = document.getElementById('profilePreview').innerHTML;
      expect(html).not.toContain('🕐');
      expect(html).not.toContain('📞');
    });

    test('escapes HTML in all fields', () => {
      document.body.innerHTML = `<div id="profilePreview"></div>`;
      renderProfilePreview({
        shopName:     '<script>alert(1)</script>',
        description:  '<b>bold</b>',
        openingHours: '<i>always</i>',
        contact:      '<a href="#">link</a>'
      });
      const html = document.getElementById('profilePreview').innerHTML;
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    test('returns early when preview container is missing', () => {
      expect(() => renderProfilePreview({
        shopName: 'Test', description: '', openingHours: '', contact: ''
      })).not.toThrow();
    });
  });
});
