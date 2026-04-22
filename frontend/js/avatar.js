const setupAvatars = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const sidebarAvatar = document.getElementById('user-avatar');
  
  if (!user) return;

  if (user.avatar) {
    const avatarUrl = `http://localhost:8000${user.avatar}`;
    if (sidebarAvatar) {
      sidebarAvatar.innerHTML = `<img src="${avatarUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
  } else if (user.name) {
    const initial = user.name.charAt(0).toUpperCase();
    if (sidebarAvatar) {
      sidebarAvatar.textContent = initial;
    }
  }
};

// Run automatically when loaded
setupAvatars();
