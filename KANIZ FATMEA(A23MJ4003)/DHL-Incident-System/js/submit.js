// =============================================
//  submit.js — New Incident Form Logic
// =============================================

let attachedFiles = []; // array of { name, type, size, content }
let tags = [];

// ─────────────────────────────────────────────
// FILE READING
// ─────────────────────────────────────────────

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read error'));

    reader.readAsText(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read error'));

    reader.readAsDataURL(file);
  });
}

async function processFile(file) {

  const ext = file.name.split('.').pop().toLowerCase();

  let content = '';

  if (['txt', 'csv', 'json', 'html', 'md'].includes(ext)) {

    content = await readFileAsText(file);

  } else {

    // PDF / DOCX / Images
    content = await readFileAsDataURL(file);

  }

  return {
    name: file.name,
    type: file.type || ext,
    size: file.size,
    ext: ext,
    content: content.substring(0, 5000)
  };
}

// ─────────────────────────────────────────────
// FILE UPLOAD UI
// ─────────────────────────────────────────────

function renderFileList() {

  const list = document.getElementById('file-list');

  if (attachedFiles.length === 0) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = attachedFiles.map((f, i) => `
    <div class="file-item">

      <span class="file-name">
        📎 ${f.name}

        <span style="color:var(--text-dim);font-size:11px;">
          (${(f.size / 1024).toFixed(1)} KB)
        </span>

      </span>

      <span
        class="file-remove"
        onclick="removeFile(${i})"
        title="Remove"
      >
        ✕
      </span>

    </div>
  `).join('');
}

function removeFile(idx) {

  attachedFiles.splice(idx, 1);

  renderFileList();
}

async function handleFiles(files) {

  const allowed = [
    'txt',
    'pdf',
    'docx',
    'doc',
    'jpg',
    'jpeg',
    'png',
    'csv',
    'json'
  ];

  for (const file of files) {

    const ext = file.name.split('.').pop().toLowerCase();

    if (!allowed.includes(ext)) {

      showAlert(`❌ File type .${ext} is not supported.`, 'danger');

      continue;
    }

    if (file.size > 10 * 1024 * 1024) {

      showAlert(`❌ ${file.name} is too large (max 10MB).`, 'danger');

      continue;
    }

    try {

      const processed = await processFile(file);

      attachedFiles.push(processed);

    } catch {

      showAlert(`⚠️ Could not read ${file.name}.`, 'warning');

    }
  }

  renderFileList();
}

// ─────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────

function renderTags() {

  const wrap = document.getElementById('tags-wrap');

  const input = document.getElementById('tags-input');

  wrap.querySelectorAll('.tag').forEach(t => t.remove());

  tags.forEach((tag, i) => {

    const chip = document.createElement('span');

    chip.className = 'tag';

    chip.innerHTML = `
      ${tag}

      <span
        style="cursor:pointer;margin-left:4px;"
        onclick="removeTag(${i})"
      >
        ✕
      </span>
    `;

    wrap.insertBefore(chip, input);

  });
}

function addTag(val) {

  const tag = val.trim().toLowerCase().replace(/\s+/g, '-');

  if (tag && !tags.includes(tag)) {

    tags.push(tag);

    renderTags();

  }
}

function removeTag(idx) {

  tags.splice(idx, 1);

  renderTags();
}

// ─────────────────────────────────────────────
// ALERT
// ─────────────────────────────────────────────

function showAlert(msg, type = 'info') {

  const el = document.getElementById('form-alert');

  el.className = `alert alert-${type}`;

  el.textContent = msg;

  el.style.display = 'block';

  el.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });

  setTimeout(() => {

    el.style.display = 'none';

  }, 5000);
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

function validateForm() {

  let valid = true;

  const fields = [
    'title',
    'description',
    'type',
    'priority',
    'department'
  ];

  fields.forEach(id => {

    const el = document.getElementById(id);

    const err = document.getElementById(`err-${id}`);

    if (!el || !err) return;

    if (!el.value.trim()) {

      err.classList.add('show');

      if (valid) el.focus();

      valid = false;

    } else {

      err.classList.remove('show');

    }
  });

  return valid;
}

// ─────────────────────────────────────────────
// SUBMIT FORM
// ─────────────────────────────────────────────

async function submitForm(e) {

  e.preventDefault();

  if (!validateForm()) return;

  const user = getCurrentUser();

  const now = new Date().toISOString();

  const incident = {

    title: document.getElementById('title').value.trim(),

    description: document.getElementById('description').value.trim(),

    type: document.getElementById('type').value,

    priority: document.getElementById('priority').value,

    department: document.getElementById('department').value.trim(),

    status: 'Draft',

    creator: user.username,

    creatorName: user.name,

    createdAt: now,

    updatedAt: now,

    tags: tags,

    attachments: attachedFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })),

    statusHistory: [
      {
        status: 'Draft',
        changedBy: user.username,
        changedAt: now,
        note: 'Incident created via web form'
      }
    ]
  };

  const btn = document.getElementById('submit-btn');

  btn.disabled = true;

  btn.textContent = 'Submitting...';

  try {

    const created = await api.create(incident);

    showAlert(
      `✅ Incident #INC-${String(created.id).padStart(4, '0')} created successfully!`,
      'success'
    );

    setTimeout(() => {

      window.location.href =
        `incident-detail.html?id=${created.id}`;

    }, 1500);

  } catch (err) {

    showAlert(
      '❌ Failed to submit incident.',
      'danger'
    );

    btn.disabled = false;

    btn.textContent = 'Submit Incident Report';

    console.error(err);
  }
}

