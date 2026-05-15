// Simple in-memory store (will be replaced with API calls when backend is ready)
let nextId = 1
const listeners = new Set()

const store = {
  records: [],

  add(record) {
    const entry = {
      id: nextId++,
      timestamp: new Date().toISOString(),
      source: record.source || 'manual_upload',
      raw_text: record.raw_text || '',
      extracted_text: record.extracted_text || null,
      image_name: record.image_name || null,
      status: record.status || 'raw',
    }
    store.records.unshift(entry)
    listeners.forEach(fn => fn([...store.records]))
    return entry
  },

  getAll() {
    return [...store.records]
  },

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
}

export default store
