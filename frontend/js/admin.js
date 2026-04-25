// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

const API = 'https://advanced-bug-tracker.onrender.com';

if (!token) {
  window.location.href = 'login.html';
}

// Delay role check so ConfirmModal loads first
window.addEventListener('DOMContentLoaded', () => {
  if (user?.role !== 'admin') {
    alert('Access denied. Admin only.');
    window.location.href = 'dashboard.html';
  }
});

// ─── Set User Info ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = user?.name ?? '';
});

// ─── State ────────────────────────────────────────────────────
let selectedUserId   = null;
let selectedUserName = '';

// ─── Tab Switching ────────────────────────────────────────────
const switchTab = (tab) => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  document.getElementById('tab-pending')
    .classList.toggle('hidden', tab !== 'pending');
  document.getElementById('tab-all')
    .classList.toggle('hidden', tab !== 'all');

  if (tab === 'pending') loadPendingUsers();
  if (tab === 'all')     loadAllUsers();
};

// ─── Load Pending Users ───────────────────────────────────────
const loadPendingUsers = async () => {
  try {
    const response = await fetch(
      `${API}/api/admin/users/pending`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    console.log('Pending users:', data);

    if (!data.success) {
      document.getElementById('pending-list').innerHTML
        = `<p class="loading-text">Error: ${data.message}</p>`;
      return;
    }

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

// ─── Render Pending Users ─────────────────────────────────────
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
            <div style="margin-top:6px;">
              <span class="badge role-${u.role}">
                ${capitalize(u.role)}
              </span>
              <span style="font-size:12px; color:#999; margin-left:8px;">
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
const approveUser = async (userId, userName) => {
  if (!confirm(`Approve ${userName}'s account?`)) return;

  try {
    const response = await fetch(
      `${API}/api/admin/users/${userId}/approve`, {
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
      showToast(`✅ ${userName} approved!`);
    } else {
      alert(data.message);
    }

  } catch (error) {
    console.error('Approve error:', error);
  }
};

// ─── Reject User ──────────────────────────────────────────────
const rejectUser = async (userId, userName) => {
  if (!confirm(`Reject ${userName}'s account?`)) return;

  try {
    const response = await fetch(
      `${API}/api/admin/users/${userId}/reject`, {
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
      showToast(`❌ ${userName} rejected.`);
    } else {
      alert(data.message);
    }

  } catch (error) {
    console.error('Reject error:', error);
  }
};

// ─── Load All Users ───────────────────────────────────────────
const loadAllUsers = async () => {
  try {
    const role   = document.getElementById('filter-role').value;
    const status = document.getElementById('filter-status').value;

    let url = `${API}/api/admin/users?`;
    if (role)   url += `role=${role}&`;
    if (status) url += `status=${status}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    console.log('All users:', data);

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

// ─── Render All Users ─────────────────────────────────────────
const renderAllUsers = (users) => {
  const tbody = document.getElementById('all-users-body');

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-text">No users found.</td>
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
          <span>${u.name}</span>
          ${u._id === user.id
            ? '<span style="font-size:11px;color:#3498db;margin-left:4px;">(you)</span>'
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
            : '<span style="color:#bbb;font-size:12px;">—</span>'}
        </div>
      </td>
    </tr>
  `).join('');
};

// ─── Open Role Modal ──────────────────────────────────────────
const openRoleModal = (userId, userName, currentRole) => {
  selectedUserId   = userId;
  selectedUserName = userName;

  console.log('Opening modal:', userId, userName, currentRole);

  const modal   = document.getElementById('role-modal');
  const overlay = document.getElementById('modal-overlay');
  const nameEl  = document.getElementById('role-modal-user-name');
  const select  = document.getElementById('new-role-select');
  const errEl   = document.getElementById('role-error');

  if (!modal || !select) {
    console.error('Modal elements not found!',
      'modal:', modal,
      'select:', select
    );
    return;
  }

  // Show modal first
  modal.classList.remove('hidden');
  if (overlay) overlay.classList.remove('hidden');

  // Then set values
  if (nameEl) nameEl.textContent = `Changing role for: ${userName}`;
  if (select) select.value       = currentRole;
  if (errEl)  errEl.classList.add('hidden');
};

// ─── Close Role Modal ─────────────────────────────────────────
const closeRoleModal = () => {
  const modal   = document.getElementById('role-modal');
  const overlay = document.getElementById('modal-overlay');

  if (modal)   modal.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');

  selectedUserId   = null;
  selectedUserName = '';
};

// ─── Submit Role Change ───────────────────────────────────────
const submitRoleChange = async () => {
  const select = document.getElementById('new-role-select');

  if (!select || !selectedUserId) {
    alert('Something went wrong. Please try again.');
    return;
  }

  const role = select.value;
  console.log('Changing role to:', role, 'for user:', selectedUserId);

  try {
    const response = await fetch(
      `${API}/api/admin/users/${selectedUserId}/role`, {
      method:  'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ role }),
    });

    const data = await response.json();
    console.log('Role change response:', data);

    if (data.success) {
      closeRoleModal();
      loadAllUsers();
      showToast(`✅ ${selectedUserName}'s role updated to ${role}!`);
    } else {
      const errEl = document.getElementById('role-error');
      if (errEl) {
        errEl.textContent = data.message;
        errEl.classList.remove('hidden');
      }
      alert(`Error: ${data.message}`);
    }

  } catch (error) {
    console.error('Change role error:', error);
    alert('Server error. Try again.');
  }
};

// ─── Delete User ──────────────────────────────────────────────
const deleteUser = async (userId, userName) => {
  if (!confirm(`Permanently delete ${userName}? This cannot be undone.`)) return;

  try {
    const response = await fetch(
      `${API}/api/admin/users/${userId}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success) {
      loadAllUsers();
      showToast(`🗑 ${userName} deleted.`);
    } else {
      alert(data.message);
    }

  } catch (error) {
    console.error('Delete user error:', error);
  }
};

// ─── Toast Notification ───────────────────────────────────────
const showToast = (message) => {
  // Remove existing toast
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id            = 'toast';
  toast.textContent   = message;
  toast.style.cssText = `
    position:      fixed;
    bottom:        24px;
    right:         24px;
    background:    #2c3e50;
    color:         white;
    padding:       12px 20px;
    border-radius: 8px;
    font-size:     14px;
    z-index:       9999;
    box-shadow:    0 4px 12px rgba(0,0,0,0.2);
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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

const logout = () => {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }
};

// ─── Init ─────────────────────────────────────────────────────
loadPendingUsers();