// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));
// Hide "Report Bug" option for everyone except testers
if (user && user.role !== 'tester') {

  // Target the "+ Report Bug" button in bugs.html
  const bugsPageBtn = document.getElementById('report-bug-btn');
  if (bugsPageBtn) {
    bugsPageBtn.style.display = 'none';
  }

  // Target the "Report Bug" button in the dashboard.html banner
  const dashboardBtn = document.querySelector('.banner-actions');
  if (dashboardBtn) {
    dashboardBtn.style.display = 'none';
  }
}


if (!token) window.location.href = 'login.html';

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
    title: 'Log Out',
    message: 'Are you sure you want to log out?',
    confirmText: 'Log Out',
    type: 'danger',
    onConfirm: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
  });
};

// ─── Setup UI based on role ───────────────────────────────────
document.getElementById('user-name').textContent = user?.name ?? 'User';


// Role badge
const roleBadge = document.getElementById('user-role-badge');
if (roleBadge) {
  roleBadge.textContent = capitalize(user?.role ?? '');
  roleBadge.className = `user-role role-${user?.role}`;
}

// Welcome text
const welcomeText = document.getElementById('welcome-text');
const welcomeSub = document.getElementById('welcome-sub');
if (welcomeText) welcomeText.textContent = `Welcome back, ${user?.name?.split(' ')[0]}!`;
if (welcomeSub) welcomeSub.textContent = `You are logged in as ${capitalize(user?.role)}`;

// Show admin link in navbar if admin
if (user?.role === 'admin') {
  const adminLink = document.getElementById('admin-link');
  if (adminLink) adminLink.style.display = 'flex';

  const pendingUsersCard = document.getElementById('pending-users-card');
  if (pendingUsersCard) pendingUsersCard.style.display = 'flex';
}

// ─── Load Dashboard Data ──────────────────────────────────────
const loadDashboard = async () => {
  try {
    // Pick endpoint based on role
    let endpoint = '';
    if (user?.role === 'admin') endpoint = '/api/dashboard/admin';
    if (user?.role === 'developer') endpoint = '/api/dashboard/developer';
    if (user?.role === 'manager') endpoint = '/api/dashboard/manager';
    if (user?.role === 'tester') endpoint = '/api/dashboard/admin';

    const response = await fetch(
      `/api${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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

    const bugs = data.dashboard.bugs;
    const tasks = data.dashboard.tasks;

    // ── Bug Stats ────────────────────────────────────────

    // Calculate pending bugs (Open + In Progress)
    const openCount = bugs?.byStatus?.open || 0;
    const inProgressCount = bugs?.byStatus?.inProgress || 0;
    const pendingBugs = openCount + inProgressCount;

    // Map to HTML IDs
    setText('total-bugs', bugs?.total || 0);
    setText('resolved-bugs', bugs?.byStatus?.resolved || 0);
    setText('pending-bugs', pendingBugs);

    // ── Task Stats ───────────────────────────────────────


    // ── Task Stats ───────────────────────────────────────
    setText('total-tasks', tasks?.total ?? 0);
    setText('todo-tasks', tasks?.byStatus?.todo ?? 0);
    setText('done-tasks', tasks?.byStatus?.done ?? 0);

    // ── Admin: Pending Users ─────────────────────────────
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