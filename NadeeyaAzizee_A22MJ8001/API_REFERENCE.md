# Incident Reporting System - API Reference

## Base URL

```
http://localhost:3000
```

## Authentication

Currently using basic mock authentication. 

## Response Format

All responses are JSON:

```json
{
  "data": {},
  "success": true,
  "message": "Success"
}
```

## Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET successful |
| 201 | Created | POST successful |
| 204 | No Content | DELETE successful |
| 400 | Bad Request | Invalid data |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal error |

## Endpoints

### Incidents

#### List All Incidents
```
GET /incidents
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `_page` | integer | Page number (1-indexed) |
| `_limit` | integer | Items per page |
| `_sort` | string | Sort field |
| `_order` | string | asc or desc |
| `status` | string | Filter by status |
| `createdBy` | string | Filter by creator |
| `title_like` | string | Search in title |

**Example**:
```bash
GET /incidents?status=Draft&_limit=10&_page=1
```

**Response**:
```json
[
  {
    "id": "INC001",
    "title": "Server Down",
    "description": "Production server is down",
    "tags": ["critical", "production"],
    "status": "Draft",
    "createdBy": "admin",
    "createdAt": "2026-05-01T02:15:00Z",
    "attachments": [],
    "hash": "abc123",
    "history": [{"status": "Draft", "date": "2026-05-01T02:15:00Z"}]
  }
]
```

---

#### Get Single Incident
```
GET /incidents/:id
```

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Incident ID |

**Example**:
```bash
GET /incidents/INC001
```

**Response**:
```json
{
  "id": "INC001",
  "title": "Server Down",
  "description": "Production server is down",
  "tags": ["critical", "production"],
  "status": "Draft",
  "createdBy": "admin",
  "createdAt": "2026-05-01T02:15:00Z",
  "attachments": [],
  "hash": "abc123",
  "history": [{"status": "Draft", "date": "2026-05-01T02:15:00Z"}]
}
```

---

#### Create Incident
```
POST /incidents
```

**Request Body**:
```json
{
  "id": "INC{timestamp}",
  "title": "string (required, max 200 chars)",
  "description": "string (required, max 5000 chars)",
  "tags": ["string"],
  "status": "Draft|Reviewed|Published",
  "createdBy": "string (required)",
  "createdAt": "ISO8601 datetime",
  "attachments": [
    {
      "name": "string",
      "url": "string",
      "type": "mime type"
    }
  ],
  "hash": "string",
  "history": [
    {
      "status": "string",
      "date": "ISO8601 datetime"
    }
  ]
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "INC001",
    "title": "Critical API Error",
    "description": "API endpoint /users returns 502 Bad Gateway",
    "tags": ["api", "critical"],
    "status": "Draft",
    "createdBy": "john.doe",
    "createdAt": "2026-05-07T10:00:00Z",
    "attachments": [],
    "hash": "hash_of_content",
    "history": [{"status": "Draft", "date": "2026-05-07T10:00:00Z"}]
  }'
```

**Response** (201 Created):
```json
{
  "id": "INC001",
  "title": "Critical API Error",
  "description": "API endpoint /users returns 502 Bad Gateway",
  "tags": ["api", "critical"],
  "status": "Draft",
  "createdBy": "john.doe",
  "createdAt": "2026-05-07T10:00:00Z",
  "attachments": [],
  "hash": "hash_of_content",
  "history": [{"status": "Draft", "date": "2026-05-07T10:00:00Z"}]
}
```

---

#### Update Incident
```
PATCH /incidents/:id
```

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Incident ID |

**Request Body** (any of these):
```json
{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "status": "Draft|Reviewed|Published",
  "attachments": [],
  "history": []
}
```

**Example**:
```bash
curl -X PATCH http://localhost:3000/incidents/INC001 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Reviewed",
    "history": [
      {"status": "Draft", "date": "2026-05-07T10:00:00Z"},
      {"status": "Reviewed", "date": "2026-05-07T11:00:00Z"}
    ]
  }'
