document.addEventListener("DOMContentLoaded", () => {
  loadSchedule();
  loadSystemInfo();
  loadAdminLogs();
});

function loadSchedule() {
  scheduleRef.on("value", (snapshot) => {
    const data = snapshot.val() || {
      openTime: "06",
      closeTime: "19",
      enabled: true,
    };

    let openTimeStr = String(data.openTime || "06");
    let closeTimeStr = String(data.closeTime || "19");
    if (!openTimeStr.includes(":")) openTimeStr += ":00";
    if (!closeTimeStr.includes(":")) closeTimeStr += ":00";

    document.getElementById("openTime").value = openTimeStr;
    document.getElementById("closeTime").value = closeTimeStr;
    document.getElementById("scheduleEnabled").checked = data.enabled !== false;
    updateTimeline(openTimeStr, closeTimeStr);
  });
}

function updateTimeline(openTime, closeTime) {
  // Convert time strings to percentage positions on 24h bar
  const openParts = openTime.split(":");
  const closeParts = closeTime.split(":");
  const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
  const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);
  const totalMinutes = 24 * 60;

  const bar = document.getElementById("timelineBar");
  const openMarker = document.getElementById("openMarker");
  const closeMarker = document.getElementById("closeMarker");

  const openPercent = (openMinutes / totalMinutes) * 100;
  const closePercent = (closeMinutes / totalMinutes) * 100;

  bar.style.left = openPercent + "%";
  bar.style.width = closePercent - openPercent + "%";

  if (openMarker) {
    openMarker.style.left = openPercent + "%";
    openMarker.setAttribute("data-time", openTime);
  }
  if (closeMarker) {
    closeMarker.style.left = closePercent + "%";
    closeMarker.setAttribute("data-time", closeTime);
  }
}

function saveSchedule() {
  let openTime = document.getElementById("openTime").value;
  let closeTime = document.getElementById("closeTime").value;
  const enabled = document.getElementById("scheduleEnabled").checked;

  if (!openTime || !closeTime) {
    showToast("Please set both open and close times", "error");
    return;
  }

  // Only save the hour part
  if (openTime.includes(":")) openTime = openTime.split(":")[0];
  if (closeTime.includes(":")) closeTime = closeTime.split(":")[0];

  scheduleRef
    .update({ openClose: openTime + closeTime })
    .then(() => {
      showToast("Schedule saved", "success");
      adminLogsRef.push({
        action: `Schedule updated: Open ${openTime}:00, Close ${closeTime}:00, ${enabled ? "Enabled" : "Disabled"}`,
        user: "Admin",
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      });
    })
    .catch(() => showToast("Failed to save schedule", "error"));
}

function loadSystemInfo() {
  // Firebase connection status
  const connRef = firebase.database().ref(".info/connected");
  connRef.on("value", (snap) => {
    const el = document.getElementById("firebaseStatus");
    if (snap.val() === true) {
      el.innerHTML =
        '<span class="badge badge-success"><span class="status-dot online pulse"></span> Connected</span>';
    } else {
      el.innerHTML =
        '<span class="badge badge-danger"><span class="status-dot offline"></span> Disconnected</span>';
    }
  });

  // Device last seen
  gateRef.child("lastUpdate").on("value", (snap) => {
    const el = document.getElementById("deviceLastSeen");
    el.textContent = snap.val() ? timeAgo(snap.val()) : "—";
  });

  // Total residents
  residentsRef.on("value", (snap) => {
    document.getElementById("totalResidents").textContent = snap.numChildren();
  });

  // Total logs
  accessLogsRef.on("value", (snap) => {
    document.getElementById("totalLogs").textContent = snap.numChildren();
  });
}

function loadAdminLogs() {
  adminLogsRef
    .orderByChild("timestamp")
    .limitToLast(20)
    .on("value", (snapshot) => {
      const tbody = document.getElementById("adminLogsBody");
      const logs = [];
      snapshot.forEach((child) => {
        logs.push(child.val());
      });
      logs.reverse();

      if (logs.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="3"><div class="empty-state"><h3>No admin activity</h3></div></td></tr>';
        return;
      }

      tbody.innerHTML = logs
        .map(
          (log) => `
      <tr>
        <td>${log.timestamp ? formatTimestamp(log.timestamp) : "—"}</td>
        <td>${log.action || "—"}</td>
        <td>${log.user || "—"}</td>
      </tr>
    `,
        )
        .join("");
    });
}
