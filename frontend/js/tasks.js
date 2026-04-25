// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

if (!token) window.location.href = 'login.html';

// Show username in navbar
document.getElementById('user-name').textContent
  = user?.name ?? '';

// ─── Hide Create Button for non-managers/admins ───────────────
if (user?.role !== 'admin' && user?.role !== 'manager') {
  const btn = document.getElementById('create-task-btn');
  if (btn) btn.style.display = 'none';
}

// ─── State ────────────────────────────────────────────────────
let currentPage    = 1;
let totalPages     = 1;
let selectedTaskId = null;

// ─── Load Tasks ───────────────────────────────────────────────
const loadTasks = async (page = 1) => {
  try {
    const status   = document.getElementById('filter-status').value;
    const priority = document.getElementById('filter-priority').value;
    const search   = document.getElementById('filter-search').value;

    let url = `https://advanced-bug-tracker.onrender.com/api/tasks?page=${page}&limit=10`;
    if (status)   url += `&status=${status}`;
    if (priority) url += `&priority=${priority}`;
    if (search)   url += `&search=${encodeURIComponent(search)}`;

    console.log('📡 Fetching tasks:', url);

    const response = await fetch(url, {
      method:  'GET',
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
    console.log('📦 Tasks response:', data);

    if (!data.success) {
      showTableMessage(` Error: ${data.message}`);
      return;
    }

    currentPage = data.page       || 1;
    totalPages  = data.totalPages || 1;

    updatePagination();
    renderTasks(data.tasks);

  } catch (error) {
    console.error('Load tasks error:', error);
    showTableMessage('Server error. Make sure backend is running.');
  }
};

// ─── Render Tasks ─────────────────────────────────────────────
const renderTasks = (tasks) => {
  const tbody = document.getElementById('task-table-body');

  if (!tasks || tasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading-text">
          No tasks found.
          ${canCreate() ? 'Click "+ Create Task" to add one!' : ''}
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = tasks.map(task => `
    <tr>
      <td>
        <strong>${task.title}</strong>
        ${task.project
          ? `<br><small>📁 ${task.project}</small>`
          : ''}
      </td>
      <td>
        <span class="badge priority-${task.priority}">
          ${capitalize(task.priority)}
        </span>
      </td>
      <td>
        <span class="badge task-status-${task.status}">
          ${capitalize(task.status)}
        </span>
      </td>
      <td>
        <div class="progress-bar-wrapper">
          <div class="progress-bar"
            style="width:${task.progress ?? 0}%">
          </div>
          <span class="progress-label">
            ${task.progress ?? 0}%
          </span>
        </div>
      </td>
      <td>
        ${task.assignedTo?.name
          ?? '<span class="unassigned">Unassigned</span>'}
      </td>
      <td>${task.createdBy?.name ?? 'Unknown'}</td>
      <td>${formatDate(task.dueDate)}</td>
      <td class="action-btns">
        <button
          onclick="openStatusModal('${task._id}', '${task.status}', ${task.progress ?? 0}, '${task.assignedTo?._id ?? ''}')"
          class="btn-small btn-view">
          Update
        </button>
        ${canDelete()
          ? `<button
               onclick="deleteTask('${task._id}')"
               class="btn-small btn-delete">
               Delete
             </button>`
          : ''}
      </td>
    </tr>
  `).join('');
};

// ─── Load Users for Assign Dropdown ──────────────────────────
const loadUsersForAssign = async () => {
  if (!canAssign()) {
    const section = document.getElementById('assign-task-section');
    if (section) section.style.display = 'none';
    return;
  }

  const select = document.getElementById('assign-task-user');
  if (!select) return;

  select.innerHTML = '<option value="">Loading...</option>';

  try {
    const response = await fetch(
      'https://advanced-bug-tracker.onrender.com/api/admin/users?status=active&role=developer', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    console.log('👥 Status:', response.status); // debug

    const data = await response.json();
    console.log('👥 Users:', data);             // debug

    if (!data.success) {
      select.innerHTML = '<option value="">No users found</option>';
      return;
    }

    if (data.users.length === 0) {
      select.innerHTML = '<option value="">No developers available</option>';
      return;
    }

    select.innerHTML = '<option value="">— Select User —</option>';
    data.users.forEach(u => {
      const option       = document.createElement('option');
      option.value       = u._id;
      option.textContent = `${u.name} (${capitalize(u.role)})`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Load users error:', error);
    select.innerHTML = '<option value="">Error loading</option>';
  }
};

// ─── Create Task ──────────────────────────────────────────────
const createTask = async () => {
  const title       = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const priority    = document.getElementById('task-priority').value;
  const dueDate     = document.getElementById('task-due-date').value;
  const project     = document.getElementById('task-project').value.trim();
  const hours       = document.getElementById('task-hours').value;

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
    const response = await fetch('https://advanced-bug-tracker.onrender.com/api/tasks', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        priority,
        project,
        dueDate:        dueDate || null,
        estimatedHours: hours   || 0,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      showCreateError(data.message);
      return;
    }

    closeCreateModal();
    loadTasks(currentPage);

  } catch (error) {
    showCreateError('Server error. Please try again.');
  }
};

// ─── Delete Task ──────────────────────────────────────────────
const deleteTask = async (taskId) => {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const response = await fetch(
      `https://advanced-bug-tracker.onrender.com/api/tasks/${taskId}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success) {
      loadTasks(currentPage);
    } else {
      alert(data.message);
    }

  } catch (error) {
    alert('Failed to delete task.');
  }
};

// ─── Submit Status + Assign Update ────────────────────────────
const submitStatusUpdate = async () => {
  const status     = document.getElementById('new-status').value;
  const progress   = document.getElementById('new-progress').value;
  const assignedTo = canAssign()
    ? document.getElementById('assign-task-user').value
    : '';

  if (!selectedTaskId) return;

  try {
    // ── 1. Update Status ──────────────────────────────────
    const statusRes = await fetch(
      `https://advanced-bug-tracker.onrender.com/api/tasks/${selectedTaskId}/status`, {
      method:  'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ status }),
    });

    const statusData = await statusRes.json();

    if (!statusData.success) {
      const errEl = document.getElementById('status-error');
      errEl.textContent = statusData.message;
      errEl.classList.remove('hidden');
      return;
    }

    // ── 2. Update Progress ────────────────────────────────
    if (progress !== '') {
      await fetch(
        `https://advanced-bug-tracker.onrender.com/api/tasks/${selectedTaskId}`, {
        method:  'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ progress: parseInt(progress) }),
      });
    }

    // ── 3. Assign to User (if selected) ───────────────────
    if (assignedTo && canAssign()) {
      const assignRes = await fetch(
        `https://advanced-bug-tracker.onrender.com/api/tasks/${selectedTaskId}/assign`, {
        method:  'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ userId: assignedTo }),
      });

      const assignData = await assignRes.json();
      if (!assignData.success) {
        alert(`Assign failed: ${assignData.message}`);
      }
    }

    closeStatusModal();
    loadTasks(currentPage);

  } catch (error) {
    console.error('Update error:', error);
  }
};

// ─── Filters ──────────────────────────────────────────────────
const applyFilters = () => {
  currentPage = 1;
  loadTasks(1);
};

// ─── Pagination ───────────────────────────────────────────────
const changePage = (direction) => {
  const newPage = currentPage + direction;
  if (newPage < 1 || newPage > totalPages) return;
  loadTasks(newPage);
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
  document.getElementById('task-title').value       = '';
  document.getElementById('task-description').value = '';
  document.getElementById('task-project').value     = '';
  document.getElementById('task-hours').value       = '';
  document.getElementById('task-due-date').value    = '';
};

const openStatusModal = async (
  taskId, currentStatus, currentProgress, currentAssignee
) => {
  selectedTaskId = taskId;

  // Set current values
  document.getElementById('new-status').value   = currentStatus;
  document.getElementById('new-progress').value = currentProgress;
  document.getElementById('status-error')
    .classList.add('hidden');

  // Show modal first
  document.getElementById('status-modal')
    .classList.remove('hidden');
  document.getElementById('modal-overlay')
    .classList.remove('hidden');

  // Load users for assign dropdown
  await loadUsersForAssign();

  // Set current assignee in dropdown if exists
  if (currentAssignee && canAssign()) {
    const select = document.getElementById('assign-task-user');
    if (select) select.value = currentAssignee;
  }
};

const closeStatusModal = () => {
  document.getElementById('status-modal')
    .classList.add('hidden');
  document.getElementById('modal-overlay')
    .classList.add('hidden');
  selectedTaskId = null;
};

const closeAllModals = () => {
  closeCreateModal();
  closeStatusModal();
};

// ─── Helpers ──────────────────────────────────────────────────
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
};

const canCreate  = () =>
  user?.role === 'admin' || user?.role === 'manager';

const canDelete  = () =>
  user?.role === 'admin' || user?.role === 'manager';

const canAssign  = () =>
  user?.role === 'admin' || user?.role === 'manager';

const showTableMessage = (msg) => {
  document.getElementById('task-table-body').innerHTML
    = `<tr><td colspan="8" class="loading-text">${msg}</td></tr>`;
};

const showCreateError = (msg) => {
  const el = document.getElementById('create-error');
  el.textContent = msg;
  el.classList.remove('hidden');
};


const logout = () => {
  showConfirmModal({
    icon: '👋',
    title: 'Leaving so soon?',
    message: 'Are you sure you want to logout of BugTrackr?',
    confirmText: 'Yes, Logout',
    cancelText: 'Stay',
    confirmClass: 'btn-danger',
    onConfirm: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
  });
};

// ─── Init ─────────────────────────────────────────────────────
loadTasks();