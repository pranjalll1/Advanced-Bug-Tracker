// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

if (!token) window.location.href = 'login.html';

document.getElementById('user-name').textContent
  = user?.name ?? '';

// ─── Get Bug ID from localStorage ────────────────────────────
const bugId = localStorage.getItem('selectedBugId');

if (!bugId) {
  window.location.href = 'bugs.html';
}

// ─── Load Bug Detail ──────────────────────────────────────────
const loadBugDetail = async () => {
  try {
    const response = await fetch(
      `http://localhost:8000/api/bugs/${bugId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.success) {
      document.getElementById('loading').textContent
        = '❌ Bug not found.';
      return;
    }

    renderBugDetail(data.bug);
    loadComments();

    // Load developers for assign dropdown (admin/manager only)
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadDevelopers();
      document.getElementById('assign-section')
        .classList.remove('hidden');
    }

  } catch (error) {
    console.error('Load bug error:', error);
    document.getElementById('loading').textContent
      = '❌ Server error.';
  }
};

// ─── Render Bug Detail ────────────────────────────────────────
const renderBugDetail = (bug) => {
  // Hide loading, show detail
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('bug-detail').classList.remove('hidden');

  // Title
  document.getElementById('bug-title').textContent
    = bug.title;

  // Badges
  const sevEl = document.getElementById('bug-severity');
  sevEl.textContent = capitalize(bug.severity);
  sevEl.className   = `badge severity-${bug.severity}`;

  const priEl = document.getElementById('bug-priority');
  priEl.textContent = capitalize(bug.priority);
  priEl.className   = `badge priority-${bug.priority}`;

  const staEl = document.getElementById('bug-status');
  staEl.textContent = capitalize(bug.status);
  staEl.className   = `badge status-${bug.status}`;

  // Status select — set current value
  document.getElementById('status-select').value = bug.status;

  // Info fields
  document.getElementById('bug-project').textContent
    = bug.project     || '—';
  document.getElementById('bug-environment').textContent
    = capitalize(bug.environment || '—');
  document.getElementById('bug-due-date').textContent
    = formatDate(bug.dueDate);
  document.getElementById('bug-reported-by').textContent
    = bug.reportedBy?.name || '—';
  document.getElementById('bug-assigned-to').textContent
    = bug.assignedTo?.name || 'Unassigned';
  document.getElementById('bug-created-at').textContent
    = formatDate(bug.createdAt);
  document.getElementById('bug-resolved-at').textContent
    = formatDate(bug.resolvedAt);

  // Description
  document.getElementById('bug-description').textContent
    = bug.description || '—';

  // Steps / Expected / Actual
  document.getElementById('bug-steps').textContent
    = bug.stepsToReproduce || 'Not provided';
  document.getElementById('bug-expected').textContent
    = bug.expectedBehavior || 'Not provided';
  document.getElementById('bug-actual').textContent
    = bug.actualBehavior   || 'Not provided';

  // Tags
  if (bug.tags && bug.tags.length > 0) {
    document.getElementById('tags-section').style.display
      = 'block';
    document.getElementById('bug-tags').innerHTML
      = bug.tags.map(tag =>
          `<span class="tag">${tag}</span>`
        ).join('');
  }
};

// ─── Update Bug Status ────────────────────────────────────────
const updateStatus = async () => {
  const status = document.getElementById('status-select').value;

  try {
    const response = await fetch(
      `http://localhost:8000/api/bugs/${bugId}/status`, {
      method:  'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (data.success) {
      // Update status badge live
      const staEl = document.getElementById('bug-status');
      staEl.textContent = capitalize(status);
      staEl.className   = `badge status-${status}`;
      showToast(`Status updated to: ${status}`, 'success');
    } else {
      showAlert(data.message, 'danger');
    }

  } catch (error) {
    console.error('Update status error:', error);
  }
};

