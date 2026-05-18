/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const requireRole = jest.fn();
const logout = jest.fn();

const db = {
  studentsById: new Map(),
  studentsByUsername: new Map(),
  ordersByLookup: new Map(),
  eqCalls: []
};

const sb = {
  auth: {
    getUser: jest.fn()
  },

  from: jest.fn(table => ({
    select: jest.fn(() => ({
      eq: jest.fn((column, value) => {
        db.eqCalls.push({ table, column, value });

        if (table === 'students') {
          return {
            maybeSingle: jest.fn(async () => {
              if (column === 'id') {
                return {
                  data: db.studentsById.get(value) || null,
                  error: null
                };
              }

              if (column === 'username') {
                return {
                  data: db.studentsByUsername.get(value) || null,
                  error: null
                };
              }

              return {
                data: null,
                error: null
              };
            })
          };
        }

        if (table === 'orders') {
          return {
            order: jest.fn(async () => {
              const key = `${column}:${value}`;

              return {
                data: db.ordersByLookup.get(key) || [],
                error: null
              };
            })
          };
        }

        return {};
      })
    }))
  }))
};

jest.unstable_mockModule('../config/supabase.js', () => ({ sb }));
jest.unstable_mockModule('../shared/guards.js', () => ({ requireRole }));
jest.unstable_mockModule('../shared/session.js', () => ({ logout }));

const { initStudentProfilePage } = await import('./student-profile-page.js');

function text(id) {
  return document.getElementById(id)?.textContent || '';
}

function setupDOM() {
  document.body.innerHTML = `
    <div id="profileGreeting"></div>
    <div id="profileName"></div>
    <div id="profileEmail"></div>
    <div id="profileUsername"></div>
    <div id="profileEmailDetail"></div>
    <div id="profileStudentId"></div>
    <div id="profileJoined"></div>
    <div id="profileAvatar"></div>

    <div id="profileOrders"></div>
    <div id="profileActiveOrders"></div>
    <div id="profileSpent"></div>
    <div id="profileLatestOrder"></div>
  `;
}

beforeEach(() => {
  setupDOM();

  jest.clearAllMocks();

  requireRole.mockReturnValue(true);

  db.studentsById.clear();
  db.studentsByUsername.clear();
  db.ordersByLookup.clear();
  db.eqCalls = [];

  sessionStorage.clear();

  delete window.logout;
});

