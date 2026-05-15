import { apiFetch } from "../api.js";
import { logout, requireAuthOrRedirect } from "../auth.js";

requireAuthOrRedirect();

const form = document.getElementById("draftForm");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const saveButton = form.querySelector('button[type="submit"]');

const titleEl = document.getElementById("title");
const summaryEl = document.getElementById("summary");
const stepsEl = document.getElementById("steps");
const tagsEl = document.getElementById("tags");
const filesEl = document.getElementById("files");
const aiHintEl = document.getElementById("aiHint");

let aiReady = false;

function getMode() {
  const selected = document.querySelector('input[name="mode"]:checked');
  return selected ? selected.value : "manual";
}

function setMode(mode) {
  const radio = document.querySelector(`input[name="mode"][value="${mode}"]`);
  if (radio) radio.checked = true;
  applyModeUI();
}

function setGenerating(isGenerating) {
  if (saveButton) saveButton.disabled = isGenerating;
  if (isGenerating) {
    titleEl.disabled = true;
    summaryEl.disabled = true;
    tagsEl.disabled = true;
  } else {
    const mode = getMode();
    if (mode === "ai") {
      // In AI mode, keep disabled until AI generation succeeds.
      titleEl.disabled = !aiReady;
      summaryEl.disabled = !aiReady;
      tagsEl.disabled = !aiReady;
    } else {
      titleEl.disabled = false;
      summaryEl.disabled = false;
      tagsEl.disabled = false;
    }
  }
}

function applyModeUI() {
  const mode = getMode();

  if (mode === "ai") {
    aiReady = false;
    aiHintEl.style.display = "block";
    filesEl.multiple = false;
    filesEl.accept = ".pdf,.docx,.txt,.png,.jpg,.jpeg";
    titleEl.disabled = true;
    summaryEl.disabled = true;
    tagsEl.disabled = true;
  } else {
    aiHintEl.style.display = "none";
    filesEl.multiple = true;
    filesEl.accept = ".pdf,.docx,.txt,.png,.jpg,.jpeg";
    titleEl.disabled = false;
    summaryEl.disabled = false;
    tagsEl.disabled = false;
  }
}

async function generateAIFromFile(file) {
  errorEl.textContent = "";
  statusEl.textContent = "Generating AI metadata…";
  setGenerating(true);

  try {
    const fd = new FormData();
    fd.append("file", file);

    const meta = await apiFetch("/articles/generate-metadata/", {
      method: "POST",
      body: fd,
      isMultipart: true,
    });

    titleEl.value = meta.title || "";
    summaryEl.value = meta.summary || "";
    const tags = Array.isArray(meta.tags) ? meta.tags : [];
    tagsEl.value = tags.join(",");

    statusEl.textContent = meta.warning
      ? `AI metadata generated (note: ${meta.warning}). You can review and edit before saving.`
      : "AI metadata generated. You can review and edit before saving.";
    aiReady = true;
    setGenerating(false);
  } catch (err) {
    const status = err?.status ? ` (HTTP ${err.status})` : "";
    const detail = err?.data?.error || err?.data?.detail || err?.message || "";
    const extra = detail ? `: ${detail}` : "";
    statusEl.textContent = "";
    setGenerating(false);

    // Friendly guidance for the most common issue: users selecting an image.
    if (err?.status === 400 && (err?.data?.error || "") === "Unsupported file type") {
      setMode("manual");
      errorEl.textContent = "AI Generate supports only TXT, PDF, or DOCX (no OCR for images). Switched to Manual Entry so you can upload images.";
      return;
    }

    setMode("manual");
    errorEl.textContent = `AI generation failed${status}${extra}. Try again or use manual entry.`;
  }
}

document.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.addEventListener("change", () => {
    // Reset file selection when switching modes to avoid accidental triggering.
    filesEl.value = "";
    errorEl.textContent = "";
    statusEl.textContent = "";
    applyModeUI();
  });
});

filesEl.addEventListener("change", async () => {
  const mode = getMode();
  if (mode !== "ai") return;

  const files = filesEl.files;
  if (!files || files.length !== 1) {
    errorEl.textContent = "In AI mode, please select exactly one TXT, PDF, or DOCX file.";
    return;
  }

  await generateAIFromFile(files[0]);
});

applyModeUI();

document.getElementById("logoutLink").addEventListener("click", async (e) => {
  e.preventDefault();
  await logout();
  window.location.href = "login.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  statusEl.textContent = "Saving…";

  const title = titleEl.value.trim();
  const summary = summaryEl.value;
  const steps = stepsEl.value;
  const tags = tagsEl.value;
  const files = filesEl.files;

  if (!title) {
    statusEl.textContent = "";
    errorEl.textContent = "Title is required.";
    return;
  }

  try {
    const article = await apiFetch("/articles/", {
      method: "POST",
      body: { title, summary, steps, tags, status: "draft" },
    });

    let combinedSteps = steps || "";
    const extractedBlocks = [];

    if (files && files.length) {
      for (const file of files) {
        statusEl.textContent = `Uploading ${file.name}…`;
        const fd = new FormData();
        fd.append("article", String(article.id));
        fd.append("file", file);
        const uploaded = await apiFetch("/attachments/", { method: "POST", body: fd, isMultipart: true });

        // Best-effort: extract text server-side for TXT/DOCX/PDF and append to article body.
        if (uploaded?.id) {
          try {
            statusEl.textContent = `Extracting text from ${file.name}…`;
            const extracted = await apiFetch(`/attachments/${uploaded.id}/extract-text/`, { method: "POST" });
            const text = (extracted?.text || "").trim();
            if (text) {
              extractedBlocks.push(`\n\n---\nExtracted from: ${file.name}\n\n${text}`);
            }
          } catch {
            // Ignore extraction failures; attachment upload still succeeds.
          }
        }
      }
    }

    if (extractedBlocks.length) {
      combinedSteps = `${combinedSteps}${extractedBlocks.join("")}`.trim();
      statusEl.textContent = "Updating article with extracted text…";
      await apiFetch(`/articles/${article.id}/`, {
        method: "PUT",
        body: { title, summary, steps: combinedSteps, tags, status: "draft" },
      });
    }

    statusEl.textContent = `Draft saved (ID ${article.id}).`;
    window.location.href = `article.html?id=${article.id}`;
  } catch (err) {
    statusEl.textContent = "";
    errorEl.textContent = err.message;
  }
});
