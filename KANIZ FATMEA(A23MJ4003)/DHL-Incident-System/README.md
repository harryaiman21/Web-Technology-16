# DHL Incident Reporting & Resolution System
## SECJ 3483 – Web Technology | Individual Assignment (Scenario 2)

---

## 📁 Project Structure

```
DHL-Incident-System/
├── index.html              ← Login page
├── dashboard.html          ← Main dashboard (view all incidents)
├── submit.html             ← Submit new incident report
├── incident-detail.html    ← View / edit / delete single incident
├── css/
│   └── style.css           ← All styling (DHL industrial dark theme)
├── js/
│   ├── api.js              ← All CRUD API functions (fetch calls)
│   ├── auth.js             ← Login / logout / session management
│   ├── dashboard.js        ← Dashboard logic + filtering
│   ├── submit.js           ← Form validation + file upload logic
│   └── incident-detail.js  ← Detail view + status update + edit/delete
└── db.json                 ← Mock database (used by JSON Server)
```

---

## ⚙️ How to Run — Step by Step

### Step 1: Install Node.js
Download and install from https://nodejs.org (LTS version recommended).
Verify: open Terminal/Command Prompt → type `node -v`

### Step 2: Open Terminal in the project folder
- On Windows: Open File Explorer → navigate to `DHL-Incident-System` → click address bar → type `cmd` → Enter
- On Mac: Right-click folder → Open Terminal Here

### Step 3: Start JSON Server (the backend)
```bash
npx json-server db.json --port 3000
```
You should see:
```
JSON Server started on PORT :3000
Press CTRL-C to quit

( ˶ˆ ᗜ ˆ˵ ) Resources:
http://localhost:3000/incidents
http://localhost:3000/users
```

### Step 4: Open the web app
Open `index.html` in your browser.
> ⚠️ Important: Use a browser that allows localhost fetch requests.
> If you get CORS errors, run a local server instead:
> ```bash
> npx serve .
> ```
> Then open http://localhost:3000 in your browser.

### Step 5: Log In
| Role     | Username   | Password    |
|----------|-----------|-------------|
| Admin    | `admin`    | `admin123`  |
| Reviewer | `reviewer` | `review123` |

---

## 🌐 API Endpoints (JSON Server)

| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| GET    | /incidents          | Get all incidents        |
| GET    | /incidents/:id      | Get single incident      |
| POST   | /incidents          | Create new incident      |
| PUT    | /incidents/:id      | Update incident (full)   |
| PATCH  | /incidents/:id      | Update incident (partial)|
| DELETE | /incidents/:id      | Delete incident          |
| GET    | /users              | Get all users            |

---

## ✅ Features Implemented

### Web Application
- [x] Secure login with session management
- [x] Dashboard with real-time stats (total, draft, reviewed, resolved, critical)
- [x] Search incidents by title, description, tags, department
- [x] Filter by status, priority, type, date
- [x] Submit incident with file upload (PDF, DOCX, images, text)
- [x] Tag system (add/remove tags)
- [x] Status workflow: Draft → Reviewed → Resolved (with history)
- [x] Edit incident title and description
- [x] Delete incident (with confirmation modal)
- [x] Status history timeline
- [x] Attachment metadata display
- [x] Responsive design

### API (via JSON Server)
- [x] GET all incidents
- [x] GET single incident by ID
- [x] POST — create new incident
- [x] PUT — update incident
- [x] DELETE — remove incident

### RPA (UiPath — separate component)
- Design UiPath workflow to:
  1. Monitor Google Drive folder for new files
  2. Check for duplicates (file hash)
  3. POST new incident to http://localhost:3000/incidents via HTTP Request activity
  4. Update status via PATCH
  5. Error handling with Try/Catch + screenshot
  6. Send summary email via SMTP

---

## 🛠️ Technology Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend  | JSON Server (mock REST API)            |
| Database | db.json                                |
| RPA      | UiPath Studio                          |
| Fonts    | Barlow Condensed + DM Sans (Google Fonts) |

---

## 👨‍💻 Student Info
- **Name**:KANIZ FATEMA (A23MJ4003)
- **Subject**: SECJ 3483 – Web Technology
- **Assignment**: Individual Assignment (Scenario 2)
- **Institution**: Universiti Teknologi Malaysia
