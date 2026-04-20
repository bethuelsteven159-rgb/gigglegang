import { jest } from '@jest/globals';

const mockOrder = jest.fn();
const mockSelect = jest.fn(() => ({
  order: mockOrder
}));
const mockFrom = jest.fn(() => ({
  select: mockSelect
}));

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    from: mockFrom
  }
}));

const { loadAllOrders } = await import('./orders.js');

describe('admin/orders.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockOrder.mockReset();
    mockSelect.mockClear();
    mockFrom.mockClear();
  });

  test('returns early if tbody is missing', async () => {
    await loadAllOrders();

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('shows error row when supabase returns error', async () => {
    document.body.innerHTML = `<table><tbody id="allOrdersBody"></tbody></table>`;

    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'failed' }
    });

    await loadAllOrders();

    expect(document.getElementById('allOrdersBody').innerHTML).toContain('Failed to load orders');
  });

  test('shows empty row when there are no orders', async () => {
    document.body.innerHTML = `<table><tbody id="allOrdersBody"></tbody></table>`;

    mockOrder.mockResolvedValue({
      data: [],
      error: null
    });

    await loadAllOrders();

    expect(document.getElementById('allOrdersBody').innerHTML).toContain('No orders yet');
  });

  test('renders orders into table body', async () => {
    document.body.innerHTML = `<table><tbody id="allOrdersBody"></tbody></table>`;

    mockOrder.mockResolvedValue({
      data: [
        {
          id: 1,
          order_number: '123',
          vendors: { username: 'burger-shop' },
          student_username: 'bethuel',
          items: [{ name: 'Burger' }, { name: 'Chips' }],
          total_price: 55,
          status: 'pending',
          created_at: '2026-04-20T10:00:00Z'
        }
      ],
      error: null
    });

    await loadAllOrders();

    const html = document.getElementById('allOrdersBody').innerHTML;
    expect(html).toContain('#123');
    expect(html).toContain('burger-shop');
    expect(html).toContain('bethuel');
    expect(html).toContain('Burger, Chips');
    expect(html).toContain('R55');
    expect(html).toContain('pending');
  });

  test('renders fallback vendor name and empty items when needed', async () => {
    document.body.innerHTML = `<table><tbody id="allOrdersBody"></tbody></table>`;

    mockOrder.mockResolvedValue({
      data: [
        {
          id: 77,
          vendors: null,
          student_username: 'student1',
          items: null,
          total_price: 20,
          status: 'done',
          created_at: '2026-04-20T10:00:00Z'
        }
      ],
      error: null
    });

    await loadAllOrders();

    const html = document.getElementById('allOrdersBody').innerHTML;
    expect(html).toContain('#77');
    expect(html).toContain('Unknown');
    expect(html).toContain('student1');
    expect(html).toContain('R20');
    expect(html).toContain('done');
  });
});