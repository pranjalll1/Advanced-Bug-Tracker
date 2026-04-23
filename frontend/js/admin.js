// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

// Only admin can access this page
if (!token) {
  window.location.href = 'login.html';
}
if (user?.role !== 'admin') {
  showAlert('Access denied. Admin only.', 'danger');
  window.location.href = 'dashboard.html';
}

document.getElementById('user-name').textContent
  = user?.name ?? '';

// ─── State ────────────────────────────────────────────────────
let selectedUserId   = null;
let selectedUserName = '';

// Removed old openConfirmModal

// ─── Tab Switching ────────────────────────────────────────────
const switchTab = (tab) => {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Show/hide content
  document.getElementById('tab-pending')
    .classList.toggle('hidden', tab !== 'pending');
  document.getElementById('tab-all')
    .classList.toggle('hidden', tab !== 'all');

  // Load data for the tab
  if (tab === 'pending') loadPendingUsers();
  if (tab === 'all')     loadAllUsers();
};

// ─── Load Pending Users ───────────────────────────────────────
const loadPendingUsers = async () => {
  try {
    const response = await fetch(
      '/api/admin/users/pending', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.success) {
      document.getElementById('pending-list').innerHTML
        = `<p class="loading-text">Error: ${data.message}</p>`;
      return;
    }

    // Update badge count
    document.getElementById('pending-count').textContent
      = data.count;

    if (data.count === 0) {
      document.getElementById('pending-list').innerHTML = '';
      document.getElementById('pending-empty')
        .classList.remove('hidden');
      return;
    }

    document.getElementById('pending-empty')
      .classList.add('hidden');

    renderPendingUsers(data.users);

  } catch (error) {
    console.error('Load pending error:', error);
  }
};

// ─── Render Pending User Cards ────────────────────────────────
const renderPendingUsers = (users) => {
  document.getElementById('pending-list').innerHTML
    = users.map(u => `
    <div class="user-card" id="user-card-${u._id}">
      <div class="user-card-info">
        <div class="user-avatar">
          ${u.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3>${u.name}</h3>
          <p>${u.email}</p>
          <div style="margin-top: 6px;">
            <span class="badge role-${u.role}">
              ${capitalize(u.role)}
            </span>
            <span style="font-size:12px; color:#999;
                         margin-left:8px;">
              Registered: ${formatDate(u.createdAt)}
            </span>
          </div>
        </div>
      </div>
      <div class="user-card-actions">
        <button
          onclick="approveUser('${u._id}', '${u.name}')"
          class="btn-approve">
          ✅ Approve
        </button>
        <button
          onclick="rejectUser('${u._id}', '${u.name}')"
          class="btn-reject">
          ❌ Reject
        </button>
      </div>
    </div>
  `).join('');
};

