// ─── Auth Check ───────────────────────────────────────────────
const token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user'));

if (!token) window.location.href = 'login.html';

// ─── Setup UI ─────────────────────────────────────────────────
document.getElementById('user-name').textContent = user?.name ?? 'User';

const roleBadge = document.getElementById('user-role-badge');
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

if (roleBadge) {
  roleBadge.textContent = capitalize(user?.role ?? '');
  roleBadge.className = `user-role role-${user?.role}`;
}

if (user?.role === 'admin') {
  const adminLink = document.getElementById('admin-link');
  if (adminLink) adminLink.style.display = 'flex';
}

// ─── Settings Page Avatar Preview ────────────────────────────
const setupSettingsAvatar = () => {
  const settingsAvatarImg = document.getElementById('avatar-img');
  const settingsAvatarInitial = document.getElementById('avatar-initial');

  if (user?.avatar) {
    const avatarUrl = `/api${user.avatar}`;
    if (settingsAvatarImg) {
      settingsAvatarImg.src = avatarUrl;
      settingsAvatarImg.style.display = 'block';
    }
    if (settingsAvatarInitial) {
      settingsAvatarInitial.style.display = 'none';
    }
  } else if (user?.name) {
    const initial = user.name.charAt(0).toUpperCase();
    if (settingsAvatarImg) {
      settingsAvatarImg.style.display = 'none';
    }
    if (settingsAvatarInitial) {
      settingsAvatarInitial.textContent = initial;
      settingsAvatarInitial.style.display = 'block';
    }
  }
};

setupSettingsAvatar();

// Pre-fill profile form
document.getElementById('profile-name').value = user?.name || '';
document.getElementById('profile-email').value = user?.email || '';

// ─── Update Profile ───────────────────────────────────────────
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('profile-name').value.trim();
  const email = document.getElementById('profile-email').value.trim();
  const errorEl = document.getElementById('profile-error');
  const successEl = document.getElementById('profile-success');
  const btn = document.getElementById('update-profile-btn');

  errorEl.classList.add('hidden');
  successEl.style.display = 'none';

  const originalBtnText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.user));
      user = data.user;
      document.getElementById('user-name').textContent = user.name;
      successEl.style.display = 'block';
      setTimeout(() => successEl.style.display = 'none', 3000);
      if (typeof setupAvatars === 'function') setupAvatars();
      setupSettingsAvatar();
    } else {
      errorEl.textContent = data.message;
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Server error. Please try again.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.textContent = originalBtnText;
    btn.disabled = false;
  }
});

// ─── Update Password ──────────────────────────────────────────
document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const errorEl = document.getElementById('password-error');
  const successEl = document.getElementById('password-success');
  const btn = document.getElementById('update-password-btn');

  errorEl.classList.add('hidden');
  successEl.style.display = 'none';

  const originalBtnText = btn.textContent;
  btn.textContent = 'Updating...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/users/password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (data.success) {
      successEl.style.display = 'block';
      document.getElementById('password-form').reset();
      setTimeout(() => successEl.style.display = 'none', 3000);
    } else {
      errorEl.textContent = data.message;
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Server error. Please try again.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.textContent = originalBtnText;
    btn.disabled = false;
  }
});

// ─── Avatar Upload ────────────────────────────────────────────
const avatarInput = document.getElementById('avatar-input');
const uploadBtn = document.getElementById('upload-avatar-btn');
const fileNameDisplay = document.getElementById('file-name-display');

avatarInput.addEventListener('change', (e) => {
  const file = e.target.files[0];

  if (!file) {
    fileNameDisplay.textContent = '';
    uploadBtn.style.display = 'none';
    setupSettingsAvatar();
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    const errorEl = document.getElementById('avatar-error');
    errorEl.textContent = 'File too large. Max size is 2MB.';
    errorEl.classList.remove('hidden');
    avatarInput.value = '';
    return;
  }

  fileNameDisplay.textContent = file.name;
  uploadBtn.style.display = 'inline-flex';
  document.getElementById('avatar-error').classList.add('hidden');

  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('avatar-img').src = ev.target.result;
    document.getElementById('avatar-img').style.display = 'block';
    document.getElementById('avatar-initial').style.display = 'none';
  };
  reader.readAsDataURL(file);
});

document.getElementById('avatar-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = avatarInput.files[0];
  if (!file) return;

  const errorEl = document.getElementById('avatar-error');
  const successEl = document.getElementById('avatar-success');

  errorEl.classList.add('hidden');
  successEl.style.display = 'none';

  const originalBtnText = uploadBtn.textContent;
  uploadBtn.textContent = 'Uploading...';
  uploadBtn.disabled = true;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const response = await fetch('/api/users/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // ⚠️ Do NOT set Content-Type when sending FormData!
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.user));
      user = data.user;
      if (typeof setupAvatars === 'function') setupAvatars();
      setupSettingsAvatar();
      successEl.style.display = 'block';
      uploadBtn.style.display = 'none';
      fileNameDisplay.textContent = '';
      avatarInput.value = '';
      setTimeout(() => successEl.style.display = 'none', 3000);
    } else {
      errorEl.textContent = data.message || 'Upload failed.';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Server error. Please try again.';
    errorEl.classList.remove('hidden');
  } finally {
    uploadBtn.textContent = originalBtnText;
    uploadBtn.disabled = false;
  }
});

// ─── Logout ───────────────────────────────────────────────────
const logout = () => {
  showConfirm({
    title: 'Leaving so soon?',
    message: 'Are you sure you want to logout of BugTrackr?',
    confirmText: 'Yes, Logout',
    cancelText: 'Stay',
    type: 'danger',
    onConfirm: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
  });
};
