# DOCUMENTATION — DHL Challenge (Scenario 1: Knowledge Base Automation)

This project implements **Scenario 1: AI-Powered Knowledge Base Automation** as:

- **Frontend**: plain **HTML/CSS/JavaScript** (no framework)
- **Backend**: **Django + Django REST Framework** (REST API)
- **Database**: **SQLite**
- **Auth**: **DRF Token Authentication** (UiPath-friendly)
- **Core workflow**: **Draft → Reviewed → Published** with **revision history** and **attachments**

The goal is to support both human editors/reviewers and an RPA bot (UiPath) that can ingest files, detect duplicates, create KB content, attach evidence files/screenshots, and update statuses.

---

## 1) Assignment requirements mapping (what is covered)

### Web frontend (mandatory)
- Interactive UI with event handling: implemented via page controllers in vanilla JS.
- JavaScript system logic: API client + auth + page controllers.
- Form input + validation: login form, create draft form.
- Navigation: Login / Viewer / Upload Console / Article Detail.

### Backend (mandatory)
- Database storage: SQLite used via Django ORM.
- CRUD via REST API:
  - Create/update/list/delete KB articles
  - Upload and list attachments
  - Revision history for versioning

### Functional requirements (mandatory)
- Secured access: token login.
- Upload console: draft creation + file upload (PDF/DOCX/TXT/PNG/JPG supported).
- Draft + status: draft articles, explicit status transitions.
- Viewer page: searchable and filterable by **tag, date, creator, status** (UI + API).
- Versioning: revisions are created automatically on create/update/transition.
- Creator details + basic login: creator stored; login implemented.

### RPA automation readiness (mandatory)
- API-based creation/update/status transitions and attachment upload supports UiPath.
- Duplicate check endpoint exists (14-day lookback).
- Error messages are JSON and stable.

> Note: UiPath workflow files are not included here (separate deliverable), but this documentation describes the expected API calls and sequence.

---

## 2) Tech stack

- Python 3.12
- Django 5.2
- Django REST Framework 3.17
- django-cors-headers (dev CORS)
- django-filter (filter backend installed; filtering is implemented primarily in code)
- requests (DeepSeek API client)

---

## 2.1) Configuration (environment variables)

AI metadata generation uses DeepSeek (OpenAI-compatible).

Required for AI features:
- `DEEPSEEK_API_KEY`

Optional:
- `DEEPSEEK_API_BASE_URL` (default `https://api.deepseek.com/v1`)

Local dev convenience:
- Create a `.env` file at repo root (copy from `.env.example`). The backend auto-loads it on startup.

How `.env` is loaded:
- On Django startup, the project tries to load variables from (in order):
   1) repo root `.env`
   2) `backend/.env`
- OS/shell environment variables still work and are not overridden by `.env`.

---

## 3) Repository structure

- `backend/`
  - Django project (`kbsite`) + app (`kb`)
  - REST API under `/api/`
  - SQLite database: `backend/db.sqlite3`
  - Upload storage: `backend/media/`
- `frontend/`
  - Static pages and assets
  - JS uses ES modules (must be served via HTTP in most browsers)

Key files:
- Backend settings: `backend/kbsite/settings.py`
- Backend routes: `backend/kbsite/urls.py`, `backend/kb/urls.py`
- API logic: `backend/kb/views.py`
- Data model: `backend/kb/models.py`
- Serializers: `backend/kb/serializers.py`
- Role helpers/permissions: `backend/kb/permissions.py`
- Frontend pages: `frontend/*.html`
- Frontend JS: `frontend/assets/js/*.js`

---

## 4) Setup & run (Windows PowerShell)

### 4.1 Install backend dependencies

From repo root:

1. Create venv
   - `python -m venv .venv`

2. Install packages
   - `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`

### 4.2 Initialize database and demo users

- `cd backend`
- `..\.venv\Scripts\python.exe manage.py migrate`
- `..\.venv\Scripts\python.exe manage.py seed_demo`

This creates:
- `editor1` / `Password123!`
- `reviewer1` / `Password123!`
- `rpa_agent` / `Password123!` (superuser; intended for UiPath/RPA automation)

