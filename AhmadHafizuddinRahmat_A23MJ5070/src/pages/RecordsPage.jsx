import { useState, useEffect } from 'react'
import { fetchRecords } from '../api'
import './RecordsPage.css'

const SOURCE_LABELS = {
  manual_text: 'Text paste',
  file_txt:    'TXT file',
  file_docx:   'Word (.docx)',
  file_msg:    'Outlook (.msg)',
  file_image:  'Image (OCR)',
}

const STATUS_COLORS = {
  raw: 'gray',
  ocr_done: 'blue',
  extracted: 'green',
}

export default function RecordsPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const data = await fetchRecords()
      setRecords(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to fetch — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = (id) => setExpanded(prev => prev === id ? null : id)

  return (
    <div className="rec-page">
      <header className="rec-header">
        <div>
          <div className="rec-title">Records</div>
          <div className="rec-sub">All raw inputs from SQLite · {records.length} record{records.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="refresh-btn" onClick={load}>↺ Refresh</button>
      </header>

      {loading && (
        <div className="rec-state">
          <div className="mini-spinner" /> Loading from SQLite...
        </div>
      )}

      {error && <div className="rec-error">⚠ {error}</div>}

      {!loading && !error && records.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">◻</div>
          <div className="empty-title">No records yet</div>
          <div className="empty-sub">Upload your first raw input on the Upload page</div>
          <a href="/" className="empty-link">Go to Upload →</a>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="rec-table">
          <div className="table-head">
            <div>ID</div>
            <div>Source</div>
            <div>Status</div>
            <div>Preview</div>
            <div>Timestamp</div>
            <div></div>
          </div>
          {records.map(r => (
            <div key={r.id} className="table-group">
              <div className="table-row" onClick={() => toggle(r.id)}>
                <div className="cell-id">#{r.id}</div>
                <div><span className="source-badge">{SOURCE_LABELS[r.source_type] || r.source_type}</span></div>
                <div><span className={'status-dot ' + (STATUS_COLORS[r.status] || 'gray')} />{r.status}</div>
                <div className="cell-preview">
                  {(r.raw_text || r.extracted_text || '—').slice(0, 60)}
                  {(r.raw_text || r.extracted_text || '').length > 60 ? '…' : ''}
                </div>
                <div className="cell-time">{r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}</div>
                <div className="cell-chevron">{expanded === r.id ? '▲' : '▼'}</div>
              </div>
              {expanded === r.id && (
                <div className="row-expand">
                  <div className="expand-grid">
                    {r.image_name && (
                      <div className="expand-item">
                        <div className="expand-label">File name</div>
                        <div className="expand-val mono">{r.image_name}</div>
                      </div>
                    )}
                    {r.raw_text && (
                      <div className="expand-item full">
                        <div className="expand-label">Raw text</div>
                        <pre className="expand-pre">{r.raw_text}</pre>
                      </div>
                    )}
                    {r.extracted_text && (
                      <div className="expand-item full">
                        <div className="expand-label">Extracted text <span className="badge-ocr">Tesseract</span></div>
                        <pre className="expand-pre">{r.extracted_text}</pre>
                      </div>
                    )}
                    {r.image_path && (
                      <div className="expand-item">
                        <div className="expand-label">Saved image path</div>
                        <div className="expand-val mono">{r.image_path}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}