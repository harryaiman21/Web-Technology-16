# Project directory tree

```
DHLWebTech2026/
├── README.md
├── API_REFERENCE.md
├── BUILD_MANIFEST.md
├── PROJECT_STRUCTURE.md
├── SETUP_CHECKLIST.md          (if present)
├── QUICKSTART.md               (if present)
├── .gitignore
├── backend/
│   ├── server.js               # Express + custom routes + JSON Server
│   ├── db.json                 # Persisted data
│   ├── package.json
│   ├── public/attachments/     # Uploaded files (created at runtime)
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── pages/              # LoginPage, UploadConsole, ViewerPage, IncidentDetailPage
│   │   ├── components/         # Sidebar, header, graphs, etc.
│   │   ├── hooks/useAuth.js
│   │   ├── utils/api.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── README.md
```

## Where to change things

| Goal | Location |
|------|-----------|
| Auth UI / session | `frontend/src/pages/LoginPage.jsx`, `frontend/src/hooks/useAuth.js` |
| API client | `frontend/src/utils/api.js` |
| Layout / routes | `frontend/src/App.jsx`, `frontend/src/components/` |
| Incidents list / bulk AI | `frontend/src/pages/ViewerPage.jsx` |
| Create incident | `frontend/src/pages/UploadConsole.jsx` |
| Edit incident | `frontend/src/pages/IncidentDetailPage.jsx` |
| REST data file | `backend/db.json` |
| Upload, Ollama, CORS, static files | `backend/server.js` |

## Run locally

```bash
cd backend && npm install && npm start    # http://localhost:3000
cd frontend && npm install && npm run dev # Vite default port (see terminal)
```

Details: [README.md](README.md), [frontend/README.md](frontend/README.md), [backend/README.md](backend/README.md).

## Docs index

| File | Content |
|------|---------|
| [README.md](README.md) | Overview, architecture, troubleshooting |
| [API_REFERENCE.md](API_REFERENCE.md) | HTTP examples |
| [BUILD_MANIFEST.md](BUILD_MANIFEST.md) | Short stack summary |

This repo is a **local/demo** layout; extend or replace persistence and auth before any public deployment.
