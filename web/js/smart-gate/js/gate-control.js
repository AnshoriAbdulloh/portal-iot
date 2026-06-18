// ============================================
// SMART GATE — Gate Control Functions
// ============================================

/**
 * Open Gate - writes to Firebase and logs the action
 */
function openGate() {
  const wrapper = document.getElementById("gateControlButtonsWrapper");
  if (wrapper && wrapper.classList.contains("disabled-mode")) {
    showToast(
      "Gate control is disabled when Auto Schedule is enabled",
      "error",
    );
    return;
  }
  scheduleRef.update({
    manual: "BUKA"
  });

  // Log admin action
  adminLogsRef.push({
    action: "Gate opened manually",
    user: "Admin",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  // Log access
  accessLogsRef.push({
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    uid: "-",
    residentName: "Admin",
    house: "-",
    status: "success",
    source: "admin",
  });

  showToast("Gate opened successfully", "success");
}

/**
 * Close Gate - writes to Firebase and logs the action
 */
function closeGate() {
  const wrapper = document.getElementById("gateControlButtonsWrapper");
  if (wrapper && wrapper.classList.contains("disabled-mode")) {
    showToast(
      "Gate control is disabled when Auto Schedule is enabled",
      "error",
    );
    return;
  }
  scheduleRef.update({
    manual: "TUTUP"
  });

  adminLogsRef.push({
    action: "Gate closed manually",
    user: "Admin",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  showToast("Gate closed successfully", "success");
}

/**
 * Toggle Auto Schedule mode
 * @param {boolean} enabled - Whether auto schedule is enabled
 */
function toggleAutoSchedule(enabled) {
  scheduleRef.update({
    enabled: enabled,
  });

  adminLogsRef.push({
    action: enabled ? "Auto schedule enabled" : "Auto schedule disabled",
    user: "Admin",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  showToast(
    enabled ? "Auto schedule enabled" : "Auto schedule disabled",
    "info",
  );
}