Optional password overrides when running `seed_demo`:
- `DEMO_USERS_PASSWORD` (sets editor1/reviewer1 password)
- `RPA_AGENT_PASSWORD` (sets rpa_agent password; falls back to `DEMO_USERS_PASSWORD`)

Optional admin:
- `..\.venv\Scripts\python.exe manage.py createsuperuser`

### 4.3 Start backend server

- `..\.venv\Scripts\python.exe manage.py runserver`

Backend base URL:
- `http://127.0.0.1:8000/`

API base URL:
- `http://127.0.0.1:8000/api/`

### 4.4 Serve the frontend

Browsers block ES module imports (`type="module"`) when opening files directly from disk, so serve the frontend with a local HTTP server:

- `cd ..\frontend`
- `cd ..\frontend`
- `..\.venv\Scripts\python.exe -m http.server 5173`
- Open: `http://127.0.0.1:5173/login.html`

---

## 5) User roles and permissions

Roles are implemented using **Django Groups**:
- `editor`: can create/edit drafts and submit Draft → Reviewed
- `reviewer`: can publish Reviewed → Published
- `admin`: reserved; superusers/staff are treated as admin (and can do everything)

For RPA:
- Use the `rpa_agent` superuser for bot-driven ingestion flows (token auth via `/api/auth/login/`).
- In production, create a dedicated bot account with a rotated secret (avoid committing credentials).

Where roles matter:
- Publishing requires reviewer/admin.

How roles are created:
- Default groups are created after migrations via a `post_migrate` signal.

---

## 6) Data model (backend)

### 6.1 `KnowledgeArticle`
Represents the current "latest" article.

Fields:
- `title`: string
- `summary`: text
- `steps`: text (main body)
- `tags`: comma-separated string (simple filtering)
- `status`: `draft | reviewed | published`
- `creator`: user reference
- `created_at`, `updated_at`: timestamps

### 6.2 `ArticleRevision`
Stores version history snapshots. A new revision is created on:
- article create
- article update
- status transition

Fields:
- `article`: FK
- snapshot fields (`title`, `summary`, `steps`, `tags`, `status`)
- `changed_by`, `change_note`, `changed_at`

### 6.3 `Attachment`
Stores uploaded files and associates them to an article and (optionally) a revision.

Fields:
- `article`: FK
- `revision`: optional FK
- `file`: stored under `backend/media/attachments/...`
- `original_name`, `content_type`
- `uploaded_by`, `uploaded_at`

File restrictions:
- Allowed content types: PDF, DOCX, TXT, PNG, JPG/JPEG
- Max size: 10 MB

### 6.4 `IngestionRecord`
Stores a SHA-256 hash for duplicate detection (14 days).

Fields:
- `sha256`: 64-char hex
- `source_type`, `source_name` (optional metadata)
- `created_at`

---

## 7) API documentation

Base URL: `http://127.0.0.1:8000/api`

Authentication:
- Send header: `Authorization: Token <token>`

All `/api/` endpoints require authentication except:
- `POST /api/auth/login/`

All endpoints return JSON unless serving a file.

### 7.1 Auth endpoints

#### POST `/auth/login/`
Request JSON:
```json
{ "username": "editor1", "password": "Password123!" }
```
Response JSON:
```json
{
  "token": "...",
  "user": { "id": 1, "username": "editor1" },
  "roles": { "editor": true, "reviewer": false, "admin": false }
}
```

cURL:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"editor1\",\"password\":\"Password123!\"}"
```

PowerShell (recommended, avoids quoting issues):
```powershell
$base = "http://127.0.0.1:8000/api"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login/" -ContentType "application/json" -Body (@{
   username = "editor1"
   password = "Password123!"
} | ConvertTo-Json)

