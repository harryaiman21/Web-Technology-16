// =============================================
//  api.js — Supabase REST API
// =============================================

const SUPABASE_URL = 'https://lrwmheckcfojgsqiiwyv.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyd21oZWNrY2ZvamdzcWlpd3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODM4MzIsImV4cCI6MjA5MzM1OTgzMn0.BgG5PoV1_AEniy8JuoMZKgjWpPw71U4R7oLjKh174do';

const HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

const api = {

  // ── INCIDENTS ──────────────────────────────

  async getAll() {
    const res = await fetch(`${SUPABASE_URL}/incidents?order=created_at.desc`, {
      headers: HEADERS
    });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    const data = await res.json();
    return data.map(mapRow);
  },

  async getById(id) {
    const res = await fetch(`${SUPABASE_URL}/incidents?id=eq.${id}`, {
      headers: HEADERS
    });
    if (!res.ok) throw new Error('Incident not found');
    const data = await res.json();
    if (!data.length) throw new Error('Not found');
    return mapRow(data[0]);
  },

  async create(incident) {
    const res = await fetch(`${SUPABASE_URL}/incidents`, {
      method:  'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify(toRow(incident))
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    const data = await res.json();
    return mapRow(data[0]);
  },

  async update(id, incident) {
    const res = await fetch(`${SUPABASE_URL}/incidents?id=eq.${id}`, {
      method:  'PATCH',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify(toRow(incident))
    });
    if (!res.ok) throw new Error('Failed to update incident');
    const data = await res.json();
    return mapRow(data[0]);
  },

  async patch(id, data) {
    return this.update(id, data);
  },

  async remove(id) {
    const res = await fetch(`${SUPABASE_URL}/incidents?id=eq.${id}`, {
      method:  'DELETE',
      headers: HEADERS
    });
    if (!res.ok) throw new Error('Failed to delete incident');
  },

  // ── USERS ──────────────────────────────────

  async getUsers() {
    const res = await fetch(`${SUPABASE_URL}/users`, { headers: HEADERS });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async findUser(username, password) {
    const res = await fetch(
      `${SUPABASE_URL}/users?username=eq.${encodeURIComponent(username.trim())}&password=eq.${encodeURIComponent(password)}`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error('Auth error');
    const users = await res.json();
    return users.length > 0 ? users[0] : null;
  },

  // ── RPA LOGS ───────────────────────────────

  async getRpaLogs() {
    const res = await fetch(`${SUPABASE_URL}/rpa_logs?order=run_at.desc`, {
      headers: HEADERS
    });
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
  },

  async createRpaLog(log) {
    const res = await fetch(`${SUPABASE_URL}/rpa_logs`, {
      method:  'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify(log)
    });
    if (!res.ok) throw new Error('Failed to save log');
    return res.json();
  }
};

// ── Column Mapping ─────────────────────────────
// Supabase uses snake_case, JS uses camelCase

function mapRow(row) {
  return {
    id:            row.id,
    title:         row.title,
    description:   row.description,
    type:          row.type,
    priority:      row.priority,
    status:        row.status,
    department:    row.department,
    creator:       row.creator,
    creatorName:   row.creator_name,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    tags:          row.tags          || [],
    attachments:   row.attachments   || [],
    statusHistory: row.status_history || []
  };
}

function toRow(inc) {
  const row = {};
  if (inc.title       !== undefined) row.title          = inc.title;
  if (inc.description !== undefined) row.description    = inc.description;
  if (inc.type        !== undefined) row.type           = inc.type;
  if (inc.priority    !== undefined) row.priority       = inc.priority;
  if (inc.status      !== undefined) row.status         = inc.status;
  if (inc.department  !== undefined) row.department     = inc.department;
  if (inc.creator     !== undefined) row.creator        = inc.creator;
  if (inc.creatorName !== undefined) row.creator_name   = inc.creatorName;
  if (inc.createdAt   !== undefined) row.created_at     = inc.createdAt;
  if (inc.tags        !== undefined) row.tags           = inc.tags;
  if (inc.attachments !== undefined) row.attachments    = inc.attachments;
  if (inc.statusHistory !== undefined) row.status_history = inc.statusHistory;
  row.updated_at = new Date().toISOString();
  return row;
}