# Setup checklist (local demo)

Use this to confirm the repo runs on your machine. It does **not** cover production hardening.

## Install and run

- [ ] `cd backend` → `npm install` → `npm start` (API on port **3000**)
- [ ] `curl http://localhost:3000/incidents` returns JSON
- [ ] `cd frontend` → `npm install` → `npm run dev`
- [ ] Browser opens the URL Vite prints (see `frontend/vite.config.js`, typically **http://localhost:3001**)
- [ ] You can log in with a username and open the incident viewer / upload page

## Optional

- [ ] Ollama running locally if you use **Ollama AI** / auto-categorize (see `backend/server.js` for model env vars)

## Smoke test

- [ ] Create or view an incident; refresh list; open detail; save a change
- [ ] `backend/db.json` updates after creates/edits (or after API calls that persist)

For API details see [API_REFERENCE.md](API_REFERENCE.md). For architecture see [README.md](README.md).
