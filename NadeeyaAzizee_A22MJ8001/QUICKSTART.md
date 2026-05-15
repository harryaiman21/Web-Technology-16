# 🚀 Quick Start Guide

Get the Incident Reporting System running in 5 minutes!

## Prerequisites

- Node.js >= 14.x (download from [nodejs.org](https://nodejs.org))
- npm (comes with Node.js)
- Terminal/Command Prompt

## Step 1: Backend Setup (2 minutes)

### Open Terminal
```bash
cd DHLWebTech2026/backend
```

### Install & Start
```bash
npm install
npm start
```

✅ **Expected**: Server running at `http://localhost:3000`
```
✔ listening at http://localhost:3000
```

---

## Step 2: Frontend Setup (2 minutes)

### Open NEW Terminal
```bash
cd DHLWebTech2026/frontend
```

### Install & Start
```bash
npm install
npm run dev
```

✅ **Expected**: Dev server running at `http://localhost:3001`
```
Local:   http://localhost:3001/
```

---

## Step 3: Access Application (1 minute)

### Open Browser
Go to: **http://localhost:3001**

### Login
- **Username**: `admin` (or any username)
- **Click**: Login button

### You're In! 🎉

---

## 5-Minute Tour

### 1. Upload Console (Create Incident)
- Click **Upload** in navigation
- Fill form:
  - Title: `Server Down`
  - Description: `Production server offline`
  - Tags: `critical, production`
- Click **Save as Draft**

### 2. Viewer Page (List Incidents)
- Click **Viewer**
- See all incidents in table
- Try:
  - Search: type "server"
  - Filter: select status
  - Refresh: click button

### 3. Detail Page (View/Edit)
- Click a row in the viewer table
- See full details
- Try:
  - Change status to "Reviewed"
  - Edit description
  - View history

---

## 🧪 Test Data

Sample incidents already in database:

| ID | Title | Status |
|----|-------|--------|
| INC001 | Critical System Failure | Published |
| INC002 | Data Sync Issue | Reviewed |

---

## 📊 API Testing

### Test API Directly
```bash
# List incidents
curl http://localhost:3000/incidents

# Create incident
curl -X POST http://localhost:3000/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test incident","status":"Draft","createdBy":"admin","createdAt":"2026-05-07T10:00:00Z","tags":[],"attachments":[],"hash":"test","history":[{"status":"Draft","date":"2026-05-07T10:00:00Z"}]}'
```

---

## ⚙️ Configuration

### Change API Port
```bash
# Backend (backend/package.json)
"start": "json-server --watch db.json --port 3001"
```

### Change Frontend Port
```bash
# Frontend (frontend/vite.config.js)
server: {
  port: 3002,
  ...
}
```

---

## 🔍 Verify Everything Works

### Checklist
- [ ] Backend server running on 3000
- [ ] Frontend server running on 3001
- [ ] Can login with any username
- [ ] Can create incident
- [ ] Can see incidents in table
- [ ] Can view incident details
- [ ] Can change status

---

## 🆘 Troubleshooting

### Backend won't start

```bash
# Port 3000 already in use? Stop the other process or set PORT, e.g.:
set PORT=3001
npm start
```

Then point the frontend at that port (`VITE_API_URL` or proxy target in `vite.config.js`).

### Frontend Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### "Cannot connect to API"
```bash
# Make sure backend is running
curl http://localhost:3000

# Check frontend is pointing to correct API
# In frontend/src/utils/api.js:
const API_BASE_URL = 'http://localhost:3000';
```

### Nothing Loads in Browser
```bash
# Check browser console for errors (F12)
# Check terminal for errors
# Try incognito mode (clear cache)
# Restart both servers
```

---

## Documentation

- [README.md](README.md) — overview and troubleshooting  
- [API_REFERENCE.md](API_REFERENCE.md) — HTTP examples  
- [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md) — package details  

## Tips

- `backend/db.json` is the data file; restart the backend after manual edits if changes do not appear.
- Use the browser **Network** tab for API calls and **Console** for client errors.
- Ollama must be running for AI health/classify used by the UI.

## Still stuck?

1. Check both terminals for errors.  
2. `curl http://localhost:3000/incidents` should return JSON when the backend is up.  
3. Restart: stop each server (Ctrl+C), then `npm start` / `npm run dev` again.

---

## Done

You should have the app at **http://localhost:3001** (see `frontend/vite.config.js`) with API requests proxied to **http://localhost:3000**.
