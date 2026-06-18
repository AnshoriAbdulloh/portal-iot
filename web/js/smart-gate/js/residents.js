let residents = {};
let editingId = null;

// fungsi ini akan dijalankan saat semua html selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  listenResidents();
  initSearchResident();
});

function listenResidents() {
  residentsRef.on("value", (snapshot) => {
    residents = snapshot.val() || {};
    renderResidents(residents);
  });
}

function renderResidents(data) {
  const tbody = document.getElementById("residentsTableBody");
  const residentCount = document.getElementById("residentCount");

  const entries = Object.entries(data);
  residentCount.textContent = `Total: ${entries.length} residents`;

  if (entries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3>No residents found</h3>
            <p>Click "Add Resident" to add one.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = entries
    .map(
      ([id, r]) => `
    <tr>
      <td class="font-bold">${r.name}</td>
      <td>${r.house}</td>
      <td><span class="resident-uid">${id}</span></td>
      <td>
        <span class="badge ${r.active ? "badge-success" : "badge-danger"}">
          ${r.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="openEditModal('${id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="confirmDelete('${id}', '${r.name}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

function initSearchResident() {
  const searchInput = document.getElementById("searchResident");
  searchInput.addEventListener(
    "input",
    debounce((e) => {
      const query = e.target.value.toLowerCase();
      const filtered = {};
      Object.entries(residents).forEach(([id, r]) => {
        if (
          r.name.toLowerCase().includes(query) ||
          r.house.toLowerCase().includes(query) ||
          r.uid.toLowerCase().includes(query)
        ) {
          filtered[id] = r;
        }
      });
      renderResidents(filtered);
    }, 300),
  );
}

function openAddModal() {
  editingId = null;
  document.getElementById("modalTitle").textContent = "Add New Resident";
  document.getElementById("residentForm").reset();
  document.getElementById("residentStatus").value = "true";
  toggleModal("residentModal", true);
}

function openEditModal(id) {
  editingId = id;
  const r = residents[id];
  document.getElementById("modalTitle").textContent = "Edit Resident";
  document.getElementById("residentName").value = r.name;
  document.getElementById("residentHouse").value = r.house;
  document.getElementById("residentUid").value = id;
  document.getElementById("residentStatus").value = String(r.active);
  toggleModal("residentModal", true);
}

let waitingForUid = false;
let newUidListener = null;

function saveResident() {
  const name = document.getElementById("residentName").value.trim();
  const house = document.getElementById("residentHouse").value.trim();
  const uid = document.getElementById("residentUid").value.trim();
  const active = document.getElementById("residentStatus").value === "true";

  if (!name || !house) {
    showToast("Please fill Name and House Number", "error");
    return;
  }

  if (editingId) {
    if (!uid) {
      showToast("UID is required for editing", "error");
      return;
    }
    const data = { name, house, active };
    residentsRef
      .child(editingId)
      .update(data)
      .then(() => {
        showToast("Resident updated", "success");
        toggleModal("residentModal", false);
      })
      .catch(() => showToast("Update failed", "error"));

    adminLogsRef.push({
      action: `Edited resident: ${name}`,
      user: "Admin",
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });
    return;
  }

  if (!uid) {
    if (waitingForUid) return;
    
    waitingForUid = true;
    showToast("Please tap RFID card on scanner...", "info");
    
    document.getElementById("residentName").disabled = true;
    document.getElementById("residentHouse").disabled = true;
    document.getElementById("residentStatus").disabled = true;
    
    const saveBtn = document.querySelector("#residentModal .btn-primary");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Waiting for Card...";
    }

    const newUidRef = firebase.database().ref("newUid");
    newUidListener = newUidRef.on("value", (snapshot) => {
      const scannedUid = snapshot.val();
      if (scannedUid && scannedUid !== "undefined" && scannedUid !== "") {
        newUidRef.off("value", newUidListener);
        newUidListener = null;
        waitingForUid = false;

        document.getElementById("residentName").disabled = false;
        document.getElementById("residentHouse").disabled = false;
        document.getElementById("residentStatus").disabled = false;
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Resident";
        }

        document.getElementById("residentUid").value = scannedUid;

        const data = { name, house, active };
        residentsRef
          .child(scannedUid)
          .set(data)
          .then(() => {
            showToast("Resident added", "success");
            toggleModal("residentModal", false);
            newUidRef.set("");
          })
          .catch(() => showToast("Add failed", "error"));

        adminLogsRef.push({
          action: `Added resident: ${name}`,
          user: "Admin",
          timestamp: firebase.database.ServerValue.TIMESTAMP,
        });
      }
    });
    return;
  }

  const data = { name, house, active };
  residentsRef
    .child(uid)
    .set(data)
    .then(() => {
      showToast("Resident added", "success");
      toggleModal("residentModal", false);
    })
    .catch(() => showToast("Add failed", "error"));

  adminLogsRef.push({
    action: `Added resident: ${name}`,
    user: "Admin",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function confirmDelete(id, name) {
  document.getElementById("deleteName").textContent = name;
  document.getElementById("confirmDeleteBtn").onclick = () =>
    deleteResident(id, name);
  toggleModal("deleteModal", true);
}

function deleteResident(id, name) {
  residentsRef
    .child(id)
    .remove()
    .then(() => {
      showToast("Resident deleted", "success");
      toggleModal("deleteModal", false);
    })
    .catch(() => showToast("Delete failed", "error"));

  adminLogsRef.push({
    action: `Deleted resident: ${name}`,
    user: "Admin",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

function toggleModal(id, show) {
  const modal = document.getElementById(id);
  if (show) {
    modal.classList.add("active");
  } else {
    modal.classList.remove("active");
    if (id === "residentModal") {
      if (waitingForUid && newUidListener) {
        firebase.database().ref("newUid").off("value", newUidListener);
        newUidListener = null;
        waitingForUid = false;
      }
      document.getElementById("residentName").disabled = false;
      document.getElementById("residentHouse").disabled = false;
      document.getElementById("residentStatus").disabled = false;
      const saveBtn = document.querySelector("#residentModal .btn-primary");
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Resident";
      }
    }
  }
}
