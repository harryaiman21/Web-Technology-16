// =============================================
//  incident-detail.js — Incident detail page
// =============================================

let currentIncident = null;
let isEditing = false;

// ── Helpers ─────────────────────────────────

function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatType(type) {
  const map = {
    late_delivery:  'Late Delivery',
    address_issue:  'Address Issue',
    damaged_parcel: 'Damaged Parcel',
    system_error:   'System Error',
    complaint:      'Customer Complaint'
  };
  return map[type] || type;
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  return `<span class="badge badge-${s}" style="font-size:14px;padding:5px 14px;">${status}</span>`;
}

function priorityBadge(priority) {
  const p = (priority || '').toLowerCase();
  return `<span class="badge badge-${p}">${priority.toUpperCase()}</span>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ── Render ───────────────────────────────────

function renderIncident(inc) {
  currentIncident = inc;

  // Title
  document.getElementById('inc-title').textContent      = inc.title;
  document.getElementById('inc-id-label').textContent   = `#INC-${String(inc.id).padStart(4,'0')}`;
  document.title = `DHL | ${inc.title}`;

  // Meta row
  document.getElementById('inc-status-badge').innerHTML   = statusBadge(inc.status);
  document.getElementById('inc-priority-badge').innerHTML = priorityBadge(inc.priority);
  document.getElementById('inc-type-badge').innerHTML     = `<span class="badge-type">${formatType(inc.type)}</span>`;

  // Description
  document.getElementById('inc-description').textContent = inc.description || '—';

  // Tags
  const tagsEl = document.getElementById('inc-tags');
  tagsEl.innerHTML = (inc.tags && inc.tags.length)
    ? inc.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    : '<span style="color:var(--text-dim);font-size:13px;">No tags</span>';

  // Attachments
  const attEl = document.getElementById('inc-attachments');
  if (inc.attachments && inc.attachments.length) {
    attEl.innerHTML = inc.attachments.map(a => `
      <div class="attachment-item">
        <span class="file-icon">${fileIcon(a.name)}</span>
        <div class="file-info">
          <strong>${escapeHtml(a.name)}</strong>
          <span>${a.type || ''} · ${a.size ? (a.size/1024).toFixed(1)+' KB' : ''}</span>
        </div>
      </div>
    `).join('');
  } else {
    attEl.innerHTML = '<p style="color:var(--text-dim);font-size:13px;">No attachments</p>';
  }

  // Sidebar info
  document.getElementById('info-creator').textContent    = inc.creatorName || inc.creator || '—';
  document.getElementById('info-department').textContent = inc.department || '—';
  document.getElementById('info-created').textContent    = formatDateTime(inc.createdAt);
  document.getElementById('info-updated').textContent    = formatDateTime(inc.updatedAt);

  // Status history timeline
  renderTimeline(inc.statusHistory || []);

  // Status action buttons
  renderStatusActions(inc.status);
}

function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const map = { pdf: '📄', docx: '📝', doc: '📝', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', txt: '📃', csv: '📊' };
  return map[ext] || '📎';
}

function renderTimeline(history) {
  const el = document.getElementById('status-timeline');
  if (!history.length) {
    el.innerHTML = '<li class="timeline-item"><div class="timeline-note">No history yet</div></li>';
    return;
  }
  el.innerHTML = history.map(h => `
    <li class="timeline-item">
      <div class="timeline-dot ${h.status.toLowerCase()}"></div>
      <div class="timeline-status">${h.status}</div>
      <div class="timeline-note">${escapeHtml(h.note || '')}</div>
      <div class="timeline-time">by ${escapeHtml(h.changedBy)} · ${formatDateTime(h.changedAt)}</div>
    </li>
  `).join('');
}

function renderStatusActions(currentStatus) {
  const wrap = document.getElementById('status-actions');
  const transitions = {
    'Draft':    { next: 'Reviewed', label: 'Mark as Reviewed →',  cls: 'btn-primary' },
    'Reviewed': { next: 'Resolved', label: 'Mark as Resolved ✓',  cls: 'btn-success' },
    'Resolved': null
  };
  const t = transitions[currentStatus];

  let html = '';
  if (t) {
    html += `<button class="btn ${t.cls}" id="advance-btn" onclick="advanceStatus('${t.next}', '${t.label}')">
               ${t.label}
             </button>`;
  } else {
    html += `<div class="badge badge-resolved" style="padding:10px 16px;font-size:14px;">✓ Fully Resolved</div>`;
  }

  // Allow going back to Draft from Reviewed
  if (currentStatus === 'Reviewed') {
    html += `<button class="btn btn-ghost" onclick="advanceStatus('Draft','Revert to Draft')">← Revert to Draft</button>`;
  }

  wrap.innerHTML = html;
}

