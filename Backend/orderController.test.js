import { jest, test, expect, describe, beforeEach } from '@jest/globals';

const mockSupabase = {
  from: jest.fn()
};

jest.unstable_mockModule('./supabaseClient.js', () => ({
  supabase: mockSupabase
}));

const { createOrder, getVendorOrders, updateOrderStatus } = await import('./orderController.js');

function mockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

beforeEach(() => {
  mockSupabase.from.mockReset();
});

describe('createOrder', () => {
  test('returns 400 when required fields are missing', async () => {
    const req = {
      body: {
        student_id: '',
        vendor_id: '',
        items: []
      }
    };

    const res = mockResponse();

    await createOrder(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Missing required fields'
    });
  });

  test('creates order successfully', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { id: 'mock-order-id' },
                error: null
              }))
            }))
          }))
        };
      }

      if (table === 'order_items') {
        return {
          insert: jest.fn(() => ({
            error: null
          }))
        };
      }

      return {};
    });

    const req = {
      body: {
        student_id: 'uuid-123',
        vendor_id: 'uuid-456',
        total_price: 50,
        items: [
          {
            menu_item_id: 1,
            quantity: 2,
            price: 25
          }
        ]
      }
    };

    const res = mockResponse();

    await createOrder(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      message: 'Order created successfully',
      order_id: 'mock-order-id'
    });
  });

  test('returns 400 when order_items insert fails', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { id: 'mock-order-id' },
                error: null
              }))
            }))
          }))
        };
      }

      if (table === 'order_items') {
        return {
          insert: jest.fn(() => ({
            error: { message: 'Failed to insert order items' }
          }))
        };
      }

      return {};
    });

    const req = {
      body: {
        student_id: 'uuid-123',
        vendor_id: 'uuid-456',
        total_price: 50,
        items: [
          {
            menu_item_id: 1,
            quantity: 2,
            price: 25
          }
        ]
      }
    };

    const res = mockResponse();

    await createOrder(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Failed to insert order items'
    });
  });
});

describe('getVendorOrders', () => {
  test('returns vendor orders successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [
              {
                id: 1,
                student_id: 'uuid-student',
                vendor_id: 'uuid-vendor',
                status: 'Order Received',
                total_price: 50,
                order_items: []
              }
            ],
            error: null
          }))
        }))
      }))
    }));

    const req = {
      params: { vendorId: 'uuid-vendor' }
    };

    const res = mockResponse();

    await getVendorOrders(req, res);

    expect(res.body).toEqual([
      {
        id: 1,
        student_id: 'uuid-student',
        vendor_id: 'uuid-vendor',
        status: 'Order Received',
        total_price: 50,
        order_items: []
      }
    ]);
  });

  test('handles Supabase error', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: { message: 'DB error' }
          }))
        }))
      }))
    }));

    const req = {
      params: { vendorId: 'uuid-vendor' }
    };

    const res = mockResponse();

    await getVendorOrders(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'DB error'
    });
  });
});

describe('updateOrderStatus', () => {
  test('rejects invalid status', async () => {
    const req = {
      params: { orderId: '1' },
      body: { status: 'Flying' }
    };

    const res = mockResponse();

    await updateOrderStatus(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Invalid status value'
    });
  });

  test('updates status successfully', async () => {
    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'order-123',
                status: 'Preparing'
              },
              error: null
            }))
          }))
        }))
      }))
    }));

    const req = {
      params: { orderId: 'order-123' },
      body: { status: 'Preparing' }
    };

    const res = mockResponse();

    await updateOrderStatus(req, res);

    expect(res.body).toEqual({
      message: 'Order status updated successfully',
      order: {
        id: 'order-123',
        status: 'Preparing'
      }
    });
  });
});