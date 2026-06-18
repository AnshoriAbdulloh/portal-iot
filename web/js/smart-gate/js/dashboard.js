// ============================================
// SMART GATE — Dashboard Real-time Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  listenGateStatus();
  listenSchedule();
  listenAccessLogs();
  computeTodayStats();
  listenFirebaseTimeAndMode();
});

/**
 * Listen for gate status changes from Firebase
 */
function listenGateStatus() {
  gateRef.on('value', (snapshot) => {
    const data = snapshot.val() || { status: 'closed', mode: 'auto' };
    updateGateStatusUI(data);
    updateDeviceStatusUI(data);
  });
}

/**
 * Update gate status card and gate visual animation
 */
function updateGateStatusUI(data) {
  const statusText = document.getElementById('gateStatusText');
  const statusIcon = document.getElementById('gateStatusIcon');
  const statusBadge = document.getElementById('gateStatusBadge');
  const leftDoor = document.getElementById('leftDoor');
  const rightDoor = document.getElementById('rightDoor');

  const status = data.status || 'closed';
  statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);

  // Remove all status classes from icon
  statusIcon.className = 'status-card-icon';

  // Update badge and icon based on status
  switch (status) {
    case 'open':
      statusIcon.classList.add('gate-open');
      statusBadge.className = 'badge badge-success';
      statusBadge.innerHTML = '<span class="status-dot online pulse"></span> Open';
      leftDoor.classList.add('open');
      rightDoor.classList.add('open');
      break;
    case 'closed':
      statusIcon.classList.add('gate-closed');
      statusBadge.className = 'badge badge-danger';
      statusBadge.innerHTML = '<span class="status-dot offline"></span> Closed';
      leftDoor.classList.remove('open');
      rightDoor.classList.remove('open');
      break;
    case 'opening':
    case 'closing':
      statusIcon.classList.add('gate-moving');
      statusBadge.className = 'badge badge-warning';
      statusBadge.innerHTML = '<span class="status-dot pulse"></span> ' + status.charAt(0).toUpperCase() + status.slice(1);
      break;
    default:
      statusIcon.classList.add('gate-closed');
      statusBadge.className = 'badge badge-danger';
      statusBadge.innerHTML = 'Offline';
  }
}

/**
 * Update device status card based on last update timestamp
 */
function updateDeviceStatusUI(data) {
  const lastUpdate = data.lastUpdate;
  const deviceIcon = document.getElementById('deviceIcon');
  const deviceText = document.getElementById('deviceStatusText');
  const deviceBadge = document.getElementById('deviceBadge');
  const lastSeenText = document.getElementById('lastSeenText');

  // Consider device online if lastUpdate was within last 60 seconds
  const isOnline = lastUpdate && (Date.now() - lastUpdate < 60000);

  deviceIcon.className = 'status-card-icon';
  if (isOnline) {
    deviceIcon.classList.add('device-online');
    deviceText.textContent = 'Online';
    deviceBadge.className = 'badge badge-success';
    deviceBadge.innerHTML = '<span class="status-dot online pulse"></span> Online';
  } else {
    deviceIcon.classList.add('device-offline');
    deviceText.textContent = 'Offline';
    deviceBadge.className = 'badge badge-danger';
    deviceBadge.innerHTML = '<span class="status-dot offline"></span> Offline';
  }

  lastSeenText.textContent = lastUpdate ? 'Last seen: ' + timeAgo(lastUpdate) : 'Last seen: —';
}

/**
 * Update mode card and auto schedule toggle based on schedule.enabled
 */
function updateScheduleUI(data) {
  const modeText = document.getElementById('currentModeText');
  const modeIcon = document.getElementById('modeIcon');
  const toggle = document.getElementById('autoScheduleToggle');
  const wrapper = document.getElementById('gateControlButtonsWrapper');
  const gateControl = document.querySelector('.card-gate');

  const enabled = data.enabled === true;
  
  if (modeIcon) modeIcon.className = 'status-card-icon';

  if (enabled) {
    if (modeText) modeText.textContent = 'Enabled';
    if (modeIcon) modeIcon.classList.add('mode-auto');
    if (toggle && toggle.id === 'autoScheduleToggle') toggle.checked = true;
    
    // Disable gate buttons wrapper
    if (wrapper) wrapper.classList.add('disabled-mode');
    if (gateControl) gateControl.classList.add('off-gate');
  } else {
    if (modeText) modeText.textContent = 'Disabled';
    if (modeIcon) modeIcon.classList.add('mode-manual');
    if (toggle && toggle.id === 'autoScheduleToggle') toggle.checked = false;
    
    // Enable gate buttons wrapper
    if (wrapper) wrapper.classList.remove('disabled-mode');
    if (gateControl) gateControl.classList.remove('off-gate');
  }
}

