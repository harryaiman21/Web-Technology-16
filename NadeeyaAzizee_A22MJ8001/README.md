# AI-Enhanced Incident Reporting System

A full-stack incident management demo: REST API (JSON Server + Express), optional Ollama for AI assist, and a React web UI for creating, viewing, and editing incidents.

**Disclaimer — AI features:** Install **[Ollama](https://ollama.com)** from the official site and run it locally before using AI in the app (auto-categorise, summaries, tag/priority suggestions, bulk “Ollama AI” actions, and `GET /llm/health`). The backend expects Ollama at `OLLAMA_URL` (default `http://localhost:11434`) and a **pulled model** matching `OLLAMA_MODEL` in `backend/server.js` (default **`llama3.2:3b`** — run `ollama pull llama3.2:3b`, or set `OLLAMA_MODEL` to another model you have installed). Incident CRUD and the rest of the UI work without Ollama; only the AI-assisted paths need Ollama and the model.

## Demo video

Walkthrough of the web app, Ollama AI features, and UiPath email-to-incident flow:

**[Watch on YouTube](https://youtu.be/jnsQm1D5z5k?si=1m6RHyiHfkyYjcYH)**


## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React frontend (browser)                                   │
│  ├─ Login (mock session)                                    │
│  ├─ Upload / create incidents                              │
│  ├─ Viewer (search, filter, bulk actions)                  │
│  └─ Detail (edit, save)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │  HTTP (see frontend/vite.config proxy)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (Node): Express + JSON Server                      │
│  ├─ GET/POST/PATCH/DELETE /incidents, /users, …             │
│  ├─ POST /upload, /incident/classify, GET /llm/health      │
│  └─ db.json persistence                                     │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
DHLWebTech2026/
├── backend/
│   ├── db.json                 # Sample data & database
│   ├── package.json            # Dependencies
│   └── README.md               # Backend setup guide
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # Authentication
│   │   │   ├── UploadConsole.jsx   # Create incidents
│   │   │   ├── ViewerPage.jsx      # List & filter
│   │   │   └── IncidentDetailPage.jsx  # View/edit
│   │   ├── hooks/
│   │   │   └── useAuth.js          # Auth logic
│   │   ├── utils/
│   │   │   └── api.js              # API client
│   │   ├── App.jsx             # Main app
│   │   ├── main.jsx            # Entry point
│   │   ├── App.css
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js          # Vite config
│   ├── package.json            # Dependencies
│   └── README.md               # Frontend setup guide
├── uipath/
│   ├── Main.xaml               # Email → incident automation (entry point)
│   ├── POST.xaml               # HTTP POST helper workflow
│   └── project.json            # UiPath project metadata
└── README.md                   # This file
```

## UiPath automation (`uipath/`)

The `uipath/` folder contains a UiPath project that reads customer emails (IMAP) and creates incidents via the backend API.

**Secrets and configuration are not stored in the XAML files.** At runtime the robot loads everything from **UiPath Orchestrator** (folder: `DHLIncidentTracking`): **Get Credential** supplies the IMAP **username** and **password**; **Get Asset** supplies **`IncidentApiBaseUrl`** (the backend base URL for posting incidents). Configure both in Orchestrator before running the robot:

| Orchestrator asset / credential | Type | Used for |
|---------------------------------|------|----------|
| `Gmail_IMAP_Credential` | Credential | IMAP email username and password |
| `IncidentApiBaseUrl` | Text asset | Base URL for `POST /incidents` (e.g. `http://localhost:3000`) |

Open the project in **UiPath Studio**, connect to your Orchestrator tenant, and ensure the robot has access to that folder. Do not commit real credentials to the repository.

## Quick Start

### 1. Backend (JSON Server)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start server (runs on http://localhost:3000)
npm start
```

### 2. Frontend (React)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server (runs on http://localhost:3001)
npm run dev
```

### 3. Access Application

- **Frontend**: http://localhost:3001
- **API**: http://localhost:3000
- **Credentials**: Any username (e.g., "admin", "john.doe")

## Features

### Frontend

#### 1. **Login Page**
- Simple mock authentication
- Stores user in localStorage
- Demo accounts: admin, john.doe

#### 2. **Upload Console**
- Create new incidents with:
  - Title & description
  - Tags (comma-separated)
  - File attachments
- Automatic draft saving
- Duplicate detection (MD5 hash)
- Real-time validation

#### 3. **Viewer Page**
- List all incidents in table format
- **Search**: By title/description
- **Filter**: By status or tags
- **Sort**: By date, status, etc.
- Refresh button to sync data

#### 4. **Incident Detail Page**
- Full incident information
- Status history tracking
- Edit description
- Change status:
  - Draft → Reviewed → Published
- View attachments
- Metadata display

### Backend (API)

#### Data Model
```json
{
  "id": "INC1714927200000",
  "title": "Server Down",
  "description": "Production down for 45 mins",
  "tags": ["critical", "production"],
  "status": "Draft|Reviewed|Published",
  "createdBy": "admin",
  "createdAt": "2026-05-01T02:15:00Z",
  "attachments": [
    {
      "name": "error_log.txt",
      "url": "/attachments/error_log.txt",
      "type": "text/plain"
    }
  ],
  "hash": "a1b2c3d4e5f6g7h8",
  "history": [
    {
      "status": "Draft",
      "date": "2026-05-01T02:15:00Z"
    }
  ]
}
```

#### Endpoints
- `GET /incidents` - List all
- `GET /incidents/:id` - Get by ID
- `POST /incidents` - Create new
- `PATCH /incidents/:id` - Update
- `DELETE /incidents/:id` - Delete
- `GET /users` - List users

## API Examples

### Create Incident
```bash
curl -X POST http://localhost:3000/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "INC001",
    "title": "API Error",
    "description": "500 error on /api/users",
    "tags": ["api", "critical"],
    "status": "Draft",
    "createdBy": "john.doe",
    "createdAt": "2026-05-07T10:00:00Z",
    "attachments": [],
    "hash": "abc123",
    "history": [{"status": "Draft", "date": "2026-05-07T10:00:00Z"}]
  }'
```

### Update Status
```bash
curl -X PATCH http://localhost:3000/incidents/INC001 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Reviewed",
    "history": [
      {"status": "Draft", "date": "2026-05-07T10:00:00Z"},
      {"status": "Reviewed", "date": "2026-05-07T10:30:00Z"}
    ]
  }'
```

### Search Incidents
```bash
# By title
curl http://localhost:3000/incidents?title_like=server

# By status
curl http://localhost:3000/incidents?status=Draft

# By creator
curl http://localhost:3000/incidents?createdBy=admin
```

## Troubleshooting

### Issue: "Cannot GET /api/incidents"
**Solution**: Ensure JSON Server is running on port 3000
```bash
cd backend && npm start
```

### Issue: Duplicate incidents not detected
**Solution**: Check hash generation in `frontend/src/utils/api.js`
```javascript
export const generateHash = (content) => {
  // Ensure consistent hashing
};
```

### Issue: File upload fails
**Solution**: 
1. Check file format (PDF, DOCX, TXT, PNG, JPG)
2. Verify file size < 10MB
3. Check folder permissions

## Demo note

This project is meant for **local development and demos**. Do not expose the default JSON Server + mock auth setup to the public internet without a proper security and architecture review.

## Support & Contribution

For issues or suggestions:
1. Check [Troubleshooting](#troubleshooting)
2. Test with sample data
3. Check API endpoint status

## License

MIT

## Contact

For support or questions:
- Docs: See README.md files in each folder
