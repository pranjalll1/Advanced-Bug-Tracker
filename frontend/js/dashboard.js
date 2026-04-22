// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

if (!token) window.location.href = 'login.html';

// ─── Setup UI based on role ───────────────────────────────────
document.getElementById('user-name').textContent
  = user?.name ?? 'User';

// Role badge
const roleBadge = document.getElementById('user-role-badge');
roleBadge.textContent = capitalize(user?.role ?? '');
roleBadge.className   = `badge role-${user?.role}`;

// Welcome text
document.getElementById('welcome-text').textContent
  = `Welcome back, ${user?.name?.split(' ')[0]}! 👋`;
document.getElementById('welcome-sub').textContent
  = `You are logged in as ${capitalize(user?.role)}`;

// Show admin link in navbar if admin
if (user?.role === 'admin') {
  document.getElementById('admin-link').innerHTML
    = `<a href="admin.html">👑 Admin</a>`;
  document.getElementById('pending-users-card').style.display
    = 'flex';
  document.getElementById('admin-quick-card').style.display
    = 'flex';
}

// ─── Load Dashboard Data ──────────────────────────────────────
const loadDashboard = async () => {
  try {
    // Pick endpoint based on role
    let endpoint = '';
    if (user?.role === 'admin')     endpoint = '/api/dashboard/admin';
    if (user?.role === 'developer') endpoint = '/api/dashboard/developer';
    if (user?.role === 'manager')   endpoint = '/api/dashboard/manager';
    if (user?.role === 'tester')    endpoint = '/api/dashboard/admin';

    const response = await fetch(
      `http://localhost:8000${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();
    console.log('📊 Dashboard data:', data);

    if (!data.success) {
      console.error('Dashboard error:', data.message);
      return;
    }

    const bugs  = data.dashboard.bugs;
    const tasks = data.dashboard.tasks;

    // ── Bug Stats ────────────────────────────────────────
    setText('total-bugs',      bugs?.total              ?? 0);
    setText('open-bugs',       bugs?.byStatus?.open     ?? 0);
    setText('inprogress-bugs', bugs?.byStatus?.inProgress ?? 0);
    setText('resolved-bugs',   bugs?.byStatus?.resolved ?? 0);

    // ── Task Stats ───────────────────────────────────────
    setText('total-tasks', tasks?.total           ?? 0);
    setText('todo-tasks',  tasks?.byStatus?.todo  ?? 0);
    setText('done-tasks',  tasks?.byStatus?.done  ?? 0);

    // ── Admin: Pending Users ─────────────────────────────
    if (user?.role === 'admin') {
      setText('pending-users',
        data.dashboard.users?.pending ?? 0);
    }

  } catch (error) {
    console.error('Dashboard load error:', error);
  }
};

// ─── Helpers ──────────────────────────────────────────────────
const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
};

// ─── Init ─────────────────────────────────────────────────────
loadDashboard();