$token = $login.token
$headers = @{ Authorization = "Token $token" }
```

PowerShell using `curl.exe` (note: `curl` is an alias in PowerShell):
```powershell
$base = "http://127.0.0.1:8000/api"
$resp = curl.exe -s -X POST "$base/auth/login/" -H "Content-Type: application/json" -d "{\"username\":\"editor1\",\"password\":\"Password123!\"}"
$token = ( $resp | ConvertFrom-Json ).token
```

#### POST `/auth/logout/`
Deletes the token for the current user.

Example:
```powershell
Invoke-RestMethod -Method Post -Uri "$base/auth/logout/" -Headers $headers
```

#### GET `/auth/me/`
Returns user + roles.

Example:
```powershell
Invoke-RestMethod -Method Get -Uri "$base/auth/me/" -Headers $headers
```

---

### 7.2 Articles endpoints

#### GET `/articles/`
Lists articles (paginated).

Query params:
- `q`: search in title/summary/steps
- `status`: `draft|reviewed|published`
- `tag`: substring match in comma-separated tags
- `creator`: substring match on username
- `date_field`: `updated_at` (default) or `created_at` (applies to `from`/`to`)
- `from`: ISO datetime or date (filters by `<date_field> >= from`)
- `to`: ISO datetime or date (filters by `<date_field> <= to`)
- `ordering`: one of `updated_at,-updated_at,created_at,-created_at,title,-title`

Response JSON:
```json
{ "count": 1, "next": null, "previous": null, "results": [ /* articles */ ] }
```

Example:
```powershell
Invoke-RestMethod -Method Get -Uri "$base/articles/?q=scanner&status=draft&ordering=-updated_at&page=1" -Headers $headers
```

#### POST `/articles/`
Create a new article.

Request JSON:
```json
{ "title": "How to reset scanner", "summary": "...", "steps": "Step 1...", "tags": "warehouse,scanner" }
```

Response JSON: the created article.

Example:
```powershell
$article = Invoke-RestMethod -Method Post -Uri "$base/articles/" -Headers $headers -ContentType "application/json" -Body (@{
   title = "How to reset scanner"
   summary = "Quick reset procedure"
   steps = "1) ...\n2) ..."
   tags = "warehouse,scanner"
   status = "draft"
} | ConvertTo-Json)
```

#### POST `/articles/generate-metadata/`
Generate title/summary/tags from an uploaded TXT/PDF/DOCX file.

Auth:
- Required (Token)

Request:
- `multipart/form-data` with field `file`

Response JSON:
```json
{ "title": "...", "summary": "...", "tags": ["tag1", "tag2", "tag3"] }
```

Errors:
- `400` `{ "error": "Unsupported file type" }`
- `500` `{ "error": "Text extraction failed" }`
- `500` `{ "error": "AI generation failed" }`

Example (`curl.exe`, multipart upload):
```powershell
curl.exe -s -X POST "$base/articles/generate-metadata/" \
   -H "Authorization: Token $token" \
   -F "file=@C:\\path\\to\\doc.pdf;type=application/pdf"
```

#### POST `/articles/?ai_generated=true`
RPA-friendly variant of article creation: uploads a TXT/PDF/DOCX file, performs extraction → AI generation, and creates a draft article automatically.

Auth:
- Required (Token)

Request:
- `multipart/form-data`
- Required field: `file`
- Optional fields: `steps`, `status` (defaults to `draft`)

Behavior:
- Creates the article with AI-generated `title`, `summary`, and `tags`
- Attaches the uploaded file to the article automatically

Example (`curl.exe`, multipart upload):
```powershell
curl.exe -s -X POST "$base/articles/?ai_generated=true" \
   -H "Authorization: Token $token" \
   -F "file=@C:\\path\\to\\notes.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
   -F "status=draft"
```

#### GET `/articles/{id}/`
Fetch one article.

Example:
```powershell
Invoke-RestMethod -Method Get -Uri "$base/articles/$($article.id)/" -Headers $headers
```

#### PUT `/articles/{id}/`
Update article fields (creates a revision automatically).

Example:
```powershell
Invoke-RestMethod -Method Put -Uri "$base/articles/$($article.id)/" -Headers $headers -ContentType "application/json" -Body (@{
   title = $article.title
   summary = $article.summary
   steps = ($article.steps + "\n\nExtra note")
   tags = $article.tags
   status = "draft"
} | ConvertTo-Json)
```

#### DELETE `/articles/{id}/`
Delete article.

Example:
```powershell
Invoke-RestMethod -Method Delete -Uri "$base/articles/$($article.id)/" -Headers $headers
```

---

### 7.3 Workflow: status transitions

#### POST `/articles/{id}/transition/`
Request JSON:
```json
{ "status": "reviewed" }
```
Valid transitions:
- `draft` → `reviewed`
- `reviewed` → `published`

Permissions:
- Only reviewer/admin can publish.

Response JSON: updated article.

Examples:
```powershell
# Draft -> Reviewed
Invoke-RestMethod -Method Post -Uri "$base/articles/$($article.id)/transition/" -Headers $headers -ContentType "application/json" -Body (@{ status = "reviewed" } | ConvertTo-Json)