describe('student-profile-page.js', () => {
  test('stops immediately when role check fails', async () => {
    requireRole.mockReturnValue(false);

    await initStudentProfilePage();

    expect(requireRole).toHaveBeenCalledWith('student');
    expect(sb.auth.getUser).not.toHaveBeenCalled();
    expect(window.logout).toBeUndefined();
  });

  test('renders login fallback when there is no active session', async () => {
    sb.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    await initStudentProfilePage();

    expect(text('profileGreeting')).toBe('Please login again');
    expect(text('profileName')).toBe('No active session');
    expect(text('profileEmail')).toBe(
      'We could not find your signed-in account.'
    );

    expect(text('profileOrders')).toBe('0');
    expect(text('profileActiveOrders')).toBe('0');
    expect(text('profileSpent')).toBe('R0');
    expect(text('profileLatestOrder')).toBe(
      'No orders yet. Your first campus feast will appear here.'
    );

    expect(window.logout).toBe(logout);
  });

  test('renders student profile details and order stats', async () => {
    const user = {
      id: 'auth-user-1',
      email: 'auth@example.com',
      created_at: '2026-01-10T00:00:00.000Z',
      user_metadata: {
        username: 'fallback-user'
      }
    };

    sb.auth.getUser.mockResolvedValue({
      data: { user },
      error: null
    });

    db.studentsById.set('auth-user-1', {
      id: 'student-1',
      username: 'Bambino',
      email: 'bambino@example.com',
      created_at: '2026-01-12T00:00:00.000Z'
    });

    db.ordersByLookup.set('student_id:student-1', [
      {
        id: 'order-1',
        order_number: 'A100',
        status: 'Ready for Collection',
        total_price: 58.5,
        created_at: '2026-02-01T00:00:00.000Z',
        items: [{ name: 'Burger' }, { name: 'Fries' }]
      },
      {
        id: 'order-2',
        order_number: 'A101',
        status: 'Delivered',
        total_price: 30,
        created_at: '2026-01-20T00:00:00.000Z',
        items: [{ name: 'Juice' }]
      }
    ]);

    await initStudentProfilePage();

    expect(text('profileGreeting')).toBe('Welcome, Bambino');
    expect(text('profileName')).toBe('Bambino');
    expect(text('profileEmail')).toBe('bambino@example.com');
    expect(text('profileUsername')).toBe('Bambino');
    expect(text('profileEmailDetail')).toBe('bambino@example.com');
    expect(text('profileStudentId')).toBe('student-1');
    expect(text('profileAvatar')).toBe('B');

    expect(text('profileOrders')).toBe('2');
    expect(text('profileActiveOrders')).toBe('1');
    expect(text('profileSpent')).toBe('R88.50');

    expect(text('profileLatestOrder')).toContain('#A100');
    expect(text('profileLatestOrder')).toContain('Burger, Fries');
    expect(text('profileLatestOrder')).toContain('Ready for Collection');
    expect(text('profileLatestOrder')).toContain('R58.50');

    expect(sessionStorage.getItem('studentId')).toBe('student-1');
    expect(window.logout).toBe(logout);
  });

  test('falls back to student profile lookup by username', async () => {
    sessionStorage.setItem('username', 'studentuser');

    const user = {
      id: 'auth-user-2',
      email: 'student@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      user_metadata: {}
    };

    sb.auth.getUser.mockResolvedValue({
      data: { user },
      error: null
    });

    db.studentsByUsername.set('studentuser', {
      id: 'student-2',
      username: 'studentuser',
      email: 'student-profile@example.com',
      created_at: '2026-01-05T00:00:00.000Z'
    });

    await initStudentProfilePage();

    expect(db.eqCalls).toEqual(
      expect.arrayContaining([
        { table: 'students', column: 'id', value: 'auth-user-2' },
        { table: 'students', column: 'username', value: 'studentuser' }
      ])
    );

    expect(text('profileName')).toBe('studentuser');
    expect(text('profileEmail')).toBe('student-profile@example.com');
    expect(text('profileStudentId')).toBe('student-2');
    expect(sessionStorage.getItem('studentId')).toBe('student-2');
  });

  test('falls back through order lookup columns until orders are found', async () => {
    sessionStorage.setItem('username', 'campususer');

    const user = {
      id: 'auth-user-3',
      email: 'campus@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      user_metadata: {}
    };

    sb.auth.getUser.mockResolvedValue({
      data: { user },
      error: null
    });

    db.studentsById.set('auth-user-3', {
      id: 'student-3',
      username: 'campususer',
      email: 'campus@example.com',
      created_at: '2026-01-01T00:00:00.000Z'
    });

    db.ordersByLookup.set('student_id:student-3', []);
    db.ordersByLookup.set('student_id:auth-user-3', []);
    db.ordersByLookup.set('student_username:campususer', [
      {
        id: 'username-order',
        status: 'pending',
        total: 45,
        created_at: '2026-02-10T00:00:00.000Z',
        items: ['Pizza']
      }
    ]);

    await initStudentProfilePage();

    expect(db.eqCalls).toEqual(
      expect.arrayContaining([
        { table: 'orders', column: 'student_id', value: 'student-3' },
        { table: 'orders', column: 'student_id', value: 'auth-user-3' },
        { table: 'orders', column: 'student_username', value: 'campususer' }
      ])
    );

    expect(text('profileOrders')).toBe('1');
    expect(text('profileActiveOrders')).toBe('1');
    expect(text('profileSpent')).toBe('R45');
    expect(text('profileLatestOrder')).toContain('Pizza');
  });

  test('uses user data when no student profile is found', async () => {
    const user = {
      id: 'auth-user-4',
      email: 'fallback@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      user_metadata: {
        full_name: 'Fallback Student'
      }
    };

    sb.auth.getUser.mockResolvedValue({
      data: { user },
      error: null
    });

    await initStudentProfilePage();

    expect(text('profileGreeting')).toBe('Welcome, Fallback Student');
    expect(text('profileName')).toBe('Fallback Student');
    expect(text('profileEmail')).toBe('fallback@example.com');
    expect(text('profileStudentId')).toBe('auth-user-4');

    expect(text('profileOrders')).toBe('0');
    expect(text('profileActiveOrders')).toBe('0');
    expect(text('profileSpent')).toBe('R0');
  });

  test('renders empty order state when student has no orders', async () => {
    const user = {
      id: 'auth-user-5',
      email: 'empty@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      user_metadata: {
        username: 'emptyuser'
      }
    };

    sb.auth.getUser.mockResolvedValue({
      data: { user },
      error: null
    });

    db.studentsById.set('auth-user-5', {
      id: 'student-5',
      username: 'emptyuser',
      email: 'empty@example.com',
      created_at: '2026-01-01T00:00:00.000Z'
    });

    db.ordersByLookup.set('student_id:student-5', []);

    await initStudentProfilePage();

    expect(text('profileOrders')).toBe('0');
    expect(text('profileActiveOrders')).toBe('0');
    expect(text('profileSpent')).toBe('R0');
    expect(text('profileLatestOrder')).toBe(
      'No orders yet. Your first campus feast will appear here.'
    );
  });
});
