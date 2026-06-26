// ============================================
// SMART GATE — Gate Control Functions
// ============================================

/**
 * Open Gate - writes to Firebase and logs the action
 */
function openGate() {
  const wrapper = document.getElementById("gateControlButtonsWrapper");
  const role = sessionStorage.getItem("role");

  // User restrictions (admin is never blocked)
  if (role !== "admin") {
    if (wrapper && wrapper.classList.contains("disabled-mode")) {
      showToast(
        "Gate control is disabled when Auto Schedule is enabled",
        "error",
      );
      return;
    }
    if (wrapper && wrapper.classList.contains("disabled-siang")) {
      showToast(
        "Gate control is disabled for residents during Mode Siang",
        "error",
      );
      return;
    }
  }

  scheduleRef.update({
    manual: "BUKA",
  });

  const roleLabel =
    role === "admin"
      ? "Admin"
      : sessionStorage.getItem("username") || "Resident";
  const houseLabel =
    role === "admin" ? "-" : sessionStorage.getItem("house") || "-";
  const sourceLabel = role === "admin" ? "admin" : "user";

  // Log admin action (only really relevant for admin, but keeping it for completeness if users also use these functions)
  adminLogsRef.push({
    action: "Gate opened manually",
    user: roleLabel,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  // Log access
  accessLogsRef.push({
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    uid: "-",
    residentName: roleLabel,
    house: houseLabel,
    status: "success",
    source: sourceLabel,
  });

  showToast("Gate opened successfully", "success");
}

/**
 * Close Gate - writes to Firebase and logs the action
 */
function closeGate() {
  const wrapper = document.getElementById("gateControlButtonsWrapper");
  const role = sessionStorage.getItem("role");

  // User restrictions (admin is never blocked)
  if (role !== "admin") {
    if (wrapper && wrapper.classList.contains("disabled-mode")) {
      showToast(
        "Gate control is disabled when Auto Schedule is enabled",
        "error",
      );
      return;
    }
    if (wrapper && wrapper.classList.contains("disabled-siang")) {
      showToast(
        "Gate control is disabled for residents during Mode Siang",
        "error",
      );
      return;
    }
  }

  scheduleRef.update({
    manual: "TUTUP",
  });

  const roleLabel =
    role === "admin"
      ? "Admin"
      : sessionStorage.getItem("username") || "Resident";
  const houseLabel =
    role === "admin" ? "-" : sessionStorage.getItem("house") || "-";
  const sourceLabel = role === "admin" ? "admin" : "user";

  adminLogsRef.push({
    action: "Gate closed manually",
    user: roleLabel,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  // Log access
  accessLogsRef.push({
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    uid: "-",
    residentName: roleLabel,
    house: houseLabel,
    status: "success",
    source: sourceLabel,
  });

  showToast("Gate closed successfully", "success");
}

/**
 * Toggle Auto Schedule mode
 * @param {boolean} enabled - Whether auto schedule is enabled
 */
function toggleAutoSchedule(enabled) {
  const tanda = document.querySelector(".card-gate");

  if (enabled) {
    tanda.classList.add("tanda");
  } else {
    tanda.classList.remove("tanda");
  }

  firebase.database().ref("schedule").update({
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

/**
 * Toggle Gate (User Role)
 * Reads current schedule/manual and flips it between BUKA and TUTUP
 */
function toggleGateManual() {
  const wrapper = document.getElementById("gateControlButtonsWrapper");
  const role = sessionStorage.getItem("role");

  if (role !== "admin") {
    if (wrapper && wrapper.classList.contains("disabled-mode")) {
      showToast(
        "Gate control is disabled when Auto Schedule is enabled",
        "error",
      );
      return;
    }
    if (wrapper && wrapper.classList.contains("disabled-siang")) {
      showToast(
        "Gate control is disabled for residents during Mode Siang",
        "error",
      );
      return;
    }
  }

  firebase
    .database()
    .ref("schedule/manual")
    .once("value")
    .then((snapshot) => {
      const currentManual = snapshot.val() || "TUTUP";
      const newManual = currentManual === "BUKA" ? "TUTUP" : "BUKA";

      firebase.database().ref("schedule").update({
        manual: newManual,
      });

      const roleLabel =
        role === "admin"
          ? "Admin"
          : sessionStorage.getItem("username") || "Resident";
      const houseLabel =
        role === "admin" ? "-" : sessionStorage.getItem("house") || "-";
      const sourceLabel = role === "admin" ? "admin" : "user";

      adminLogsRef.push({
        action: `Gate ${newManual === "BUKA" ? "opened" : "closed"} manually (toggle)`,
        user: roleLabel,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      });

      accessLogsRef.push({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        uid: "-",
        residentName: roleLabel,
        house: houseLabel,
        status: "success",
        source: sourceLabel,
      });

      showToast(
        `Gate ${newManual === "BUKA" ? "opened" : "closed"} successfully`,
        "success",
      );
    });
}

// function lihatJadwal() {
//   // Listen to schedule enabled state separately
//   const enabledRef = firebase.database().ref("schedule/enabled");
//   enabledRef.on("value", (snapshot) => {
//     const enabled = snapshot.val();
//     const tanda = document.querySelector(".manual");

//     if (enabled) {
//       tanda.classList.add("tanda");
//     } else {
//       tanda.classList.remove("tanda");
//     }
//   });
// }