# Reviewed -> Published (must be reviewer/admin)
Invoke-RestMethod -Method Post -Uri "$base/articles/$($article.id)/transition/" -Headers $headers -ContentType "application/json" -Body (@{ status = "published" } | ConvertTo-Json)
```

---

### 7.4 Version history

#### GET `/articles/{id}/revisions/`
Returns array of `ArticleRevision` (newest first).

Example:
```powershell
Invoke-RestMethod -Method Get -Uri "$base/articles/$($article.id)/revisions/" -Headers $headers
```

---

### 7.5 Attachments

#### GET `/articles/{id}/attachments/`
Returns array of attachments for the article.

Example:
```powershell
Invoke-RestMethod -Method Get -Uri "$base/articles/$($article.id)/attachments/" -Headers $headers
```

#### POST `/attachments/`
Multipart form upload.

Form fields:
- `article`: article id
- `revision`: optional revision id
- `file`: file blob

Example (PowerShell):
- Use the frontend upload form, or a tool like Postman.

Example (`curl.exe`, multipart upload):
```powershell
curl.exe -s -X POST "$base/attachments/" \
   -H "Authorization: Token $token" \
   -F "article=$($article.id)" \
   -F "file=@C:\\path\\to\\evidence.png;type=image/png"
```

#### GET `/attachments/?article={id}`
Lists attachments, optionally filtered by article.

Example:
```powershell
Invoke-RestMethod -Method Get -Uri "$base/attachments/?article=$($article.id)" -Headers $headers
```

#### POST `/attachments/{id}/extract-text/`
Best-effort server-side text extraction for a single attachment.

Supported extraction formats:
- TXT
- DOCX
- PDF (text layer only)

Notes:
- If extraction fails or the file has no extractable text, the returned `text` may be an empty string.
- OCR for scanned PDFs/images is not implemented.

Response JSON:
```json
{ "id": 123, "text": "..." }
```

Example:
```powershell
$attachments = Invoke-RestMethod -Method Get -Uri "$base/attachments/?article=$($article.id)" -Headers $headers
if ($attachments.Count -gt 0) {
   Invoke-RestMethod -Method Post -Uri "$base/attachments/$($attachments[0].id)/extract-text/" -Headers $headers
}
```

---

### 7.6 Duplicate checking

#### POST `/duplicate-check/`
Request JSON (either):
```json
{ "text": "some raw text" }
```
OR
```json
{ "sha256": "<64-char hash>" }
```

Response JSON:
```json
{ "sha256": "...", "duplicate": false }
```

Example:
```powershell
Invoke-RestMethod -Method Post -Uri "$base/duplicate-check/" -Headers $headers -ContentType "application/json" -Body (@{ text = "some raw text" } | ConvertTo-Json)
```

---

### 7.7 Ingestions (duplicate audit trail)

The ingestion table is a simple API-friendly log for "this item was processed".

#### GET `/ingestions/`
Lists ingestion records (paginated).

#### POST `/ingestions/`
Creates a record.

Request JSON:
```json
{ "sha256": "<64-char hash>", "source_type": "drive", "source_name": "folder/file.pdf" }
```

Example:
```powershell
Invoke-RestMethod -Method Post -Uri "$base/ingestions/" -Headers $headers -ContentType "application/json" -Body (@{
   sha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
   source_type = "drive"
   source_name = "demo-inputs/invoice.pdf"
} | ConvertTo-Json)
```

#### GET `/ingestions/{id}/`
Fetch one ingestion record.

#### DELETE `/ingestions/{id}/`
Delete a record.

---

## 8) Frontend documentation

Frontend is intentionally minimal and readable:
- `assets/js/api.js`: fetch wrapper + token header
- `assets/js/auth.js`: login/logout/me helpers
- `assets/js/pages/*.js`: one controller per page

### Pages

1. `login.html`
- Logs in using `/api/auth/login/`
- Stores token in `localStorage`

UI elements:
- `form#loginForm`
- `input#username`, `input#password`
- Submit button (Login)
- `span#error` shows server/client errors

Behavior:
- On submit: calls `POST /api/auth/login/`.
- On success: redirects to `viewer.html`.

2. `viewer.html`
- Calls `/api/articles/` with query params `q`, `status`, `tag`, `creator`, `date_field`, `from`, `to`, `ordering`, `page`
- Click a result to open `article.html?id=<id>`

Pagination:
- Uses simple Prev/Next buttons (DRF pagination).

UI elements:
- Filters:
   - `input#q`, `input#creator`, `select#status`, `input#tag`
   - `select#dateField`, `input#from`, `input#to`, `select#ordering`
- Actions:
   - `button#searchBtn` resets to page 1
   - `button#prevBtn`, `button#nextBtn` move pages
- Output:
   - `ul#results` (links to `article.html?id=<id>`)
   - `span#meta` shows page + count
   - `span#error` shows request errors

API calls:
- `GET /api/articles/?...` (includes `page`, filter params, ordering)

3. `upload.html`
- Creates a Draft via `POST /api/articles/`
- Uploads each selected file via `POST /api/attachments/` (multipart)

AI metadata generation mode:
- The page provides a **Mode** selector (styled as square tickboxes) with:
   - Manual Entry
   - AI Generate (TXT/PDF/DOCX)
- In **AI Generate** mode:
   - Attachments input is restricted to exactly **one** file and only **TXT/PDF/DOCX**.
   - When a file is selected, the frontend immediately calls:
      - `POST /api/articles/generate-metadata/` (multipart `file`)
   - While waiting:
      - UI shows "Generating AI metadata…"
      - Title/Summary/Tags are disabled
   - On success:
      - Title/Summary/Tags are populated
      - Those fields become editable so the user can review/tweak
   - On failure:
      - A user-friendly error is shown (includes HTTP status + backend detail in dev)
      - The UI switches back to Manual Entry

AI-supported files:
- Only TXT/PDF/DOCX are supported for AI extraction and metadata generation.
- Images (PNG/JPG) can still be uploaded in Manual mode, but AI generation will not run on them.

Manual text extraction (no RPA required):
- After uploading each attachment, the frontend calls `POST /api/attachments/{id}/extract-text/`.
- If the backend can extract text (TXT/DOCX/PDF with a text layer), it appends it into the article `steps` field under an "Extracted from: …" block.
- OCR for scanned PDFs/images is not implemented in the web app (use UiPath OCR if needed).

UI elements:
- Mode selector:
   - `input[name="mode"][value="manual"]`
   - `input[name="mode"][value="ai"]`
   - Styled using `.mode-option` + `.mode-tick` classes
- Draft form:
   - `form#draftForm`
   - `input#title`, `textarea#summary`, `textarea#steps`, `input#tags`
   - `input#files` (manual: multiple; AI: single)
   - `div#aiHint` help text shown only in AI mode
- Status/error:
   - `span#status` for progress messages
   - `span#error` for validation/API failures

API calls (Manual Entry):
1) `POST /api/articles/` (creates draft)
2) For each selected file: `POST /api/attachments/` (multipart)
3) For each uploaded attachment: `POST /api/attachments/{id}/extract-text/` (best-effort)
4) If any extracted text exists: `PUT /api/articles/{id}/` (append extracted blocks)

API calls (AI Generate):
- On file selection: `POST /api/articles/generate-metadata/` (multipart)
- User still clicks "Save Draft", which then calls `POST /api/articles/` with generated fields.

4. `article.html`
- Loads article details, attachments, revisions
- Allows editing via `PUT /api/articles/{id}/`
- Allows transitions via `POST /api/articles/{id}/transition/`

UI elements:
- Header:
   - `h1#title`, `span#badge`, `p#meta`
- Editor (shown only when allowed by role and status):
   - `div#editor`
   - `input#editTitle`, `textarea#editSummary`, `textarea#editSteps`, `input#editTags`
   - `button#saveBtn`, `span#saveStatus`
- Workflow:
   - `button#toReviewedBtn` (Draft → Reviewed)
   - `button#toPublishedBtn` (Reviewed → Published; reviewer/admin only)
   - `span#error`
- Content:
   - `pre#content`
- Attachments & revisions:
   - `ul#attachments`, `ul#revisions`

API calls:
- `GET /api/articles/{id}/`
- `GET /api/articles/{id}/revisions/`
- `GET /api/articles/{id}/attachments/`
- `PUT /api/articles/{id}/` (Save)
- `POST /api/articles/{id}/transition/` (status changes)

---

## 9) UiPath (RPA) Integration Guide

This section describes the UiPath RPA automation workflow (`Main.xaml`) that automates the KB ingestion pipeline using browser-based UI automation.

### 9.1 Automation Workflow Overview

The `Main.xaml` UiPath workflow automates the entire KB ingestion pipeline:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN SEQUENCE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Variables]                                                        │
│   • files (String[])        – List of file paths from input folder  │
│   • totalFiles (Int32)      – Total file count                      │
│   • createdCount (Int32)    – Successfully created articles         │
│   • failedCount (Int32)     – Failed attempts                       │
│   • fileName (String)       – Current file name                     │
│   • fileTitle (String)      – Current file name without extension   │
│   • ext (String)            – Current file extension (lowercase)    │
│   • useAI (Boolean)         – Whether to use AI mode for this file  │
│   • retry (Int32)           – Retry counter for AI wait loop        │
│   • resultExists (Boolean)  – AI metadata generation success flag   │
│   • aiFailedExists (Boolean)– AI metadata generation failure flag   │
│   • uploadUrl (String)      – http://127.0.0.1:5173/upload.html     │
│   • viewerUrl (String)      – http://127.0.0.1:5173/viewer.html     │
│   • loginUrl (String)       – http://127.0.0.1:5173/login.html      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 1: Read Input Files                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Assign: files = Directory.GetFiles(                           │   │
│  │   "C:\Users\jaid2\OneDrive\Documents\UiPath\Input")          │   │
│  │ Assign: totalFiles = files.Length                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 2: Open Chrome & Login                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ NApplicationCard "Chrome KB Login"                           │   │
│  │   • Opens Chrome at loginUrl                                 │   │
│  │   • Maximizes window                                         │   │
│  │   • InteractionMode: DebuggerApi                             │   │
│  │   • OpenMode: Always                                         │   │
│  │                                                              │   │
│  │   Inside "Do" Sequence:                                      │   │
│  │   ├─ NTypeInto "Type Into 'Username'" → "rpa_agent"          │   │
│  │   ├─ NTypeInto "Type Into 'Password'" → "Password123!"       │   │
│  │   ├─ NClick "Click 'Login'"                                  │   │
│  │   └─ Delay 2 seconds                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 3: Process Each File (For Each loop)                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ For Each filePath in files                                    │   │
│  │ ┌────────────────────────────────────────────────────────┐   │   │
│  │ │ Try Catch (per-file error handling)                    │   │   │
│  │ │                                                        │   │   │
│  │ │ TRY:                                                    │   │   │
│  │ │  ├─ Extract file metadata (fileName, fileTitle, ext)    │   │   │
│  │ │  ├─ Determine useAI:                                    │   │   │
│  │ │  │   useAI = {".txt",".pdf",".docx",".png",".jpg",     │   │   │
│  │ │  │            ".jpeg"}.Contains(ext)                    │   │   │
│  │ │  ├─ Navigate to uploadUrl                               │   │   │
│  │ │  ├─ Delay 3 seconds                                     │   │   │
│  │ │  │                                                      │   │   │
│  │ │  └─ IF useAI == True:                                   │   │   │
│  │ │     ┌──────────────────────────────────────────────┐   │   │   │
│  │ │     │ AI MODE PATH                                  │   │   │   │
│  │ │     │ 1. Click file input to open file dialog       │   │   │   │
│  │ │     │ 2. NApplicationCard "Open" dialog:            │   │   │   │
│  │ │     │    a. Type file path into filename field      │   │   │   │
│  │ │     │    b. Click "Open" button                     │   │   │   │
│  │ │     │ 3. Click "Save Draft" button                  │   │   │   │
│  │ │     │ 4. Click "Submit for Review" button           │   │   │   │
│  │ │     │ 5. Reset retry = 0                            │   │   │   │
│  │ │     │ 6. Delay 15 seconds (wait for AI processing)  │   │   │   │
│  │ │     └──────────────────────────────────────────────┘   │   │   │
│  │ │                                                        │   │   │
│  │ │     IF useAI == False:                                 │   │   │
│  │ │     ┌──────────────────────────────────────────────┐   │   │   │
│  │ │     │ MANUAL MODE PATH                              │   │   │   │
│  │ │     │ 1. Click "Manual Entry" radio button          │   │   │   │
│  │ │     │   (Selects manual mode on the upload page)    │   │   │   │
│  │ │     └──────────────────────────────────────────────┘   │   │   │
│  │ │                                                        │   │   │
│  │ │ CATCH (Exception):                                     │   │   │
│  │ │  ├─ Increment failedCount                              │   │   │
│  │ │  └─ Take Screenshot (for debugging)                    │   │   │
│  │ │                                                        │   │   │
│  │ │ FINALLY: (empty)                                       │   │   │
│  │ └────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 4: Send Summary Email                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ SendMail (SMTP)                                              │   │
│  │   • Action: Forward                                          │   │
│  │   • To: jaid2016k@gmail.com                                  │   │
│  │   • Subject: "DHL RPA Summary – {yyyy-MM-dd}"               │   │
│  │   • Body: "Total: {totalFiles} | Created: {createdCount}     │   │
│  │            | Failed: {failedCount}"                          │   │
│  │   • ConnectionMode: Integration Service                      │   │
│  │   • ContinueOnError: True                                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Main.xaml – Detailed Activity Breakdown

#### Variables

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `resultExists` | Boolean | – | Flag for AI metadata success |
| `aiFailedExists` | Boolean | – | Flag for AI metadata failure |
| `useAI` | Boolean | – | Whether current file uses AI mode |
| `ext` | String | – | File extension (lowercase) |
| `fileName` | String | – | File name with extension |
| `fileTitle` | String | – | File name without extension |
| `files` | String[] | – | Array of file paths from input folder |
| `uploadUrl` | String | `http://127.0.0.1:5173/upload.html` | Upload console URL |
| `viewerUrl` | String | `http://127.0.0.1:5173/viewer.html` | Viewer URL |
| `loginUrl` | String | `http://127.0.0.1:5173/login.html` | Login URL |
| `retry` | Int32 | 0 | Retry counter for AI wait |
| `failedCount` | Int32 | 0 | Count of failed file processing |
| `createdCount` | Int32 | 0 | Count of successfully created articles |
| `totalFiles` | Int32 | 0 | Total number of files to process |

#### Activity Sequence

1. **Assign (Assign_1)** – Read all files from input directory:
   ```
   files = Directory.GetFiles("C:\Users\jaid2\OneDrive\Documents\UiPath\Input")
   ```

2. **Assign (Assign_2)** – Calculate total file count:
   ```
   totalFiles = If(files Is Nothing, 0, files.Length)
   ```

3. **NApplicationCard "Chrome KB Login"** – Opens Chrome and performs login:
   - **NTypeInto (NTypeInto_1)** – Types `rpa_agent` into the Username field
   - **NTypeInto (NTypeInto_2)** – Types `Password123!` into the Password field
   - **NClick (NClick_1)** – Clicks the Login button
   - **Delay (Delay_1)** – Waits 2 seconds for login to complete

4. **ForEach (ForEach`1_1)** – Iterates over each file path:
   - **TryCatch (TryCatch_1)** – Wraps per-file processing for error resilience
     - **TRY:**
       - **Assign (Assign_3)** – Extract file name: `fileName = Path.GetFileName(filePath)`
       - **Assign (Assign_4)** – Extract file title: `fileTitle = Path.GetFileNameWithoutExtension(filePath)`
       - **Assign (Assign_5)** – Extract extension: `ext = Path.GetExtension(filePath).ToLowerInvariant()`
       - **Assign (Assign_6)** – Determine AI mode:
         ```
        