// ── Status Update ────────────────────────────

async function advanceStatus(newStatus, label) {
  const user = getCurrentUser();
  const note = prompt(`Add a note for this status change to "${newStatus}":`, '');
  if (note === null) return; // user cancelled

  const now = new Date().toISOString();
  const newHistory = [
    ...(currentIncident.statusHistory || []),
    { status: newStatus, changedBy: user.username, changedAt: now, note: note || 'Status updated' }
  ];

  const updated = {
    ...currentIncident,
    status: newStatus,
    updatedAt: now,
    statusHistory: newHistory
  };

  try {
    await api.update(currentIncident.id, updated);
    renderIncident(updated);
    showAlert(`✅ Status updated to "${newStatus}"`, 'success');
  } catch (err) {
    showAlert('❌ Failed to update status.', 'danger');
    console.error(err);
  }
}

// ── Edit Mode ────────────────────────────────

function enterEditMode() {
  isEditing = true;
  const inc = currentIncident;

  // Replace display elements with inputs
  document.getElementById('inc-title').innerHTML = `
    <input type="text" id="edit-title" value="${escapeHtml(inc.title)}"
      style="font-size:inherit;font-family:inherit;font-weight:800;width:100%;background:var(--surface2);border:1px solid var(--yellow);border-radius:6px;padding:6px 10px;color:var(--text);" />
  `;
  document.getElementById('inc-description').innerHTML = `
    <textarea id="edit-description" rows="6"
      style="width:100%;font-size:14px;resize:vertical;">${escapeHtml(inc.description)}</textarea>
  `;

  document.getElementById('edit-btn').style.display   = 'none';
  document.getElementById('save-btn').style.display   = 'inline-flex';
  document.getElementById('cancel-btn').style.display = 'inline-flex';
}

async function saveEdit() {
  const newTitle = document.getElementById('edit-title')?.value.trim();
  const newDesc  = document.getElementById('edit-description')?.value.trim();

  if (!newTitle) {
    showAlert('Title cannot be empty.', 'danger');
    return;
  }

  const updated = {
    ...currentIncident,
    title:       newTitle,
    description: newDesc,
    updatedAt:   new Date().toISOString()
  };

  try {
    await api.update(currentIncident.id, updated);
    isEditing = false;
    renderIncident(updated);
    showAlert('✅ Incident updated successfully.', 'success');
    document.getElementById('edit-btn').style.display   = 'inline-flex';
    document.getElementById('save-btn').style.display   = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
  } catch (err) {
    showAlert('❌ Failed to save changes.', 'danger');
    console.error(err);
  }
}

function cancelEdit() {
  isEditing = false;
  renderIncident(currentIncident);
  document.getElementById('edit-btn').style.display   = 'inline-flex';
  document.getElementById('save-btn').style.display   = 'none';
  document.getElementById('cancel-btn').style.display = 'none';
}

// ── Delete ───────────────────────────────────

function confirmDelete() {
  const modal = document.getElementById('delete-modal');
  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('delete-modal').classList.remove('open');
}

async function deleteIncident() {
  try {
    await api.remove(currentIncident.id);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showAlert('❌ Failed to delete incident.', 'danger');
    closeModal();
    console.error(err);
  }
}

// ── Alert ────────────────────────────────────

function showAlert(msg, type = 'info') {
  const el = document.getElementById('detail-alert');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ── Init ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  renderUserHeader();

  const id = getIdFromURL();
  if (!id) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Show loading state
  document.getElementById('inc-title').textContent = 'Loading…';

  try {
    const inc = await api.getById(id);
    renderIncident(inc);
  } catch (err) {
    document.getElementById('inc-title').textContent = 'Incident not found';
    showAlert('❌ Could not load incident. It may have been deleted.', 'danger');
    console.error(err);
  }

  // Attach edit/save/cancel buttons
  document.getElementById('edit-btn').addEventListener('click', enterEditMode);
  document.getElementById('save-btn').addEventListener('click', saveEdit);
  document.getElementById('cancel-btn').addEventListener('click', cancelEdit);
  document.getElementById('delete-btn').addEventListener('click', confirmDelete);
  document.getElementById('confirm-delete-btn').addEventListener('click', deleteIncident);
  document.getElementById('cancel-delete-btn').addEventListener('click', closeModal);

  // Close modal on overlay click
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
});
