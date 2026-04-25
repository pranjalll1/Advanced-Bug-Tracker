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

// Show username in navbar
document.getElementById('user-name').textContent = user?.name ?? '';
const reportBugBtn = document.getElementById('report-bug-btn');
if (reportBugBtn) {
  if (user?.role === 'developer') {
    reportBugBtn.style.display = 'none';  // hide for developer
  }
}


// Role badge
const roleBadge = document.getElementById('user-role-badge');
if (roleBadge) {
  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  roleBadge.textContent = capitalize(user?.role ?? '');
  roleBadge.className = `user-role role-${user?.role}`;
}

// ─── State ────────────────────────────────────────────────────
let currentPage = 1;
let totalPages = 1;

// ─── Fetch & Render Bugs ──────────────────────────────────────
const loadBugs = async (page = 1) => {
  try {
    const status = document.getElementById('filter-status').value;
    const severity = document.getElementById('filter-severity').value;
    const priority = document.getElementById('filter-priority').value;
    const search = document.getElementById('filter-search').value;

    let url = `/api/bugs?page=${page}&limit=10`;
    if (status) url += `&status=${status}`;
    if (severity) url += `&severity=${severity}`;
    if (priority) url += `&priority=${priority}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    // Debug — shows in browser console
    console.log('📡 Fetching:', url);
    console.log('👤 Logged in as:', user?.name, '| Role:', user?.role);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📶 Response status:', response.status);

    // If token expired or invalid
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();
    console.log('📦 API Response:', data);

    if (!data.success) {
      showTableMessage(`❌ Error: ${data.message}`);
      return;
    }

    currentPage = data.page || 1;
    totalPages = data.totalPages || 1;

    updatePagination();
    renderBugs(data.bugs);

  } catch (error) {
    console.error('❌ Load bugs error:', error);
    showTableMessage('Server error. Make sure your backend is running.');
  }
};

// ─── Render Bugs into Table ───────────────────────────────────
const renderBugs = (bugs) => {
  const tbody = document.getElementById('bug-table-body');

  if (!bugs || bugs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading-text">
          No bugs found. Click "+ Report Bug" to add one!
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = bugs.map(bug => `
    <tr>
      <td>
        <strong>${bug.title}</strong>
        ${bug.project
      ? `<br><small>📁 ${bug.project}</small>`
      : ''}
      </td>
      <td>
        <span class="badge severity-${bug.severity}">
          ${capitalize(bug.severity)}
        </span>
      </td>
      <td>
        <span class="badge priority-${bug.priority}">
          ${capitalize(bug.priority)}
        </span>
      </td>
      <td>
        <span class="badge status-${bug.status}">
          ${capitalize(bug.status)}
        </span>
      </td>
      <td>
        ${bug.assignedTo?.name
    ?? '<span class="unassigned">Unassigned</span>'}
      </td>
      <td>${bug.reportedBy?.name ?? 'Unknown'}</td>
      <td>${formatDate(bug.createdAt)}</td>
      <td>
        <div class="action-btns">
        <button
          onclick="viewBug('${bug._id}')"
          class="btn-small btn-view">
          View
        </button>
        ${canDelete()
      ? `<button
               onclick="deleteBug('${bug._id}')"
               class="btn-small btn-delete">
               Delete
             </button>`
      : ''}
        </div>
      </td>
    </tr>
  `).join('');
};

// ─── Create Bug ───────────────────────────────────────────────
const createBug = async () => {
  const title = document.getElementById('bug-title').value.trim();
  const description = document.getElementById('bug-description').value.trim();
  const severity = document.getElementById('bug-severity').value;
  const priority = document.getElementById('bug-priority').value;
  const project = document.getElementById('bug-project').value.trim();
  const steps = document.getElementById('bug-steps').value.trim();

  if (!title || !description) {
    showCreateError('Title and description are required.');
    return;
  }

  if (title.length < 5) {
    showCreateError('Title must be at least 5 characters.');
    return;
  }

  if (description.length < 10) {
    showCreateError('Description must be at least 10 characters.');
    return;
  }

  try {
    const response = await fetch('/api/bugs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        severity,
        priority,
        project,
        stepsToReproduce: steps,
      }),
    });

    const data = await response.json();
    console.log('Create bug response:', data);

    if (!data.success) {
      showCreateError(data.message);
      return;
    }

    closeCreateModal();
    loadBugs(currentPage);

  } catch (error) {
    console.error('Create bug error:', error);
    showCreateError('Server error. Please try again.');
  }
};

// ─── Delete Bug ───────────────────────────────────────────────
const deleteBug = (bugId) => {
  showConfirm({
    title: 'Delete Bug',
    message: 'Are you sure you want to delete this bug? This action cannot be undone.',
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: async () => {
      try {
        const response = await fetch(
          `/api/bugs/${bugId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          showToast('Bug deleted successfully', 'success');
          loadBugs(currentPage);
        } else {
          showAlert(data.message, 'danger');
        }

      } catch (error) {
        showAlert('Failed to delete bug.', 'danger');
      }
    }
  });
};

// ─── View Bug ─────────────────────────────────────────────────
const viewBug = (bugId) => {
  localStorage.setItem('selectedBugId', bugId);
  window.location.href = 'bug-detail.html';

};

// ─── Filters ──────────────────────────────────────────────────
const applyFilters = () => {
  currentPage = 1;
  loadBugs(1);
};

// ─── Pagination ───────────────────────────────────────────────
const changePage = (direction) => {
  const newPage = currentPage + direction;
  if (newPage < 1 || newPage > totalPages) return;
  loadBugs(newPage);
};

const updatePagination = () => {
  document.getElementById('page-info').textContent
    = `Page ${currentPage} of ${totalPages || 1}`;
  document.getElementById('prev-btn').disabled
    = currentPage <= 1;
  document.getElementById('next-btn').disabled
    = currentPage >= totalPages;
};

// ─── Modal Controls ───────────────────────────────────────────
const openCreateModal = () => {
  document.getElementById('create-modal')
    .classList.remove('hidden');
  document.getElementById('modal-overlay')
    .classList.remove('hidden');
  document.getElementById('create-error')
    .classList.add('hidden');
};

const closeCreateModal = () => {
  document.getElementById('create-modal')
    .classList.add('hidden');
  document.getElementById('modal-overlay')
    .classList.add('hidden');
  document.getElementById('bug-title').value = '';
  document.getElementById('bug-description').value = '';
  document.getElementById('bug-project').value = '';
  document.getElementById('bug-steps').value = '';
};

// ─── Helpers ──────────────────────────────────────────────────
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const canDelete = () => user?.role === 'admin';

const showTableMessage = (msg) => {
  document.getElementById('bug-table-body').innerHTML
    = `<tr><td colspan="8" class="loading-text">${msg}</td></tr>`;
};

const showCreateError = (msg) => {
  const el = document.getElementById('create-error');
  el.textContent = msg;
  el.classList.remove('hidden');
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

// ─── Init ─────────────────────────────────────────────────────
loadBugs();