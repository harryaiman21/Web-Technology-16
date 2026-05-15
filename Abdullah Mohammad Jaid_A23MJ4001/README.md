# DHL Challenge – Knowledge Base Automation (Scenario 1)

Plain HTML/CSS/JS frontend + Django REST Framework backend for a Knowledge Base workflow (Draft → Reviewed → Published) with file uploads, search/filter viewer, and revision history.

Manual uploads can also do backend text extraction for TXT/DOCX and PDFs with a text layer (OCR for scanned PDFs/images is not included).

## Documentation

See `DOCUMENTATION.md` for full setup, API endpoints, and UiPath/RPA integration flow.

## Quick start (Windows PowerShell)

1. Create and activate venv
   - `python -m venv .venv`
   - `.\.venv\Scripts\Activate.ps1`

2. Install deps
   - `./.venv/Scripts/python.exe -m pip install -r requirements.txt`

3. Run backend
   - `cd backend`
   - `python manage.py migrate`
   - `python manage.py seed_demo`
   - (optional) `python manage.py createsuperuser`
   - `python manage.py runserver`

4. Open frontend
   - Serve it (recommended for ES modules):
     - `cd frontend`
   - `..\.venv\Scripts\python.exe -m http.server 5173`
     - Open `http://127.0.0.1:5173/login.html`

## AI Generate (DeepSeek)

The Upload Console supports an optional **AI Generate** mode that extracts text from a single **TXT/PDF/DOCX** file and calls DeepSeek to generate:
- Title (max ~10 words)
- Summary (1–2 sentences)
- 3–5 lowercase tags

To enable it, set `DEEPSEEK_API_KEY` before running the backend.

Recommended (local dev):
- Copy `.env.example` to `.env` and paste your key:
   - `Copy-Item .env.example .env`

Then set:
- `DEEPSEEK_API_KEY=...` inside `.env`

This project auto-loads `.env` on startup (and `.env` is gitignored).

> During development you may need to allow CORS (already planned in settings).

## Demo users

- `editor1` / `Password123!` (can create/edit drafts, submit for review)
- `reviewer1` / `Password123!` (can publish)
- `rpa_agent` / `Password123!` (superuser; intended for UiPath/RPA automation)

You can override seeded passwords when running `python manage.py seed_demo`:
- `DEMO_USERS_PASSWORD` (applies to editor1/reviewer1)
- `RPA_AGENT_PASSWORD` (applies to rpa_agent; falls back to `DEMO_USERS_PASSWORD`)
