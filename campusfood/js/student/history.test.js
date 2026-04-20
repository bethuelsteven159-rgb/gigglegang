import { jest } from '@jest/globals';

const mockOrderSelectEq = jest.fn();
const mockReviewSelectEq = jest.fn();
const mockAuthGetUser = jest.fn();

const mockFrom = jest.fn((table) => {
  if (table === 'orders') {
    return {
      select: jest.fn(() => ({
        eq: mockOrderSelectEq
      }))
    };
  }

  if (table === 'reviews') {
    return {
      select: jest.fn(() => ({
        eq: mockReviewSelectEq
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      insert: jest.fn(),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    };
  }

  return {};
});

const mockSubscribe = jest.fn();
const mockOn = jest.fn(() => ({
  subscribe: mockSubscribe
}));
const mockChannel = jest.fn(() => ({
  on: mockOn
}));
const mockRemoveChannel = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  sb: {
    auth: {
      getUser: mockAuthGetUser
    },
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel
  }
}));

const {
  loadStudentOrderHistory,
  openModal,
  closeModal
} = await import('./history.js');

describe('student/history.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockAuthGetUser.mockReset();
    mockOrderSelectEq.mockReset();
    mockReviewSelectEq.mockReset();
    mockChannel.mockClear();
    mockOn.mockClear();
    mockSubscribe.mockReset();
    mockRemoveChannel.mockReset();
    global.console.error = jest.fn();
  });

  test('loadStudentOrderHistory shows Student not found when user is missing', async () => {
    document.body.innerHTML = `<table><tbody id="historyBody"></tbody></table>`;

    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    await loadStudentOrderHistory();

    expect(document.getElementById('historyBody').innerHTML).toContain('Student not found');
  });

  test('loadStudentOrderHistory shows failed message when orders query fails', async () => {
    document.body.innerHTML = `<table><tbody id="historyBody"></tbody></table>`;

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 's1' } },
      error: null
    });

    mockOrderSelectEq.mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'orders failed' }
      })
    });

    await loadStudentOrderHistory();

    expect(console.error).toHaveBeenCalled();
    expect(document.getElementById('historyBody').innerHTML).toContain('Failed to load orders');
  });

  test('loadStudentOrderHistory shows empty row when there are no orders', async () => {
    document.body.innerHTML = `<table><tbody id="historyBody"></tbody></table>`;

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 's1' } },
      error: null
    });

    mockOrderSelectEq.mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    });

    mockReviewSelectEq.mockResolvedValue({
      data: [],
      error: null
    });

    await loadStudentOrderHistory();

    expect(document.getElementById('historyBody').innerHTML).toContain('No orders yet');
  });

  test('closeModal hides modal and clears review text', () => {
    document.body.innerHTML = `
      <div id="reviewModal" style="display:flex"></div>
      <textarea id="reviewText">Nice food</textarea>
      <button class="tag active">Fast</button>
      <button class="tag active">Hot</button>
    `;

    closeModal();

    expect(document.getElementById('reviewModal').style.display).toBe('none');
    expect(document.getElementById('reviewText').value).toBe('');
    document.querySelectorAll('.tag').forEach(tag => {
      expect(tag.classList.contains('active')).toBe(false);
    });
  });

  test('openModal does nothing when order is not found', () => {
    document.body.innerHTML = `
      <div id="reviewModal" style="display:none"></div>
      <textarea id="reviewText"></textarea>
      <div id="reviewOrderNumber"></div>
      <div id="reviewVendorName"></div>
      <div id="reviewItems"></div>
      <div id="reviewTotal"></div>
      <div id="reviewOrderInfo"></div>
    `;

    openModal('missing');

    expect(document.getElementById('reviewModal').style.display).toBe('none');
  });
});