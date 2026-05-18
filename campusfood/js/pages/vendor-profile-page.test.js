import { jest } from '@jest/globals';

const mockRequireRole       = jest.fn();
const mockLoadVendorProfile = jest.fn();
const mockSaveVendorProfile = jest.fn();
const mockLogout            = jest.fn();

jest.unstable_mockModule('../shared/guards.js',  () => ({ requireRole: mockRequireRole }));
jest.unstable_mockModule('../vendor/profile.js', () => ({
  loadVendorProfile: mockLoadVendorProfile,
  saveVendorProfile: mockSaveVendorProfile
}));
jest.unstable_mockModule('../shared/session.js', () => ({ logout: mockLogout }));

const { initVendorProfilePage } = await import('./vendor-profile-page.js');

describe('vendor-profile-page.js', () => {
  beforeEach(() => {
    mockRequireRole.mockReset();
    mockLoadVendorProfile.mockReset();
    mockSaveVendorProfile.mockReset();
    delete window.logout;
    delete window.saveVendorProfile;
  });

  test('stops when role check fails', async () => {
    mockRequireRole.mockReturnValue(false);
    await initVendorProfilePage();
    expect(mockRequireRole).toHaveBeenCalledWith('vendor');
    expect(mockLoadVendorProfile).not.toHaveBeenCalled();
  });

  test('loads profile and exposes window handlers when role check passes', async () => {
    mockRequireRole.mockReturnValue(true);
    mockLoadVendorProfile.mockResolvedValue(undefined);

    await initVendorProfilePage();

    expect(mockLoadVendorProfile).toHaveBeenCalled();
    expect(window.logout).toBe(mockLogout);
    expect(window.saveVendorProfile).toBe(mockSaveVendorProfile);
  });
});
