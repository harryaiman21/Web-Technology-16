# ⬡ SOPify — Knowledge Base Automation System

> Transforms emails, documents, screenshots, and notes into raw text articles.

---

## 📺 Demo Video

> 🎬 **[Watch the full demo on YouTube](https://youtu.be/SOYdD0AbJ2U)**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Install Tesseract OCR](#2-install-tesseract-ocr-windows)
  - [3. Set up the backend](#3-set-up-the-backend)
  - [4. Set up the frontend](#4-set-up-the-frontend)
- [Running the App](#running-the-app)
- [Default Accounts](#default-accounts)
- [How to Use](#how-to-use)
  - [Uploading content](#uploading-content)
  - [Reviewing articles](#reviewing-articles)
  - [Searching and filtering](#searching-and-filtering)
- [Supported File Types](#supported-file-types)
- [Workflow](#workflow)
- [Troubleshooting](#troubleshooting)

---

## Overview

SOPify is a full-stack web application built for DHL Logistics Operations. It provides:

- A **multi-format upload console** that accepts text, documents, emails, and images
- **Tesseract OCR** for extracting text from screenshots and scanned images
- A **role-based editorial workflow** — Editors draft, Reviewers approve or reject
- A **searchable knowledge base** filterable by status, tag, date, and creator
- A full **audit trail** for every status change on every article

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy |
| OCR | Tesseract + pytesseract |
| Auth | JWT + passlib/bcrypt |
| File parsing | python-docx, extract-msg, pypdf |

---

## Project Structure

```
your-project/
  src/                        ← React frontend source
    pages/
      LoginPage.jsx
      UploadPage.jsx
      RecordsPage.jsx
      ArticlesPage.jsx
    api.js                    ← all API calls
    App.jsx
  backend/
    main.py                   ← FastAPI routes
    database.py               ← SQLAlchemy models
    auth.py                   ← JWT authentication
    ocr_service.py            ← Tesseract wrapper
    file_reader.py            ← DOCX, MSG, TXT parsers
    requirements.txt
  public/
  index.html
  package.json
  vite.config.js
  .gitignore
```

---

## Prerequisites

Make sure you have the following installed before proceeding:

- [Node.js](https://nodejs.org/) v18 or higher
- [Python](https://www.python.org/) 3.10 or higher
- [Git](https://git-scm.com/)
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) *(Windows installer)*

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/sopify.git
cd sopify
```

---

### 2. Install Tesseract OCR (Windows)

1. Download the installer from:
   **https://github.com/UB-Mannheim/tesseract/wiki**

2. Run the installer — keep the default path:
   ```
   C:\Program Files\Tesseract-OCR\tesseract.exe
   ```

3. Tick **"Add to PATH"** during installation

4. Verify it works — open Command Prompt and run:
   ```bash
   tesseract --version
   ```

> ⚠️ If you installed Tesseract to a different path, update this line in `backend/ocr_service.py`:
> ```python
> pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
> ```

---

### 3. Set up the backend

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

### 4. Set up the frontend

From the project root:

```bash
npm install
```

---

## Running the App

You need **two terminals** running at the same time.

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

You should see:
```
✓ Database tables ready
✓ Seeded: editor1 / editor123 · reviewer1 / reviewer123
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

> 💡 The SQLite database (`sop_system.db`) and `uploads/` folder are created automatically inside the `backend/` folder on first run.

---

## Default Accounts

Two accounts are seeded automatically on first startup:

| Username | Password | Role |
|---|---|---|
| `editor1` | `editor123` | Editor |
| `reviewer1` | `reviewer123` | Reviewer |

---

## How to Use

### Uploading content

1. Log in as **editor1**
2. Go to **Upload** in the sidebar
3. Choose a tab:
   - **Paste text** — paste any raw text (Teams message, email body, notes)
   - **Upload file** — drag and drop or browse for a file
4. Click **Save input →** or **Upload & run OCR →**
5. A Draft article is automatically created from your input

---

### Reviewing articles

1. Log in as **reviewer1**
2. Go to **Articles** in the sidebar
3. Click any article card to expand it
4. Use the action buttons to move the article through the workflow:
   - **Mark Reviewed** — article is verified, ready to publish
   - **Publish** — article is locked and published permanently
   - **Reject** — article is sent back as rejected
   - **Back to Draft** — returns article to draft without rejecting
5. Every action is logged in the status history with your username and timestamp

---

### Searching and filtering

On the **Articles** page:

| Filter | How to use |
|---|---|
| Search bar | Type any keyword — searches title, content, and tags |
| Status dropdown | Filter by Draft, Reviewed, or Published |
| Tag filter | Type a tag name |
| Date range | Pick a from and to date |

Click **✕ Clear** to reset all filters.

---

## Supported File Types

| Format | Extension | Method |
|---|---|---|
| Plain text | `.txt` | Direct read |
| Word document | `.docx` | python-docx paragraph extraction |
| Outlook email | `.msg` | extract-msg (subject, sender, body) |
| Image / screenshot | `.png` `.jpg` `.jpeg` `.webp` | Tesseract OCR |
| PDF | `.pdf` | pypdf text extraction |

---

## Workflow

```
Upload → Draft → Reviewed → Published (locked)
                    ↓
                Rejected → Draft (reopen)
```

| Transition | Who can do it |
|---|---|
| Draft → Reviewed | Reviewer |
| Draft → Rejected | Reviewer |
| Reviewed → Published | Reviewer |
| Rejected → Draft | Reviewer |

> 🔒 Published articles are permanently locked. No further edits are possible.

---

## Troubleshooting

**"Upload failed — is the backend running on port 8000?"**
→ Start the backend in Terminal 1 and make sure it shows `running on http://127.0.0.1:8000`

**"OCR failed — is Tesseract installed?"**
→ Verify Tesseract is installed and the path in `ocr_service.py` is correct

**Login returns 401 after navigating between pages**
→ Sign out and log back in — your token may have expired (8-hour limit)

**Articles page is empty after uploading**
→ Click the **↺ Refresh** button on the Articles page

**`bcrypt` error on startup**
→ Run: `pip uninstall bcrypt -y && pip install bcrypt==4.0.1`

**Port 8000 already in use**
→ Run: `netstat -ano | findstr :8000` then `taskkill /PID <pid> /F`

---

## License

This project was developed as part of a Software Engineering academic assignment.
