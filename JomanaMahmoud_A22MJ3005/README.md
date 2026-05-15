<h1>📦 DHL Incident Report System (IRS) — RegEx & Cloud Integration </h1>

A resilient, full-stack incident management pipeline combining UiPath RPA for data acquisition, RegEx for high-speed pattern matching, and a Next.js + Supabase cloud dashboard for real-time monitoring.

Demo Video Link: https://drive.google.com/drive/folders/11O5cVxNCGGTi2Zn4Gd3MwassLLn7DQpi?usp=drive_link 

<h2>🚀 System Architecture</h2>

<pre>
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend (Vercel/Local)                            │
│  ├─ Dashboard (Real-time Supabase Sync)                     │
│  ├─ Incident Details (RegEx Output + Raw Text)              │
│  └─ Status Management (Draft → Reviewed → Completed)        │
└────────────────────┬────────────────────────────────────────┘
                     │  Real-time Subscription / REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloud Layer (Supabase)                                     │
│  ├─ PostgreSQL Database (Incidents Table)                    │
│  ├─ Row Level Security (RLS)                                 │
│  └─ Auth & API Gateway                                      │
└────────────────────┬────────────────────────────────────────┘
                     │  HTTPS (REST API)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  RPA Worker (UiPath)                                        │
│  ├─ Google Drive Polling                                    │
│  ├─ Waterfall RegEx Extraction                              │
│  └─ Deduplication Logic (drive_id check)                    │
└─────────────────────────────────────────────────────────────┘
</pre>

<h2> 📂 Project Structure </h2>

<pre> 
DHLWebTech2026/
├── rpa_uipath/
│   ├── DHLIRSProcessor.xaml    # Main Robot logic (RegEx Engine)
│   ├── project.json            # Dependencies
│   └── README.md               # RPA Setup & SSL Fixes
├── web_dashboard/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/      # Incident Viewer
│   │   │   └── login/          # Auth Page
│   │   └── lib/
│   │       └── supabase.ts     # Cloud Client
│   └── .env.local              # API Keys (URL & Anon Key)
└── README.md                   # This file
</pre>

<h1>⚙️ Quick Start</h1> 
1. Database (Supabase)
Run this SQL in your Supabase Editor:

<pre>
-- 🛠️ Database Setup: Incidents Table
-- Run this in the Supabase SQL Editor to initialize your repository.

CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tracking_id text NULL,
  customer_name text NULL,
  issue_summary text NULL,
  priority text NULL,
  status text DEFAULT 'In Progress',
  source text DEFAULT 'google_drive'::text,
  drive_id text NULL UNIQUE, 
  file_path text NULL,
  incident_text text NULL,   
  user_id uuid NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incidents_pkey PRIMARY KEY (id),
  CONSTRAINT incidents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
) TABLESPACE pg_default;
</pre>

2. RPA (UiPath) <br>

<ul>Open DHLIRSProcessor.xaml.</ul>
<ul>Check the "Disable SSL verification" box in the HTTP Request activity.</ul>
<ul>Update headers with your Supabase URL and Keys.</ul>

3. Dashboard (Next.js)
<pre>
npm install
npm run dev
</pre>
