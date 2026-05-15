# Backend Setup Guide

## Overview

The backend uses **JSON Server**, a simple file-based REST API server. No database or complex configuration needed.

## Installation

### Prerequisites
- Node.js >= 14.x
- npm >= 6.x

### Steps

1. **Navigate to backend folder**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

Expected output:
```
added 50 packages in 2.5s
```

3. **Start the server**
```bash
npm start
```

Expected output:
```
  ✔ listening at http://localhost:3000
  ✔ Press s + enter to stop the server
```

## Database Structure

The backend uses `db.json` as the database file. Structure:

```json
{
  "incidents": [...],
  "users": [...]
}
```

### Incidents Schema
```json
{
  "id": "string (unique)",
  "title": "string (required)",
  "description": "string (required)",
  "tags": ["string"],
  "status": "Draft | Reviewed | Published",
  "createdBy": "string (username)",
  "createdAt": "ISO8601 datetime",
  "attachments": [
    {
      "name": "string",
      "url": "string",
      "type": "mime type"
    }
  ],
  "hash": "string (MD5 hash for deduplication)",
  "history": [
    {
      "status": "string",
      "date": "ISO8601 datetime"
    }
  ]
}
```

### Users Schema
```json
{
  "id": "string (unique)",
  "username": "string (unique)",
  "email": "string",
  "role": "Admin | User",
  "createdAt": "ISO8601 datetime"
}
```

## API Endpoints

### Incidents

#### GET /incidents
List all incidents
```bash
curl http://localhost:3000/incidents
```

Query parameters:
```bash
# Filter by status
curl "http://localhost:3000/incidents?status=Draft"

# Filter by creator
curl "http://localhost:3000/incidents?createdBy=admin"

# Pagination
curl "http://localhost:3000/incidents?_page=1&_limit=10"

# Sort
curl "http://localhost:3000/incidents?_sort=createdAt&_order=desc"

# Search
curl "http://localhost:3000/incidents?title_like=server"
```

#### GET /incidents/:id
Get single incident
```bash
curl http://localhost:3000/incidents/INC001
```

#### POST /incidents
Create new incident
```bash
curl -X POST http://localhost:3000/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Down",
    "description": "API endpoint returning 502",
    "tags": ["critical", "api"],
    "status": "Draft",
    "createdBy": "admin",
    "createdAt": "2026-05-07T10:00:00Z",
    "attachments": [],
    "hash": "abc123def456",
    "history": [{"status": "Draft", "date": "2026-05-07T10:00:00Z"}]
  }'
```

#### PATCH /incidents/:id
Update incident (partial update)
```bash
curl -X PATCH http://localhost:3000/incidents/INC001 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Reviewed"
  }'
```

#### DELETE /incidents/:id
Delete incident
```bash
curl -X DELETE http://localhost:3000/incidents/INC001
```

### Users

#### GET /users
List all users
```bash
curl http://localhost:3000/users
```

#### POST /users
Create new user
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane.doe",
    "email": "jane.doe@company.com",
    "role": "User",
    "createdAt": "2026-05-07T10:00:00Z"
  }'
```

## Managing Data

### Add Sample Data

Edit `db.json` and add incidents:

```json
{
  "incidents": [
    {
      "id": "INC001",
      "title": "Critical Issue",
      "description": "Server is down",
      "tags": ["critical", "production"],
      "status": "Draft",
      "createdBy": "admin",
      "createdAt": "2026-05-01T10:00:00Z",
      "attachments": [],
      "hash": "hash001",
      "history": [{"status": "Draft", "date": "2026-05-01T10:00:00Z"}]
    }
  ]
}
```

JSON Server auto-reloads on file changes.

### Backup Database

```bash
# Backup db.json
cp db.json db.backup.json

# Or use git
git add db.json
git commit -m "Backup database state"
```

### Reset Database

```bash
# Option 1: Delete and recreate
rm db.json

# Option 2: Restore from backup
cp db.backup.json db.json

# Server auto-creates empty db.json if missing
```

## Advanced Features

### Full-Text Search

```bash
# Search across multiple fields
curl "http://localhost:3000/incidents?q=critical"

# Requires adding search middleware (custom setup)
```

### Nested Filtering

```bash
# Filter by nested field
curl "http://localhost:3000/incidents?history.status=Draft"
```

### Sorting

```bash
# Sort ascending
curl "http://localhost:3000/incidents?_sort=createdAt&_order=asc"

# Sort descending
curl "http://localhost:3000/incidents?_sort=createdAt&_order=desc"

# Multiple sorts
curl "http://localhost:3000/incidents?_sort=status,createdAt&_order=asc,desc"
```

### Pagination

```bash
# Get page 2 with 5 items per page
curl "http://localhost:3000/incidents?_page=2&_limit=5"

# Response headers include X-Total-Count
curl -i http://localhost:3000/incidents
```

## Common Tasks

### Count total incidents
```bash
curl "http://localhost:3000/incidents" | jq 'length'
```

### Export all data
```bash
curl http://localhost:3000/db > export.json
```

### Import data
```bash
curl -X POST http://localhost:3000/incidents \
  -H "Content-Type: application/json" \
  -d @import.json
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
npx json-server --watch db.json --port 3001
```

### File Permissions

```bash
# Make db.json writable
chmod 644 db.json

# Fix directory permissions
chmod 755 .
```

### Data Not Persisting

**Solution**: Ensure db.json is not in .gitignore or excluded from writes
```bash
# Check permissions
ls -la db.json

# Verify write access
touch db.json && echo 'test' >> db.json
```

## Resources

- [JSON Server Docs](https://github.com/typicode/json-server)
- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)
