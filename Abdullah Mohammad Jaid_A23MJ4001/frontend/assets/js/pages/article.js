import { apiFetch } from "../api.js";
import { getCachedMe, getMe, logout, requireAuthOrRedirect } from "../auth.js";

requireAuthOrRedirect();

const titleEl = document.getElementById("title");
const badgeEl = document.getElementById("badge");
const metaEl = document.getElementById("meta");
const contentEl = document.getElementById("content");
const attachmentsEl = document.getElementById("attachments");
const revisionsEl = document.getElementById("revisions");
const errorEl = document.getElementById("error");

const editorEl = document.getElementById("editor");
const saveBtn = document.getElementById("saveBtn");
const saveStatusEl = document.getElementById("saveStatus");

const toReviewedBtn = document.getElementById("toReviewedBtn");
const toPublishedBtn = document.getElementById("toPublishedBtn");
const deleteBtn = document.getElementById("deleteBtn");

let currentRoles = null;
let currentArticle = null;

document.getElementById("logoutLink").addEventListener("click", async (e) => {
  e.preventDefault();
  await logout();
  window.location.href = "login.html";
});

const params = new URLSearchParams(window.location.search);
const articleId = params.get("id");
if (!articleId) {
  window.location.href = "viewer.html";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setEditorValues(article) {
  document.getElementById("editTitle").value = article.title || "";
  document.getElementById("editSummary").value = article.summary || "";
  document.getElementById("editSteps").value = article.steps || "";
  document.getElementById("editTags").value = article.tags || "";
}

function getEditorValues() {
  return {
    title: document.getElementById("editTitle").value.trim(),
    summary: document.getElementById("editSummary").value,
    steps: document.getElementById("editSteps").value,
    tags: document.getElementById("editTags").value,
  };
}

function renderAttachments(items) {
  attachmentsEl.innerHTML = "";
  for (const a of items) {
    const li = document.createElement("li");
    const url = a.file_url;

    const canDeleteAttachment =
      (currentRoles?.editor || currentRoles?.reviewer || currentRoles?.admin) &&
      (currentArticle?.status === "draft" || currentArticle?.status === "reviewed");

    li.innerHTML = `
      <div class="actions">
        <a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(a.original_name)}</a>
        <span class="small">${escapeHtml(a.content_type || "")}</span>
        ${canDeleteAttachment ? `<button class="danger" data-delete-attachment="${a.id}">Delete</button>` : ""}
      </div>
    `;
    attachmentsEl.appendChild(li);
  }
}

function renderRevisions(items) {
  revisionsEl.innerHTML = "";
  for (const r of items) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="actions">
        <span class="badge">${r.status}</span>
        <span class="small">${new Date(r.changed_at).toLocaleString()}</span>
        <span class="small">by ${escapeHtml(r.changed_by?.username || "?")}</span>
      </div>
      <div class="small">${escapeHtml(r.change_note || "")}</div>
    `;
    revisionsEl.appendChild(li);
  }
}

function configureActions({ article, roles }) {
  const canEdit = roles?.editor || roles?.reviewer || roles?.admin;
  const isDraftOrReviewed = article.status === "draft" || article.status === "reviewed";

  editorEl.style.display = canEdit && isDraftOrReviewed ? "block" : "none";
  toReviewedBtn.style.display = article.status === "draft" ? "inline-block" : "none";
  toPublishedBtn.style.display = article.status === "reviewed" && (roles?.reviewer || roles?.admin) ? "inline-block" : "none";

  // Keep delete conservative: allow deleting drafts only.
  deleteBtn.style.display = canEdit && article.status === "draft" ? "inline-block" : "none";
}

deleteBtn.addEventListener("click", async () => {
  errorEl.textContent = "";

  const ok = window.confirm("Delete this draft article? This cannot be undone.");
  if (!ok) return;

  try {
    await apiFetch(`/articles/${articleId}/`, { method: "DELETE" });
    window.location.href = "viewer.html";
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

async function transition(nextStatus) {
  errorEl.textContent = "";
  await apiFetch(`/articles/${articleId}/transition/`, {
    method: "POST",
    body: { status: nextStatus },
  });
  await load();
}

toReviewedBtn.addEventListener("click", () => transition("reviewed"));
toPublishedBtn.addEventListener("click", () => transition("published"));

saveBtn.addEventListener("click", async () => {
  errorEl.textContent = "";
  saveStatusEl.textContent = "Saving…";

  try {
    const payload = getEditorValues();
    await apiFetch(`/articles/${articleId}/`, { method: "PUT", body: payload });
    saveStatusEl.textContent = "Saved.";
    await load();
  } catch (err) {
    saveStatusEl.textContent = "";
    errorEl.textContent = err.message;
  }
});

async function load() {
  errorEl.textContent = "";

  const me = (await getMe()) || getCachedMe();
  const article = await apiFetch(`/articles/${articleId}/`);
  const revisions = await apiFetch(`/articles/${articleId}/revisions/`);
  const attachments = await apiFetch(`/articles/${articleId}/attachments/`);

  currentRoles = me?.roles || null;
  currentArticle = article || null;

  titleEl.textContent = article.title;
  badgeEl.textContent = article.status;
  metaEl.textContent = `Created by ${article.creator?.username || "?"} • Updated ${new Date(article.updated_at).toLocaleString()}`;
  contentEl.textContent = article.steps || "";

  setEditorValues(article);
  configureActions({ article, roles: me?.roles });

  renderRevisions(revisions || []);
  renderAttachments(attachments || []);
}

attachmentsEl.addEventListener("click", async (e) => {
  const btn = e.target?.closest?.("button[data-delete-attachment]");
  if (!btn) return;

  const attachmentId = btn.getAttribute("data-delete-attachment");
  if (!attachmentId) return;

  errorEl.textContent = "";
  const ok = window.confirm("Delete this attachment? This cannot be undone.");
  if (!ok) return;

  try {
    await apiFetch(`/attachments/${attachmentId}/`, { method: "DELETE" });
    await load();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

load().catch((err) => {
  errorEl.textContent = err.message;
});
