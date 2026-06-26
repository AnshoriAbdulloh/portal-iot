// ============================================
// SMART GATE — Simple Authentication
// ============================================

// Hardcoded Credentials
const CREDENTIALS = {
  'admin': { password: 'admin', role: 'admin' },
  'user': { password: 'user', role: 'user' }
};

// 1. Immediate Auth Check (runs before page finishes loading)
function enforceAuth() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const role = sessionStorage.getItem('role');

  if (currentPath === 'login.html') {
    if (role) {
      window.location.href = 'index.html';
    }
    return;
  }

  // Not logged in
  if (!role) {
    window.location.href = 'login.html';
    return;
  }

  // Role Restrictions
  if (role === 'user' && (currentPath === 'residents.html' || currentPath === 'settings.html' || currentPath === 'logs.html')) {
    window.location.href = 'index.html';
    return;
  }
}

// Run immediately
enforceAuth();

// 2. Login Function
function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const errorMsg = document.getElementById('loginError');
  const btn = document.querySelector('.btn-login');

  if (btn) btn.textContent = 'Checking...';

  // Check admin
  firebase.database().ref('admin').once('value').then((snapshot) => {
    let adminFound = false;
    if (snapshot.exists()) {
      const adminData = snapshot.val();
      if ((adminData.username === user || user.toLowerCase() === 'admin') && adminData.password === pass) {
        adminFound = true;
      }
    } else {
      // Fallback
      if (user.toLowerCase() === 'admin' && pass === 'admin') {
        adminFound = true;
      }
    }

    if (adminFound) {
      sessionStorage.setItem('role', 'admin');
      sessionStorage.setItem('uid', 'admin');
      window.location.href = 'index.html';
      return;
    }

    // Check against 'warga' tag in Firebase
    return firebase.database().ref('warga').once('value').then((wargaSnapshot) => {
      let found = false;
      let userUid = '';
      let username = '';
      let userHouse = '';
      wargaSnapshot.forEach((child) => {
        const data = child.val();
        const expectedPass = data.password || data.nama;
        if (data && data.nama === user && pass === expectedPass) {
          found = true;
          userUid = child.key;
          username = data.nama;
          userHouse = data.alamat || data.house || '-';
        }
      });

      if (btn) btn.textContent = 'Sign In';

      if (found) {
        sessionStorage.setItem('role', 'user');
        sessionStorage.setItem('uid', userUid);
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('house', userHouse);
        window.location.href = 'index.html';
      } else {
        errorMsg.style.display = 'block';
        errorMsg.textContent = 'Invalid username or password';
      }
    });
  }).catch((err) => {
    if (btn) btn.textContent = 'Sign In';
    errorMsg.style.display = 'block';
    errorMsg.textContent = 'Network error. Try again.';
  });
}

// 2b. Change Password Functions
function toggleChangePasswordModal(show) {
  const modal = document.getElementById('changePasswordModal');
  if (!modal) return;
  if (show) {
    document.getElementById('changePasswordForm').reset();
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
  }
}
window.openChangePasswordModal = () => toggleChangePasswordModal(true);
window.toggleChangePasswordModal = toggleChangePasswordModal;

window.submitChangePassword = function() {
  const oldPass = document.getElementById('oldPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;

  if (!oldPass || !newPass || !confirmPass) {
    showToast("Please fill all fields", "error");
    return;
  }
  if (newPass !== confirmPass) {
    showToast("New passwords do not match", "error");
    return;
  }

  const role = sessionStorage.getItem('role');
  const uid = sessionStorage.getItem('uid');

  if (!uid) {
    showToast("Session expired or missing data. Please log out and log back in to change your password.", "error");
    return;
  }

  if (role === 'admin') {
    firebase.database().ref('admin').once('value').then((snapshot) => {
      const adminData = snapshot.val() || { password: 'admin' };
      if (adminData.password !== oldPass) {
        showToast("Incorrect current password", "error");
        return;
      }
      
      firebase.database().ref('admin').update({ password: newPass }).then(() => {
        showToast("Password updated successfully", "success");
        toggleChangePasswordModal(false);
      }).catch(() => showToast("Update failed", "error"));
    });
  } else if (role === 'user') {
    firebase.database().ref('warga/' + uid).once('value').then((snapshot) => {
      const data = snapshot.val();
      if (!data) {
        showToast("User not found in database.", "error");
        return;
      }
      const currentExpectedPass = data.password || data.nama;
      
      if (currentExpectedPass !== oldPass) {
        showToast("Incorrect current password", "error");
        return;
      }

      firebase.database().ref('warga/' + uid).update({ password: newPass }).then(() => {
        showToast("Password updated successfully", "success");
        toggleChangePasswordModal(false);
        document.getElementById('changePasswordForm').reset();
      }).catch(() => showToast("Update failed", "error"));
    });
  }
}

// 3. Logout Function
function logout() {
  sessionStorage.removeItem('role');
  window.location.href = 'login.html';
}

// 4. Update UI based on Role (runs after DOM loads)
document.addEventListener('DOMContentLoaded', () => {
  const role = sessionStorage.getItem('role');
  if (!role) return;

  // Update Header User display
  const headerUserSpans = document.querySelectorAll('.header-user span');
  const avatars = document.querySelectorAll('.header-user .avatar');
  
  if (headerUserSpans.length > 0) {
    headerUserSpans[0].textContent = role === 'admin' ? 'Admin' : 'User';
  }
  if (avatars.length > 0) {
    avatars[0].textContent = role === 'admin' ? 'A' : 'U';
  }

  // Hide restricted nav items for users
  if (role === 'user') {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === 'residents.html' || href === 'settings.html' || href === 'logs.html') {
        item.style.display = 'none';
      }
    });

    // Hide Recent Activity card on Dashboard
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath === 'index.html') {
      const mainGrid = document.getElementById('mainGrid');
      if (mainGrid && mainGrid.children.length > 1) {
        mainGrid.children[1].style.display = 'none';
        mainGrid.style.gridTemplateColumns = '1fr'; // Adjust layout for single card
      }

      // Hide Auto Schedule card for user
      const autoScheduleCard = document.getElementById('autoScheduleCard');
      if (autoScheduleCard) {
        autoScheduleCard.style.display = 'none';
        // Adjust grid to 3 columns since we removed one card
        const statusCards = document.getElementById('statusCards');
        if (statusCards) statusCards.style.gridTemplateColumns = 'repeat(3, 1fr)';
      }

      // Replace two gate buttons with a single toggle button (always "Open Gate" visually)
      const wrapper = document.getElementById('gateControlButtonsWrapper');
      if (wrapper) {
        wrapper.innerHTML = `
          <button class="btn btn-lg btn-success gate-toggle-btn" id="btnToggleGate" onclick="toggleGateManual()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 11 12 6 7 11"></polyline>
              <line x1="12" y1="18" x2="12" y2="6"></line>
            </svg>
            <span id="toggleGateLabel">Open Gate</span>
          </button>
        `;
      }
    }
  }
});