// ─── Approve User ─────────────────────────────────────────────
const approveUser = (userId, userName) => {
  showConfirm({
    title: 'Approve User',
    message: `Are you sure you want to approve ${userName}'s account?`,
    confirmText: 'Approve',
    type: 'success',
    onConfirm: async () => {
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/approve`, {
          method:  'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          // Remove card from pending list smoothly
          const card = document.getElementById(`user-card-${userId}`);
          if (card) {
            card.style.opacity    = '0';
            card.style.transition = 'opacity 0.3s';
            setTimeout(() => {
              card.remove();
              loadPendingUsers(); // Refresh count
            }, 300);
          }
          showToast(`${userName} approved successfully!`, 'success');
        } else {
          showAlert(data.message, 'danger');
        }

      } catch (error) {
        console.error('Approve error:', error);
      }
    }
  });
};

// ─── Reject User ──────────────────────────────────────────────
const rejectUser = (userId, userName) => {
  showConfirm({
    title: 'Reject User',
    message: `Are you sure you want to reject ${userName}'s account? They will not be able to login.`,
    confirmText: 'Reject',
    type: 'danger',
    onConfirm: async () => {
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/reject`, {
          method:  'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          const card = document.getElementById(`user-card-${userId}`);
          if (card) {
            card.style.opacity    = '0';
            card.style.transition = 'opacity 0.3s';
            setTimeout(() => {
              card.remove();
              loadPendingUsers();
            }, 300);
          }
          showToast(`${userName} rejected.`, 'success');
        } else {
          showAlert(data.message, 'danger');
        }

      } catch (error) {
        console.error('Reject error:', error);
      }
    }
  });
};

// ─── Load All Users ───────────────────────────────────────────
const loadAllUsers = async () => {
  try {
    const role   = document.getElementById('filter-role').value;
    const status = document.getElementById('filter-status').value;

    let url = '/api/admin/users?';
    if (role)   url += `role=${role}&`;
    if (status) url += `status=${status}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.success) {
      document.getElementById('all-users-body').innerHTML
        = `<tr><td colspan="6" class="loading-text">
             Error: ${data.message}
           </td></tr>`;
      return;
    }

    renderAllUsers(data.users);

  } catch (error) {
    console.error('Load all users error:', error);
  }
};

// ─── Render All Users Table ───────────────────────────────────
const renderAllUsers = (users) => {
  const tbody = document.getElementById('all-users-body');

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-text">
          No users found.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="user-avatar-small">
            ${u.name.charAt(0).toUpperCase()}
          </div>
          ${u.name}
          ${u._id === user.id
            ? '<span style="font-size:11px; color:#3498db;">(you)</span>'
            : ''}
        </div>
      </td>
      <td>${u.email}</td>
      <td>
        <span class="badge role-${u.role}">
          ${capitalize(u.role)}
        </span>
      </td>
      <td>
        <span class="badge account-${u.status}">
          ${capitalize(u.status)}
        </span>
      </td>
      <td>${formatDate(u.createdAt)}</td>
      <td>
        <div class="action-btns">
        ${u._id !== user.id
          ? `<button
               onclick="openRoleModal('${u._id}', '${u.name}', '${u.role}')"
               class="btn-small btn-view">
               Change Role
             </button>
             <button
               onclick="deleteUser('${u._id}', '${u.name}')"
               class="btn-small btn-delete">
               Delete
             </button>`
          : '<span style="color:#bbb; font-size:12px;">—</span>'}
        </div>
      </td>
    </tr>
  `).join('');
};

// ─── Change Role Modal ────────────────────────────────────────
const openRoleModal = (userId, userName, currentRole) => {
  selectedUserId   = userId;
  selectedUserName = userName;

  document.getElementById('role-modal-user-name').textContent
    = `Changing role for: ${userName}`;
  document.getElementById('new-role-select').value
    = currentRole;
  document.getElementById('role-error')
    .classList.add('hidden');
  document.getElementById('role-modal')
    .classList.remove('hidden');
  document.getElementById('modal-overlay')
    .classList.remove('hidden');
};

const closeRoleModal = () => {
  document.getElementById('role-modal')
    .classList.add('hidden');
  document.getElementById('modal-overlay')
    .classList.add('hidden');
  selectedUserId   = null;
  selectedUserName = '';
};

const submitRoleChange = async () => {
  const role = document.getElementById('new-role-select').value;

  try {
    const response = await fetch(
      `/api/admin/users/${selectedUserId}/role`, {
      method:  'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ role }),
    });

    const data = await response.json();

    if (data.success) {
      closeRoleModal();
      loadAllUsers();
      showToast(`${selectedUserName}'s role updated to ${role}!`, 'success');
    } else {
      document.getElementById('role-error').textContent
        = data.message;
      document.getElementById('role-error')
        .classList.remove('hidden');
    }

  } catch (error) {
    console.error('Change role error:', error);
  }
};

// ─── Delete User ──────────────────────────────────────────────
const deleteUser = (userId, userName) => {
  showConfirm({
    title: 'Delete User',
    message: `Permanently delete ${userName}? This cannot be undone.`,
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: async () => {
      try {
        const response = await fetch(
          `/api/admin/users/${userId}`, {
          method:  'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          loadAllUsers();
          showToast(`${userName} deleted.`, 'success');
        } else {
          showAlert(data.message, 'danger');
        }

      } catch (error) {
        console.error('Delete user error:', error);
      }
    }
  });
};

// ─── Toast Notification ───────────────────────────────────────
// Removed local showToast to use global Toast.show

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
loadPendingUsers();