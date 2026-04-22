class ConfirmModal {
  static init() {
    if (document.getElementById('custom-confirm-modal')) return;
    
    const html = `
      <div id="custom-confirm-overlay" class="custom-modal-overlay hidden"></div>
      <div id="custom-confirm-modal" class="custom-modal-card hidden">
        <div class="custom-modal-icon" id="custom-confirm-icon"></div>
        <h2 id="custom-confirm-title">Confirm Action</h2>
        <p id="custom-confirm-message">Are you sure you want to proceed?</p>
        <div class="custom-modal-actions">
          <button id="custom-confirm-cancel" class="btn btn-secondary">Cancel</button>
          <button id="custom-confirm-btn" class="btn btn-primary">
            <span class="btn-text">Confirm</span>
            <i class="fa-solid fa-circle-notch fa-spin hidden"></i>
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    
    this.overlay = document.getElementById('custom-confirm-overlay');
    this.modal = document.getElementById('custom-confirm-modal');
    this.icon = document.getElementById('custom-confirm-icon');
    this.titleEl = document.getElementById('custom-confirm-title');
    this.messageEl = document.getElementById('custom-confirm-message');
    this.cancelBtn = document.getElementById('custom-confirm-cancel');
    this.confirmBtn = document.getElementById('custom-confirm-btn');
    this.confirmBtnText = this.confirmBtn.querySelector('.btn-text');
    this.confirmBtnSpinner = this.confirmBtn.querySelector('.fa-spin');
    
    this.overlay.addEventListener('click', () => {
      if (!this.confirmBtn.disabled) this.close();
    });
    this.cancelBtn.addEventListener('click', () => {
      if (this.onCancelCallback) this.onCancelCallback();
      this.close();
    });
    this.confirmBtn.addEventListener('click', async () => {
      if (this.onConfirmCallback) {
        this.setLoading(true);
        try {
          const result = this.onConfirmCallback();
          if (result instanceof Promise) {
            await result;
          }
        } finally {
          // We don't close it here if they navigate away, but just in case
          this.setLoading(false);
          this.close();
        }
      } else {
        this.close();
      }
    });
  }

  static show({
    title = 'Confirm Action',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning', // 'warning', 'danger', 'success', 'info'
    onConfirm = null,
    onCancel = null,
    hideCancel = false
  }) {
    this.init();
    
    this.titleEl.textContent = title;
    this.messageEl.textContent = message;
    this.confirmBtnText.textContent = confirmText;
    this.cancelBtn.textContent = cancelText;
    
    this.onConfirmCallback = onConfirm;
    this.onCancelCallback = onCancel;
    
    // Style adjustments based on type
    this.confirmBtn.className = 'btn';
    let iconHtml = '';
    
    if (type === 'danger') {
      this.confirmBtn.classList.add('btn-danger');
      iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>';
    } else if (type === 'success') {
      this.confirmBtn.classList.add('btn-success');
      iconHtml = '<i class="fa-solid fa-circle-check" style="color: #22c55e;"></i>';
    } else if (type === 'warning') {
      this.confirmBtn.classList.add('btn-warning');
      iconHtml = '<i class="fa-solid fa-circle-exclamation" style="color: #f59e0b;"></i>';
    } else {
      this.confirmBtn.classList.add('btn-primary');
      iconHtml = '<i class="fa-solid fa-circle-info" style="color: #3b82f6;"></i>';
    }
    this.icon.innerHTML = iconHtml;
    
    if (hideCancel) {
      this.cancelBtn.style.display = 'none';
    } else {
      this.cancelBtn.style.display = 'block';
    }
    
    this.overlay.classList.remove('hidden');
    this.modal.classList.remove('hidden');
    
    // Force reflow for animation
    void this.modal.offsetWidth;
    
    this.overlay.classList.add('visible');
    this.modal.classList.add('visible');
  }

  static close() {
    if (!this.modal) return;
    this.overlay.classList.remove('visible');
    this.modal.classList.remove('visible');
    setTimeout(() => {
      this.overlay.classList.add('hidden');
      this.modal.classList.add('hidden');
    }, 300); // match transition duration
  }

  static setLoading(isLoading) {
    if (isLoading) {
      this.confirmBtn.disabled = true;
      this.cancelBtn.disabled = true;
      this.confirmBtnText.classList.add('hidden');
      this.confirmBtnSpinner.classList.remove('hidden');
    } else {
      this.confirmBtn.disabled = false;
      this.cancelBtn.disabled = false;
      this.confirmBtnText.classList.remove('hidden');
      this.confirmBtnSpinner.classList.add('hidden');
    }
  }
}

class Toast {
  static show(message, type = 'success') {
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = `custom-toast toast-${type}`;
    
    let icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    
    toast.innerHTML = `
      ${icon}
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Force reflow
    void toast.offsetWidth;
    
    toast.classList.add('visible');
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Expose globally
window.showConfirm = ConfirmModal.show.bind(ConfirmModal);
window.showToast = Toast.show.bind(Toast);
window.showAlert = (message, type = 'info') => {
  ConfirmModal.show({
    title: type === 'danger' ? 'Error' : (type === 'success' ? 'Success' : 'Notification'),
    message: message,
    confirmText: 'OK',
    type: type,
    hideCancel: true
  });
};
