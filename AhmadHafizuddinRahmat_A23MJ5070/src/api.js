import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
})

// Attach token to every request automatically
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`
  return cfg
}, error => Promise.reject(error))

// Redirect to login on 401
API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export async function login(username, password) {
  const form = new FormData()
  form.append('username', username)
  form.append('password', password)
  const { data } = await API.post('/api/auth/login', form)
  return data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

// Raw uploads
export async function uploadText(rawText) {
  const form = new FormData()
  form.append('source', 'manual_text')
  form.append('raw_text', rawText)
  const { data } = await API.post('/api/upload', form)
  return data
}

export async function uploadFile(file) {
  const form = new FormData()
  const name = file.name.toLowerCase()
  let source = 'file_txt'
  if (file.type.startsWith('image/'))  source = 'file_image'
  else if (name.endsWith('.docx'))     source = 'file_docx'
  else if (name.endsWith('.msg'))      source = 'file_msg'
  else if (name.endsWith('.pdf'))      source = 'file_pdf'
  form.append('source', source)
  form.append('file', file)
  const { data } = await API.post('/api/upload', form)
  return data
}

export async function fetchRecords() {
  const { data } = await API.get('/api/records')
  return data
}

// Articles
export async function createArticle(title, content, tags) {
  const form = new FormData()
  form.append('title', title)
  form.append('content', content)
  form.append('tags', tags)
  const { data } = await API.post('/api/articles', form)
  return data
}

export async function fetchArticles(params = {}) {
  const { data } = await API.get('/api/articles', { params })
  return data
}

export async function fetchArticle(id) {
  const { data } = await API.get(`/api/articles/${id}`)
  return data
}

export async function updateArticle(id, title, content, tags) {
  const form = new FormData()
  form.append('title', title)
  form.append('content', content)
  form.append('tags', tags)
  const { data } = await API.put(`/api/articles/${id}`, form)
  return data
}

export async function updateStatus(id, newStatus, note = '') {
  const form = new FormData()
  form.append('new_status', newStatus)
  form.append('note', note)
  const { data } = await API.post(`/api/articles/${id}/status`, form)
  return data
}