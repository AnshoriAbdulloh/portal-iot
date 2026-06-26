let allLogs = [];
let displayedCount = 50;

document.addEventListener('DOMContentLoaded', () => {
  loadLogs();
  initFilters();
});

function loadLogs() {
  // Use default chronological ordering instead of timestamp, since ESP doesn't send timestamp
  accessLogsRef.on('value', (snapshot) => {
    allLogs = [];
    snapshot.forEach((child) => {
      const data = child.val();
      allLogs.push({ 
        id: child.key, 
        ...data,
        // Map ESP fields to our expected fields
        residentName: data.residentName || data.nama || 'Unknown',
        house: data.house || data.alamat || '—',
        status: data.status || (data.nama === "Tidak Dikenali" ? "failed" : "success"),
        source: data.source || 'rfid',
        uid: data.uid || '—'
      });
    });
    allLogs.reverse(); // newest first
    applyFilters();
  });
}

function initFilters() {
  // Add event listeners to all filter inputs
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterSource').addEventListener('change', applyFilters);
  document.getElementById('filterDateFrom').addEventListener('change', applyFilters);
  document.getElementById('filterDateTo').addEventListener('change', applyFilters);
}

function applyFilters() {
  const status = document.getElementById('filterStatus').value;
  const source = document.getElementById('filterSource').value;
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo = document.getElementById('filterDateTo').value;
  
  let filtered = allLogs.filter(log => {
    if (status !== 'all' && log.status !== status) return false;
    if (source !== 'all' && log.source !== source) return false;
    if (dateFrom && log.timestamp) {
      const fromTs = new Date(dateFrom).getTime();
      if (log.timestamp < fromTs) return false;
    }
    if (dateTo && log.timestamp) {
      const toTs = new Date(dateTo).setHours(23, 59, 59, 999);
      if (log.timestamp > toTs) return false;
    }
    return true;
  });
  
  renderLogs(filtered);
}

function renderLogs(logs) {
  const tbody = document.getElementById('logsTableBody');
  const shown = logs.slice(0, displayedCount);
  
  if (shown.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><h3>No logs found</h3><p>Try adjusting your filters.</p></div></td></tr>';
    return;
  }
  
  tbody.innerHTML = shown.map(log => `
    <tr>
      <td>${log.timestamp ? formatTimestamp(log.timestamp) : (log.waktu || '—')}</td>
      <td><code class="resident-uid">${log.uid}</code></td>
      <td>${log.residentName}</td>
      <td>${log.house}</td>
      <td><span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">${log.status === 'success' ? 'Success' : 'Failed'}</span></td>
      <td><span class="source-badge source-${log.source || 'rfid'}">${(log.source || 'rfid').toUpperCase()}</span></td>
    </tr>
  `).join('');
  
  // Update count
  document.getElementById('logCount').textContent = `Showing ${shown.length} of ${logs.length} entries`;
  
  // Show/hide load more
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = logs.length > displayedCount ? 'inline-flex' : 'none';
  }
}

function loadMore() {
  displayedCount += 50;
  applyFilters();
}

function exportCSV() {
  const status = document.getElementById('filterStatus').value;
  const source = document.getElementById('filterSource').value;
  
  let data = allLogs;
  if (status !== 'all') data = data.filter(l => l.status === status);
  if (source !== 'all') data = data.filter(l => l.source === source);
  
  const headers = ['Time', 'UID', 'Name', 'House', 'Status', 'Source'];
  const rows = data.map(l => [
    l.timestamp ? new Date(l.timestamp).toLocaleString('id-ID') : '',
    l.uid || '',
    l.residentName || '',
    l.house || '',
    l.status || '',
    l.source || ''
  ]);
  
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `access-logs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('CSV exported successfully', 'success');
}