/**
 * Listen for schedule settings changes
 */
function listenSchedule() {
  scheduleRef.on('value', (snapshot) => {
    const data = snapshot.val() || { openTime: '06', closeTime: '19', enabled: true };
    let openStr = String(data.openTime || '06');
    let closeStr = String(data.closeTime || '19');
    
    if (!openStr.includes(':')) openStr += ':00';
    if (!closeStr.includes(':')) closeStr += ':00';

    document.getElementById('scheduleOpen').textContent = openStr;
    document.getElementById('scheduleClose').textContent = closeStr;
    updateScheduleUI(data);
  });
}

/**
 * Listen for new access log entries and render them in the activity feed
 */
function listenAccessLogs() {
  const feed = document.getElementById('activityFeed');
  const emptyState = document.getElementById('activityEmpty');

  accessLogsRef.orderByChild('timestamp').limitToLast(20).on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Remove empty state
    if (emptyState) emptyState.style.display = 'none';

    const item = createActivityItem(data);
    feed.insertBefore(item, feed.firstChild === emptyState ? emptyState.nextSibling : feed.firstChild);

    // Keep only 20 items
    const items = feed.querySelectorAll('.activity-item');
    if (items.length > 20) {
      items[items.length - 1].remove();
    }
  });
}

/**
 * Create an activity feed item DOM element
 */
function createActivityItem(data) {
  const div = document.createElement('div');
  div.className = 'activity-item';

  let iconClass = 'success';
  let iconSvg = '✓';

  if (data.status === 'failed') {
    iconClass = 'denied';
    iconSvg = '✕';
  } else if (data.source === 'admin') {
    iconClass = 'admin';
    iconSvg = '⚡';
  } else if (data.source === 'auto') {
    iconClass = 'auto';
    iconSvg = '⏱';
  }

  const name = data.residentName || 'Unknown';
  const house = data.house && data.house !== '-' ? ` (${data.house})` : '';
  const detail = data.source === 'admin' ? 'Manual control by Admin' :
                 data.source === 'auto' ? 'Automatic schedule' :
                 data.status === 'failed' ? 'Access denied — unrecognized RFID' :
                 `RFID access — UID: ${data.uid || '-'}`;

  div.innerHTML = `
    <div class="activity-icon ${iconClass}">${iconSvg}</div>
    <div class="activity-info">
      <div class="activity-name">${name}${house}</div>
      <div class="activity-detail">${detail}</div>
    </div>
    <div class="activity-time">${data.timestamp ? timeAgo(data.timestamp) : '—'}</div>
  `;

  return div;
}

/**
 * Compute and display today's access statistics
 */
function computeTodayStats() {
  // Get today's start timestamp
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  accessLogsRef.orderByChild('timestamp').startAt(todayStart).on('value', (snapshot) => {
    let total = 0, success = 0, denied = 0;

    snapshot.forEach((child) => {
      const data = child.val();
      total++;
      if (data.status === 'success') success++;
      else if (data.status === 'failed') denied++;
    });

    document.getElementById('totalAccessText').textContent = total;
    document.getElementById('successCount').textContent = success;
    document.getElementById('deniedCount').textContent = denied;
  });
}

/**
 * Listen for root 'time' and 'mode' tags to update the Current Time Card
 */
function listenFirebaseTimeAndMode() {
  const timeRef = firebase.database().ref('time');
  const fbModeRef = firebase.database().ref('mode');

  timeRef.on('value', (snapshot) => {
    const timeVal = snapshot.val();
    const el = document.getElementById('currentTime');
    if (el) el.textContent = timeVal || '--:--:--';
  });

  fbModeRef.on('value', (snapshot) => {
    const modeVal = snapshot.val();
    const el = document.getElementById('fbModeText');
    if (el) el.textContent = modeVal || '--';
  });
}
