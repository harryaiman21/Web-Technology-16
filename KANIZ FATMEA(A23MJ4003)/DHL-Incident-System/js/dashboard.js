let allIncidents = [];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatType(type) {
  const map = {
    late_delivery:  'Late Delivery',
    address_issue:  'Address Issue',
    damaged_parcel: 'Damaged Parcel',
    system_error:   'System Error',
    complaint:      'Complaint'
  };
  return map[type] || type;
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  return `<span class="badge badge-${s}">${status}</span>`;
}

function priorityBadge(priority) {
  const p = (priority || '').toLowerCase();
  return `<span class="badge badge-${p}">${priority.toUpperCase()}</span>`;
}

function renderStats(incidents) {
  document.getElementById('stat-total').textContent    = incidents.length;
  document.getElementById('stat-draft').textContent    = incidents.filter(i => i.status === 'Draft').length;
  document.getElementById('stat-reviewed').textContent = incidents.filter(i => i.status === 'Reviewed').length;
  document.getElementById('stat-resolved').textContent = incidents.filter(i => i.status === 'Resolved').length;
  document.getElementById('stat-critical').textContent = incidents.filter(i => i.priority === 'critical').length;
}

function renderTable(incidents) {
  const tbody = document.getElementById('incident-tbody');
  const count = document.getElementById('row-count');
  count.textContent = `${incidents.length} incident${incidents.length !== 1 ? 's' : ''}`;

  if (incidents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="no-data"><p>No incidents found</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = incidents.map(inc => `
    <tr onclick="goToDetail(${inc.id})">
      <td>
        <div class="incident-title-cell">
          <div class="incident-title">${escapeHtml(inc.title)}</div>
          <div class="incident-id">#INC-${String(inc.id).padStart(4,'0')}</div>
        </div>
      </td>
      <td><span class="badge-type">${formatType(inc.type)}</span></td>
      <td>${priorityBadge(inc.priority)}</td>
      <td>${statusBadge(inc.status)}</td>
      <td>${escapeHtml(inc.department || '—')}</td>
      <td>${escapeHtml(inc.creatorName || inc.creator || '—')}</td>
      <td>${formatDate(inc.createdAt)}</td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function goToDetail(id) {
  window.location.href = `incident-detail.html?id=${id}`;
}

function applyFilters() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;

  const filtered = allIncidents.filter(inc => {
    const matchesSearch = inc.title.toLowerCase().includes(search);
    const matchesStatus = status ? inc.status === status : true;
    const matchesPriority = priority ? inc.priority === priority : true;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  renderTable(filtered);
}

async function loadDashboard() {
  const tbody = document.getElementById('incident-tbody');
  try {
    allIncidents = await api.getAll();
    renderStats(allIncidents);
    renderTable(allIncidents);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="no-data"><p>Database Connection Error</p></div></td></tr>`;
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  renderUserHeader();
  loadDashboard();
  document.getElementById('search-input').addEventListener('input', applyFilters);
  document.getElementById('filter-status').addEventListener('change', applyFilters);
  document.getElementById('filter-priority').addEventListener('change', applyFilters);
});