# DHL Incident Reporting MVP

Demo Video https://youtu.be/NylENTg05q0

This is a create-t3-app-style Next.js MVP for collecting messy support reports, structuring them into incidents, tracking workflow status, and receiving automated updates from UiPath.

## Features
- Supabase-ready authentication screen.
- Incident dashboard with status, priority, department, source, duplicate hints, and search filters.
- Raw input intake form for pasted notes and attachments.
- UiPath API routes for raw input ingestion, incident upserts, and RPA run reporting.
- Rule-based LLM placeholder for extraction/classification that can later be swapped for OpenAI or Azure OpenAI.
- Supabase SQL schema with RLS policies and storage-ready attachment records.

## Setup
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in Supabase and UiPath values.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Create a Supabase Storage bucket named `incident-attachments`.
5. Start the app with `npm run dev`.

### Environment variables
```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
UIPATH_API_TOKEN=...
```

If UiPath lists/downloads directly from Supabase Storage, make the bucket public and use the anon key (never the service role key in UiPath).

The current `.env.local` is already filled with the Supabase project URL and publishable key supplied for this MVP. Add `SUPABASE_SERVICE_ROLE_KEY` before testing UiPath write endpoints.

## Validation
- Run `npm run typecheck`.
- Run `npm run lint`.
- Test UiPath endpoints with `Authorization: Bearer <UIPATH_API_TOKEN>`.
- Build the UiPath robot from `docs/uipath-robot-build.md`.

## Web app routes
- Dashboard: `/`
- Viewer: `/viewer`

## UiPath workflow (RPA)

The UiPath workflow is in `RPA/Main.xaml`.

### Required UiPath settings
- `IncidentApiBaseUrl` (example: `http://localhost:3000`)
- `IncidentApiToken` (must match `UIPATH_API_TOKEN`)
- Supabase anon key if listing storage directly (do not use service role key in UiPath)

### Storage listing (if used)
```
POST https://<project-ref>.supabase.co/storage/v1/object/list/incident-attachments
Headers:
	apikey: <SUPABASE_ANON_KEY>
	Authorization: Bearer <SUPABASE_ANON_KEY>
Body:
	{"prefix":"","limit":200}
```

### Post to the web app
Quick JSON posting to `/api/content`:
```
POST {IncidentApiBaseUrl}/api/content
Headers:
	Authorization: Bearer <IncidentApiToken>
	Content-Type: application/json
Body:
	{
		"title": "<file name>",
		"body": "<file content>",
		"status": "draft",
		"tags": ""
	}
```

Expected response: HTTP 201.

## Troubleshooting
- If `/api/content` returns 401: check `Authorization: Bearer <IncidentApiToken>`.
- If `/api/content` returns 400: ensure `title`, `body`, and a valid `status` are present.
- If UiPath finds 0 files: verify bucket visibility and the list request JSON.

## Sample incidents
Seed the three supplied text samples into Supabase through the RPA API:

```powershell
cd C:\Coding\dhl
$env:UIPATH_API_TOKEN="your-token"
.\scripts\seed-samples.ps1 -Token "your-token"
```

The samples are:
- Address-change request for `MY44567789`.
- COD overcharge complaint for RM450 versus RM250.
- Damaged and late parcel complaint for `MY987623400`.

## MVP defaults
- Email and Google Drive are the primary automated channels.
- Incident assignment is suggested by extraction, then reviewed by a support user.
- The extraction service is rule-based by default and can be replaced with an LLM provider later.
