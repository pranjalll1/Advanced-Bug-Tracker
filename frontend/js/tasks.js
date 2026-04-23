// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

if (!token) window.location.href = 'login.html';

// Show username in navbar
document.getElementById('user-name').textContent = user?.name ?? '';


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

// ─── Hide Create Button for non-managers/admins ───────────────
// Only admin and manager can create tasks
if (user?.role !== 'admin' && user?.role !== 'manager') {
  const btn = document.getElementById('create-task-btn');
  if (btn) btn.style.display = 'none';
}

// ─── State ────────────────────────────────────────────────────
let currentPage      = 1;
let totalPages       = 1;
let selectedTaskId   = null;

// ─── Load Tasks ───────────────────────────────────────────────
const loadTasks = async (page = 1) => {
  try {
    const status   = document.getElementById('filter-status').value;
    const priority = document.getElementById('filter-priority').value;
    const search   = document.getElementById('filter-search').value;

    let url = `/api/tasks?page=${page}&limit=10`;
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

    // Token expired
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();
    console.log('📦 Tasks response:', data);

    if (!data.success) {
      showTableMessage(`❌ Error: ${data.message}`);
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

// ─── Render Tasks into Table ──────────────────────────────────
const renderTasks = (tasks) => {
  const tbody = document.getElementById('task-table-body');

  if (!tasks || tasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading-text">
          No tasks found.
          ${canCreate()
            ? 'Click "+ Create Task" to add one!'
            : ''}
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
            style="width: ${task.progress ?? 0}%">
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
      <td>
        <div class="action-btns">
        <button
          onclick="openStatusModal('${task._id}', '${task.status}', ${task.progress ?? 0})"
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
        </div>
      </td>
    </tr>
  `).join('');
};

// ─── Create Task ──────────────────────────────────────────────
const createTask = async () => {
  const title       = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const priority    = document.getElementById('task-priority').value;
  const dueDate     = document.getElementById('task-due-date').value;
  const project     = document.getElementById('task-project').value.trim();
  const hours       = document.getElementById('task-hours').value;

  // Validate
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
    const response = await fetch('/api/tasks', {
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
    console.log('✅ Create task response:', data);

    if (!data.success) {
      showCreateError(data.message);
      return;
    }

    closeCreateModal();
    loadTasks(currentPage);

  } catch (error) {
    console.error('Create task error:', error);
    showCreateError('Server error. Please try again.');
  }
};

// ─── Delete Task ──────────────────────────────────────────────
const deleteTask = (taskId) => {
  showConfirm({
    title: 'Delete Task',
    message: 'Are you sure you want to delete this task? This action cannot be undone.',
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: async () => {
      try {
        const response = await fetch(
          `/api/tasks/${taskId}`, {
          method:  'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          showToast('Task deleted successfully', 'success');
          loadTasks(currentPage);
        } else {
          showAlert(data.message, 'danger');
        }

      } catch (error) {
        showAlert('Failed to delete task.', 'danger');
      }
    }
  });
};

// ─── Update Status ────────────────────────────────────────────
const submitStatusUpdate = async () => {
  const status   = document.getElementById('new-status').value;
  const progress = document.getElementById('new-progress').value;

  if (!selectedTaskId) return;

  try {
    // Update status
    const statusRes = await fetch(
      `/api/tasks/${selectedTaskId}/status`, {
      method:  'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ status }),
    });

    const statusData = await statusRes.json();

    if (!statusData.success) {
      document.getElementById('status-error').textContent
        = statusData.message;
      document.getElementById('status-error')
        .classList.remove('hidden');
      return;
    }

    // Update progress if provided
    if (progress !== '') {
      await fetch(
        `/api/tasks/${selectedTaskId}`, {
        method:  'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ progress: parseInt(progress) }),
      });
    }

    closeStatusModal();
    loadTasks(currentPage);

  } catch (error) {
    console.error('Update status error:', error);
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

const openStatusModal = (taskId, currentStatus, currentProgress) => {
  selectedTaskId = taskId;
  document.getElementById('new-status').value   = currentStatus;
  document.getElementById('new-progress').value = currentProgress;
  document.getElementById('status-error')
    .classList.add('hidden');
  document.getElementById('status-modal')
    .classList.remove('hidden');
  document.getElementById('modal-overlay')
    .classList.remove('hidden');
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
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
};

const canCreate = () =>
  user?.role === 'admin' || user?.role === 'manager';

const canDelete = () =>
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
loadTasks();