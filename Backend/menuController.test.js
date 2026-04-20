import { jest, test, expect, describe, beforeEach } from '@jest/globals';

const mockSupabase = {
  from: jest.fn()
};

jest.unstable_mockModule('./supabaseClient.js', () => ({
  supabase: mockSupabase
}));

const {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  getVendorMenu,
  setVendorStatus
} = await import('./menuController.js');

beforeEach(() => {
  mockSupabase.from.mockReset();
});

describe('createMenuItem', () => {
  test('creates a menu item successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 1,
              vendor_id: 'vendor-123',
              name: 'Burger',
              description: 'Tasty burger',
              price: 45,
              image_url: null,
              is_available: true
            },
            error: null
          }))
        }))
      }))
    }));

    const item = {
      name: 'Burger',
      description: 'Tasty burger',
      price: 45
    };

    const user = {
      id: 'vendor-123'
    };

    const result = await createMenuItem(item, user);

    expect(result).toEqual({
      data: {
        id: 1,
        vendor_id: 'vendor-123',
        name: 'Burger',
        description: 'Tasty burger',
        price: 45,
        image_url: null,
        is_available: true
      },
      error: null
    });
  });
});

describe('updateMenuItem', () => {
  test('updates a menu item successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 1,
                name: 'Updated Burger',
                price: 50
              },
              error: null
            }))
          }))
        }))
      }))
    }));

    const result = await updateMenuItem(1, {
      name: 'Updated Burger',
      price: 50
    });

    expect(result).toEqual({
      data: {
        id: 1,
        name: 'Updated Burger',
        price: 50
      },
      error: null
    });
  });
});

describe('deleteMenuItem', () => {
  test('deletes a menu item successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }));

    const result = await deleteMenuItem(1);

    expect(result).toEqual({
      data: null,
      error: null
    });
  });
});

describe('toggleAvailability', () => {
  test('updates menu item availability successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 1,
                is_available: false
              },
              error: null
            }))
          }))
        }))
      }))
    }));

    const result = await toggleAvailability(1, false);

    expect(result).toEqual({
      data: {
        id: 1,
        is_available: false
      },
      error: null
    });
  });
});

describe('getVendorMenu', () => {
  test('returns vendor menu successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [
            {
              id: 1,
              vendor_id: 'vendor-123',
              name: 'Burger',
              price: 45
            }
          ],
          error: null
        }))
      }))
    }));

    const result = await getVendorMenu({ id: 'vendor-123' });

    expect(result).toEqual({
      data: [
        {
          id: 1,
          vendor_id: 'vendor-123',
          name: 'Burger',
          price: 45
        }
      ],
      error: null
    });
  });
});

describe('setVendorStatus', () => {
  test('updates vendor status successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'vendor-123',
                account_status: 'approved'
              },
              error: null
            }))
          }))
        }))
      }))
    }));

    const result = await setVendorStatus('vendor-123', 'approved');

    expect(result).toEqual({
      data: {
        id: 'vendor-123',
        account_status: 'approved'
      },
      error: null
    });
  });
});