```

**Response** (200 OK):
```json
{
  "id": "INC001",
  "title": "Critical API Error",
  "description": "API endpoint /users returns 502 Bad Gateway",
  "tags": ["api", "critical"],
  "status": "Reviewed",
  "createdBy": "john.doe",
  "createdAt": "2026-05-07T10:00:00Z",
  "attachments": [],
  "hash": "hash_of_content",
  "history": [
    {"status": "Draft", "date": "2026-05-07T10:00:00Z"},
    {"status": "Reviewed", "date": "2026-05-07T11:00:00Z"}
  ]
}
```

---

#### Delete Incident
```
DELETE /incidents/:id
```

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Incident ID |

**Example**:
```bash
curl -X DELETE http://localhost:3000/incidents/INC001
```

**Response** (204 No Content):
```
(empty response)
```

---

### Users

#### List All Users
```
GET /users
```

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `_page` | integer | Page number |
| `_limit` | integer | Items per page |
| `role` | string | Filter by role |

**Example**:
```bash
GET /users?role=Admin
```

**Response**:
```json
[
  {
    "id": "u001",
    "username": "admin",
    "email": "admin@company.com",
    "role": "Admin",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

#### Get Single User
```
GET /users/:id
```

**Example**:
```bash
GET /users/u001
```

**Response**:
```json
{
  "id": "u001",
  "username": "admin",
  "email": "admin@company.com",
  "role": "Admin",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

#### Create User
```
POST /users
```

**Request Body**:
```json
{
  "username": "string (unique, required)",
  "email": "string",
  "role": "Admin|User",
  "createdAt": "ISO8601 datetime"
}
```

**Example**:
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

**Response** (201 Created):
```json
{
  "id": "u003",
  "username": "jane.doe",
  "email": "jane.doe@company.com",
  "role": "User",
  "createdAt": "2026-05-07T10:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid incident data"
}
```

### 404 Not Found
```json
{
  "error": "Incident not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## CORS

The backend enables CORS for local development so the Vite dev server can call the API.

## Data Validation

### Incident Validation Rules

| Field | Validation |
|-------|-----------|
| title | Required, max 200 chars |
| description | Required, max 5000 chars |
| tags | Optional, array of strings |
| status | Must be Draft, Reviewed, or Published |
| createdBy | Required, non-empty string |
| hash | Recommended, MD5 of content |

### User Validation Rules

| Field | Validation |
|-------|-----------|
| username | Required, unique |
| email | Optional, valid email format |
| role | Admin or User |

## Examples

### Create Incident from File
```javascript
async function createIncidentFromFile(file, username) {
  const content = await file.text();
  const hash = generateHash(content);
  
  const incident = {
    id: `INC${Date.now()}`,
    title: file.name,
    description: content,
    tags: ['uploaded'],
    status: 'Draft',
    createdBy: username,
    createdAt: new Date().toISOString(),
    attachments: [{
      name: file.name,
      url: `/files/${file.name}`,
      type: file.type
    }],
    hash,
    history: [{
      status: 'Draft',
      date: new Date().toISOString()
    }]
  };
  
  const response = await fetch('http://localhost:3000/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident)
  });
  
  return response.json();
}
```

### Update Incident Status
```javascript
async function updateStatus(incidentId, newStatus) {
  const incident = await fetch(`http://localhost:3000/incidents/${incidentId}`)
    .then(r => r.json());
  
  const updated = {
    ...incident,
    status: newStatus,
    history: [
      ...incident.history,
      {
        status: newStatus,
        date: new Date().toISOString()
      }
    ]
  };
  
  const response = await fetch(`http://localhost:3000/incidents/${incidentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  });
  
  return response.json();
}
```

### Search Incidents
```javascript
async function searchIncidents(query) {
  const response = await fetch(`http://localhost:3000/incidents?title_like=${query}`)
    .then(r => r.json());
  return response;
}
```