// ─────────────────────────────────────────────
// AI SUGGESTIONS (LOCAL MOCK AI)
// ─────────────────────────────────────────────

async function getAISuggestions() {

  const title =
    document.getElementById('title').value.toLowerCase();

  const desc =
    document.getElementById('description').value.toLowerCase();

  if (!title && !desc) {

    showAlert(
      'Please enter a title or description first.',
      'warning'
    );

    return;
  }

  const btn = document.getElementById('ai-btn');

  btn.textContent = '🤖 Analysing...';

  btn.disabled = true;

  try {

    let suggestedType = 'complaint';

    let suggestedPriority = 'medium';

    let suggestedDepartment = 'Customer Service';

    let suggestedTags = [];

    const text = `${title} ${desc}`;

    // Late delivery
    if (
      text.includes('late') ||
      text.includes('delay') ||
      text.includes('not arrived')
    ) {

      suggestedType = 'late_delivery';

      suggestedPriority = 'high';

      suggestedDepartment = 'Delivery Operations';

      suggestedTags = [
        'delivery',
        'delay',
        'urgent'
      ];
    }

    // Damaged parcel
    else if (
      text.includes('damage') ||
      text.includes('broken') ||
      text.includes('crack')
    ) {

      suggestedType = 'damaged_parcel';

      suggestedPriority = 'high';

      suggestedDepartment = 'Warehouse';

      suggestedTags = [
        'damage',
        'parcel'
      ];
    }

    // Address issue
    else if (
      text.includes('address') ||
      text.includes('wrong location')
    ) {

      suggestedType = 'address_issue';

      suggestedDepartment = 'Logistics';

      suggestedTags = [
        'address'
      ];
    }

    // System issue
    else if (
      text.includes('system') ||
      text.includes('error') ||
      text.includes('website')
    ) {

      suggestedType = 'system_error';

      suggestedPriority = 'critical';

      suggestedDepartment = 'IT Operations';

      suggestedTags = [
        'system',
        'technical'
      ];
    }

    // Apply values
    document.getElementById('type').value =
      suggestedType;

    document.getElementById('priority').value =
      suggestedPriority;

    document.getElementById('department').value =
      suggestedDepartment;

    suggestedTags.forEach(tag => addTag(tag));

    showAlert(
      '🤖 AI suggestions generated successfully!',
      'success'
    );

  } catch (err) {

    console.error(err);

    showAlert(
      '❌ AI suggestion failed.',
      'danger'
    );

  } finally {

    btn.textContent = '🤖 AI Suggest';

    btn.disabled = false;
  }
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  const user = requireAuth();

  if (!user) return;

  renderUserHeader();

  // FILE DROP ZONE
  const dropZone = document.getElementById('drop-zone');

  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {

    e.preventDefault();

    dropZone.classList.add('drag-over');

  });

  dropZone.addEventListener('dragleave', () => {

    dropZone.classList.remove('drag-over');

  });

  dropZone.addEventListener('drop', (e) => {

    e.preventDefault();

    dropZone.classList.remove('drag-over');

    handleFiles(Array.from(e.dataTransfer.files));

  });

  fileInput.addEventListener('change', () => {

    handleFiles(Array.from(fileInput.files));

    fileInput.value = '';

  });

  // TAGS INPUT
  const tagsInput = document.getElementById('tags-input');

  tagsInput.addEventListener('keydown', (e) => {

    if (e.key === 'Enter' || e.key === ',') {

      e.preventDefault();

      addTag(tagsInput.value);

      tagsInput.value = '';

    }
  });

  tagsInput.addEventListener('blur', () => {

    if (tagsInput.value.trim()) {

      addTag(tagsInput.value);

      tagsInput.value = '';

    }
  });

  // SUBMIT
  document
    .getElementById('incident-form')
    .addEventListener('submit', submitForm);

  // AI BUTTON
  document
    .getElementById('ai-btn')
    ?.addEventListener('click', getAISuggestions);

  // CLEAR ERRORS
  [
    'title',
    'description',
    'type',
    'priority',
    'department'
  ].forEach(id => {

    const el = document.getElementById(id);

    if (el) {

      el.addEventListener('input', () => {

        document
          .getElementById(`err-${id}`)
          ?.classList.remove('show');

      });
    }
  });

});