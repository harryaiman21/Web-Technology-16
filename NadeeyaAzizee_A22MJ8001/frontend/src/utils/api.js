import axios from 'axios';

// Vite exposes env vars on import.meta.env. Use VITE_API_URL or fallback to '/api'
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Incidents API
export const incidentsAPI = {
  getAll: () => api.get('/incidents'),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (incident) => api.post('/incidents', incident),
  update: (id, incident) => api.patch(`/incidents/${id}`, incident),
  delete: (id) => api.delete(`/incidents/${id}`),
};

// Upload API (multipart/form-data)
export const uploadAPI = {
  uploadFile: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (user) => api.post('/users', user),
};

// Tags API
export const tagsAPI = {
  getAll: () => api.get('/tags'),
  create: (tag) => api.post('/tags', tag),
};

// Sources API
export const sourcesAPI = {
  getAll: () => api.get('/sources'),
  create: (source) => api.post('/sources', source),
};

// LLM classify API
export const llmAPI = {
  classifyIncident: ({ text, availableTags, availableSources }) =>
    api.post('/incident/classify', { text, availableTags, availableSources }),
  health: () => api.get('/llm/health'),
};

// Utility function to generate hash
export const generateHash = (content) => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// Utility function to check for duplicates
export const checkDuplicates = async (hash, days = 14) => {
  try {
    const response = await incidentsAPI.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return response.data.filter(
      (incident) =>
        incident.hash === hash &&
        new Date(incident.createdAt) >= cutoffDate
    );
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return [];
  }
};

// Utility function to format dates
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Utility function to validate incident data
export const validateIncident = (incident) => {
  const errors = [];

  if (!incident.title || incident.title.trim().length === 0) {
    errors.push('Title is required');
  }
  if (!incident.description || incident.description.trim().length === 0) {
    errors.push('Description is required');
  }
  if (!incident.createdBy || incident.createdBy.trim().length === 0) {
    errors.push('Creator is required');
  }

  return errors;
};
