// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

if (!token) window.location.href = 'login.html';

// ─── Base API URL ─────────────────────────────────────────────
const API = 'https://advanced-bug-tracker.onrender.com';


const reportBugBtn  = document.getElementById('report-bug-btn');
const bannerActions = document.querySelector('.banner-actions');

if (user?.role === 'developer') {
  if (reportBugBtn)  reportBugBtn.style.display  = 'none';
  if (bannerActions) bannerActions.style.display = 'none';
}

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
  showConfirm({
    title:       'Log Out',
    message:     'Are you sure you want to log out?',
    confirmText: 'Log Out',
    type:        'danger',
    onConfirm:   () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
  });
};

// ─── Setup UI Based on Role ───────────────────────────────────
document.getElementById('user-name').textContent
  = user?.name ?? 'User';

// Role badge
const roleBadge = document.getElementById('user-role-badge');
if (roleBadge) {
  roleBadge.textContent = capitalize(user?.role ?? '');
  roleBadge.className   = `user-role role-${user?.role}`;
}

// Welcome text
const welcomeText = document.getElementById('welcome-text');
const welcomeSub  = document.getElementById('welcome-sub');
if (welcomeText) {
  welcomeText.textContent
    = `Welcome back, ${user?.name?.split(' ')[0]}!`;
}
if (welcomeSub) {
  welcomeSub.textContent
    = `You are logged in as ${capitalize(user?.role)}`;
}

// Show admin link if admin
if (user?.role === 'admin') {
  const adminLink = document.getElementById('admin-link');
  if (adminLink) adminLink.style.display = 'flex';

  const pendingCard = document.getElementById('pending-users-card');
  if (pendingCard) pendingCard.style.display = 'flex';
}

// ─── Load Dashboard Data ──────────────────────────────────────
const loadDashboard = async () => {
  try {
    // Show loading dots on all stat cards
    ['total-bugs', 'resolved-bugs', 'pending-bugs',
     'total-tasks', 'todo-tasks', 'done-tasks',
     'pending-users'].forEach(id => setText(id, '...'));

    // ── Pick correct endpoint per role ────────────────────
    let endpoint = '';
    if (user?.role === 'admin')     endpoint = '/api/dashboard/admin';
    if (user?.role === 'developer') endpoint = '/api/dashboard/developer';
    if (user?.role === 'manager')   endpoint = '/api/dashboard/manager';
    if (user?.role === 'tester')    endpoint = '/api/dashboard/tester';

    // Safety check
    if (!endpoint) {
      console.error('No endpoint for role:', user?.role);
      return;
    }

    console.log('📡 Fetching:', `${API}${endpoint}`);

    const response = await fetch(`${API}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    });

    // Token expired
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
      // Show 0 instead of ...
      ['total-bugs', 'resolved-bugs', 'pending-bugs',
       'total-tasks', 'todo-tasks', 'done-tasks'].forEach(
        id => setText(id, '0')
      );
      return;
    }

    const bugs  = data.dashboard.bugs;
    const tasks = data.dashboard.tasks;

    // ── Bug Stats ─────────────────────────────────────────
    const openCount      = bugs?.byStatus?.open       || 0;
    const inProgressCount= bugs?.byStatus?.inProgress || 0;
    const pendingBugs    = openCount + inProgressCount;

    setText('total-bugs',    bugs?.total              ?? 0);
    setText('resolved-bugs', bugs?.byStatus?.resolved ?? 0);
    setText('pending-bugs',  pendingBugs);

    // ── Task Stats ────────────────────────────────────────
    setText('total-tasks', tasks?.total          ?? 0);
    setText('todo-tasks',  tasks?.byStatus?.todo ?? 0);
    setText('done-tasks',  tasks?.byStatus?.done ?? 0);

    // ── Admin Only ────────────────────────────────────────
    if (user?.role === 'admin') {
      setText('pending-users',
        data.dashboard.users?.pending ?? 0);
    }

  } catch (error) {
    console.error('Dashboard load error:', error);
  }
};

// ─── Init ─────────────────────────────────────────────────────
loadDashboard();