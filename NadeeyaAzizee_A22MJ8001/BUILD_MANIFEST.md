# Build summary

Incident reporting demo: React frontend and JSON Server backend (Express + Ollama endpoints).

## Stack

| Part | Location | Role |
|------|-----------|------|
| Frontend | `frontend/` | React + Vite UI |
| Backend | `backend/` | Express + JSON Server (`server.js`, `db.json`) |
| LLM | `backend/server.js` | Ollama: `GET /llm/health`, `POST /incident/classify` |
| Uploads | `backend/public/attachments/` | `POST /upload` (field `file`) |

## Run locally

1. **Backend** (port 3000): `cd backend` → `npm install` → `npm start`
2. **Frontend**: `cd frontend` → `npm install` → `npm run dev`
3. **Ollama**: required for AI classify/health; model from `OLLAMA_MODEL` (default in `server.js`)

## HTTP surface (non-exhaustive)

- JSON Server resources: `/incidents`, `/users`, `/tags`, `/sources` (see `API_REFERENCE.md`)
- `POST /upload`, `GET /llm/health`, `POST /incident/classify`
- Static: `/attachments/*`, `/public/*`

## Docs

- `README.md` — overview and troubleshooting  
- `API_REFERENCE.md` — request/response examples  
- `frontend/README.md`, `backend/README.md` — per-package setup  

This tree is for **local/demo** use only unless you harden and replace the mock persistence and auth yourself.