// ─── Load Developers for Assign Dropdown ─────────────────────
const loadDevelopers = async () => {
  try {
    const response = await fetch(
      'http://localhost:8000/api/admin/users?role=developer&status=active', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.success) return;

    const select = document.getElementById('developer-select');
    data.users.forEach(dev => {
      const option    = document.createElement('option');
      option.value    = dev._id;
      option.textContent = `${dev.name} (${dev.email})`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Load developers error:', error);
  }
};

// ─── Assign Bug ───────────────────────────────────────────────
const assignBug = async () => {
  const developerId = document.getElementById('developer-select').value;

  if (!developerId) {
    showAlert('Please select a developer.', 'warning');
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:8000/api/bugs/${bugId}/assign`, {
      method:  'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ developerId }),
    });

    const data = await response.json();

    if (data.success) {
      // Update assigned to field live
      document.getElementById('bug-assigned-to').textContent
        = data.bug.assignedTo?.name || 'Assigned';
      showToast(`Bug assigned successfully!`, 'success');
    } else {
      showAlert(data.message, 'danger');
    }

  } catch (error) {
    console.error('Assign bug error:', error);
  }
};

// ─── Load Comments ────────────────────────────────────────────
const loadComments = async () => {
  try {
    const response = await fetch(
      `http://localhost:8000/api/comments/Bug/${bugId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.success) {
      document.getElementById('comment-list').innerHTML
        = '<p class="loading-text">Could not load comments.</p>';
      return;
    }

    // Update count
    document.getElementById('comment-count').textContent
      = `(${data.count})`;

    renderComments(data.comments);

  } catch (error) {
    console.error('Load comments error:', error);
  }
};

// ─── Render Comments ──────────────────────────────────────────
const renderComments = (comments) => {
  const list = document.getElementById('comment-list');

  if (!comments || comments.length === 0) {
    list.innerHTML
      = '<p class="loading-text">No comments yet. Be the first!</p>';
    return;
  }

  list.innerHTML = comments.map(comment => `
    <div class="comment-item">
      <div class="comment-header">
        <div class="comment-author">
          <div class="comment-avatar">
            ${comment.author?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <strong>${comment.author?.name ?? 'Unknown'}</strong>
            <span class="comment-role">
              ${capitalize(comment.author?.role ?? '')}
            </span>
          </div>
        </div>
        <div class="comment-meta">
          ${comment.isEdited
            ? '<span class="edited-label">edited</span>'
            : ''}
          <span class="comment-time">
            ${formatDate(comment.createdAt)}
          </span>
          ${comment.author?._id === user?.id
            ? `<button
                 onclick="deleteComment('${comment._id}')"
                 class="btn-small btn-delete"
                 style="padding:2px 8px; font-size:11px;">
                 🗑
               </button>`
            : ''}
        </div>
      </div>
      <p class="comment-text">${comment.text}</p>
    </div>
  `).join('');
};

// ─── Add Comment ──────────────────────────────────────────────
const addComment = async () => {
  const text = document.getElementById('comment-text').value.trim();

  if (!text) {
    showAlert('Please write a comment first.', 'warning');
    return;
  }

  if (text.length < 2) {
    showAlert('Comment must be at least 2 characters.', 'warning');
    return;
  }

  try {
    const response = await fetch('http://localhost:8000/api/comments', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        text,
        reference: bugId,
        onModel:   'Bug',
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Clear input and reload comments
      document.getElementById('comment-text').value = '';
      loadComments();
    } else {
      showAlert(data.message, 'danger');
    }

  } catch (error) {
    console.error('Add comment error:', error);
  }
};

// ─── Delete Comment ───────────────────────────────────────────
const deleteComment = (commentId) => {
  showConfirm({
    title: 'Delete Comment',
    message: 'Are you sure you want to delete this comment?',
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/comments/${commentId}`, {
          method:  'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          showToast('Comment deleted', 'success');
          loadComments();
        } else {
          showAlert(data.message, 'danger');
        }

      } catch (error) {
        console.error('Delete comment error:', error);
      }
    }
  });
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
loadBugDetail();