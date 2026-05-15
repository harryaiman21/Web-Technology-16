import { apiFetch } from "../api.js";
import { logout, requireAuthOrRedirect } from "../auth.js";

requireAuthOrRedirect();

const qEl = document.getElementById("q");
const creatorEl = document.getElementById("creator");
const statusEl = document.getElementById("status");
const tagEl = document.getElementById("tag");
const dateFieldEl = document.getElementById("dateField");
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const orderingEl = document.getElementById("ordering");
const resultsEl = document.getElementById("results");
const errorEl = document.getElementById("error");
const metaEl = document.getElementById("meta");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let currentPage = 1;
let hasNext = false;
let hasPrev = false;

document.getElementById("logoutLink").addEventListener("click", async (e) => {
  e.preventDefault();
  await logout();
  window.location.href = "login.html";
});

document.getElementById("searchBtn").addEventListener("click", resetAndSearch);

prevBtn.addEventListener("click", () => {
  if (!hasPrev) return;
  currentPage = Math.max(1, currentPage - 1);
  load();
});

nextBtn.addEventListener("click", () => {
  if (!hasNext) return;
  currentPage += 1;
  load();
});

function buildQuery() {
  const params = new URLSearchParams();
  if (qEl.value.trim()) params.set("q", qEl.value.trim());
  if (creatorEl.value.trim()) params.set("creator", creatorEl.value.trim());
  if (statusEl.value) params.set("status", statusEl.value);
  if (tagEl.value.trim()) params.set("tag", tagEl.value.trim());
  if (dateFieldEl?.value) params.set("date_field", dateFieldEl.value);
  if (fromEl.value) params.set("from", fromEl.value);
  if (toEl.value) params.set("to", toEl.value);
  params.set("ordering", orderingEl.value || "-updated_at");
  params.set("page", String(currentPage));
  return params.toString();
}

function render(items) {
  resultsEl.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="small">No results.</span>`;
    resultsEl.appendChild(li);
    return;
  }
  for (const a of items) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="actions">
        <a href="article.html?id=${a.id}">${escapeHtml(a.title)}</a>
        <span class="badge">${a.status}</span>
        <span class="small">by ${escapeHtml(a.creator?.username || "?")}</span>
      </div>
      <div class="small">Updated: ${new Date(a.updated_at).toLocaleString()}</div>
    `;
    resultsEl.appendChild(li);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function load() {
  errorEl.textContent = "";
  metaEl.textContent = "Loading…";
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  hasNext = false;
  hasPrev = false;

  try {
    const query = buildQuery();
    const data = await apiFetch(`/articles/?${query}`);
    render(data.results || []);
    hasNext = !!data.next;
    hasPrev = !!data.previous;
    prevBtn.disabled = !hasPrev;
    nextBtn.disabled = !hasNext;

    const shown = (data.results || []).length;
    const total = data.count ?? shown;
    metaEl.textContent = `Page ${currentPage} • Showing ${shown} of ${total}`;
  } catch (err) {
    metaEl.textContent = "";
    errorEl.textContent = err.message;
  }
}

function resetAndSearch() {
  currentPage = 1;
  load();
}

load();
