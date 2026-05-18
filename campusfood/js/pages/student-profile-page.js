import { sb } from '../config/supabase.js';
import { requireRole } from '../shared/guards.js';
import { logout } from '../shared/session.js';

const ACTIVE_ORDER_STATUSES = new Set([
  'Order Placed',
  'Being Prepared',
  'Ready for Collection',
  'placed',
  'pending',
  'confirmed',
  'preparing',
  'ready'
]);

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '—';
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatMoney(value) {
  const amount = Number(value || 0);

  return `R${amount.toFixed(2).replace(/\.00$/, '')}`;
}

function getInitials(name) {
  if (!name) return '👤';

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return initials || '👤';
}

function getSessionUsername(user) {
  return (
    sessionStorage.getItem('username') ||
    user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Student'
  );
}

function getOrderAmount(order) {
  return Number(order?.total_price ?? order?.total ?? order?.amount ?? 0);
}

function getOrderCreatedAt(order) {
  return order?.created_at || order?.createdAt || order?.inserted_at || null;
}

function renderProfileShell({ username, email, studentId, joinedAt }) {
  const displayName = username || 'Student';

  setText('profileGreeting', `Welcome, ${displayName}`);
  setText('profileName', displayName);
  setText('profileEmail', email || 'No email found yet.');
  setText('profileUsername', displayName);
  setText('profileEmailDetail', email || '—');
  setText('profileStudentId', studentId || '—');
  setText('profileJoined', formatDate(joinedAt));

  const avatar = document.getElementById('profileAvatar');
  if (avatar) {
    avatar.textContent = getInitials(displayName);
  }
}

function renderOrderStats(orders = []) {
  const totalOrders = orders.length;

  const activeOrders = orders.filter(order => {
    const status = order.status || '';
    return ACTIVE_ORDER_STATUSES.has(status);
  }).length;

  const totalSpent = orders.reduce((sum, order) => {
    return sum + getOrderAmount(order);
  }, 0);

  setText('profileOrders', String(totalOrders));
  setText('profileActiveOrders', String(activeOrders));
  setText('profileSpent', formatMoney(totalSpent));

  renderLatestOrder(orders[0]);
}

function renderLatestOrder(order) {
  const container = document.getElementById('profileLatestOrder');

  if (!container) return;

  if (!order) {
    container.className = 'profile-latest-empty';
    container.textContent = 'No orders yet. Your first campus feast will appear here.';
    return;
  }

  const items = Array.isArray(order.items)
    ? order.items.map(item => item.name || item).join(', ')
    : 'Items not listed';

  container.className = 'profile-latest-card';
  container.innerHTML = `
    <div>
      <strong>#${order.order_number || order.id || 'Order'}</strong>
      <p>${items}</p>
    </div>
    <div class="profile-latest-meta">
      <span class="status status-${String(order.status || '').toLowerCase().replaceAll(' ', '-')}">
        ${order.status || 'Order Placed'}
      </span>
      <strong>${formatMoney(getOrderAmount(order))}</strong>
      <small>${formatDate(getOrderCreatedAt(order))}</small>
    </div>
  `;
}

async function findStudentProfile(user, username) {
  let student = null;

  if (user?.id) {
    const { data, error } = await sb
      .from('students')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Student profile lookup by id failed:', error.message);
    }

    if (!error && data) {
      student = data;
    }
  }

  if (!student && username) {
    const { data, error } = await sb
      .from('students')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.warn('Student profile lookup by username failed:', error.message);
    }

    if (!error && data) {
      student = data;
    }
  }

  return student;
}

async function queryOrdersByColumn(column, value) {
  if (!value) return null;

  const { data, error } = await sb
    .from('orders')
    .select('*')
    .eq(column, value)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(`Profile orders lookup by ${column} failed:`, error.message);
    return null;
  }

  return Array.isArray(data) ? data : [];
}

async function loadStudentOrders(studentId, username, userId) {
  const lookups = [
    ['student_id', studentId],
    ['student_id', userId],
    ['student_username', username]
  ];

  for (const [column, value] of lookups) {
    const orders = await queryOrdersByColumn(column, value);

    if (orders && orders.length > 0) {
      return orders;
    }
  }

  return [];
}

export async function initStudentProfilePage() {
  if (!requireRole('student')) return;

  window.logout = logout;

  const { data: userData, error: userError } = await sb.auth.getUser();

  if (userError || !userData?.user) {
    setText('profileGreeting', 'Please login again');
    setText('profileName', 'No active session');
    setText('profileEmail', 'We could not find your signed-in account.');
    renderOrderStats([]);
    return;
  }

  const user = userData.user;
  const username = getSessionUsername(user);
  const student = await findStudentProfile(user, username);

  const studentId = student?.id || sessionStorage.getItem('studentId') || user.id;
  const email = student?.email || user.email || sessionStorage.getItem('email');
  const joinedAt = student?.created_at || user.created_at;

  if (studentId) {
    sessionStorage.setItem('studentId', studentId);
  }

  renderProfileShell({
    username: student?.username || username,
    email,
    studentId,
    joinedAt
  });

  const orders = await loadStudentOrders(studentId, student?.username || username, user.id);
  renderOrderStats(orders);
}
