import { useState, useEffect, useCallback } from 'react'
import { fetchArticles, updateStatus, getUser } from '../api'
import './ArticlesPage.css'

const STATUS_META = {
  draft:     { label: 'Draft',     color: 'gray'   },
  reviewed:  { label: 'Reviewed',  color: 'blue'   },
  published: { label: 'Published', color: 'green'  },
  rejected:  { label: 'Rejected',  color: 'red'    },
}

const TRANSITIONS = {
  draft: [
    { to: 'reviewed', label: 'Mark Reviewed', role: 'reviewer' },
    { to: 'rejected', label: 'Reject',        role: 'reviewer' },
  ],
  reviewed: [
    { to: 'published', label: 'Publish',       role: 'reviewer' },
  ],
  rejected: [
    { to: 'draft', label: 'Reopen for Review', role: 'reviewer' },
  ],
  published: [],
}

export default function ArticlesPage() {
  const user = getUser()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [transitioning, setTransitioning] = useState(null)

  // Filters
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('')
  const [tagF, setTagF]         = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const params = {}
      if (search)   params.search    = search
      if (statusF)  params.status    = statusF
      if (tagF)     params.tag       = tagF
      if (dateFrom) params.date_from = dateFrom
      if (dateTo)   params.date_to   = dateTo
      setArticles(await fetchArticles(params))
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }, [search, statusF, tagF, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const toggle = (id) => setExpanded(prev => prev === id ? null : id)

  const handleTransition = async (articleId, toStatus) => {
    try {
      setTransitioning(articleId)
      await updateStatus(articleId, toStatus)
      await load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Status update failed')
    } finally {
      setTransitioning(null)
    }
  }

  const clearFilters = () => {
    setSearch(''); setStatusF(''); setTagF(''); setDateFrom(''); setDateTo('')
  }

  const hasFilters = search || statusF || tagF || dateFrom || dateTo

  return (
    <div className="art-page">
      <header className="art-header">
        <div>
          <div className="art-title">Articles</div>
          <div className="art-sub">{articles.length} article{articles.length !== 1 ? 's' : ''} · logged in as <span className="role-badge">{user?.role}</span></div>
        </div>
        <button className="refresh-btn" onClick={load}>↺ Refresh</button>
      </header>

      {/* Search + Filters */}
      <div className="filter-bar">
        <input className="search-input" placeholder="Search title, content, tags..."
          value={search} onChange={e => setSearch(e.target.value)} />

        <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="reviewed">Reviewed</option>
          <option value="published">Published</option>
        </select>

        <input className="filter-input" placeholder="Filter by tag..."
          value={tagF} onChange={e => setTagF(e.target.value)} />

        <input className="filter-input" type="date"
          value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="filter-sep">→</span>
        <input className="filter-input" type="date"
          value={dateTo} onChange={e => setDateTo(e.target.value)} />

        {hasFilters && <button className="clear-btn" onClick={clearFilters}>✕ Clear</button>}
      </div>

      {loading && <div className="art-state"><div className="mini-spinner" /> Loading...</div>}
      {error   && <div className="art-error">⚠ {error}</div>}

      {!loading && !error && articles.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">◻</div>
          <div className="empty-title">{hasFilters ? 'No articles match your filters' : 'No articles yet'}</div>
          <div className="empty-sub">{hasFilters ? 'Try adjusting your search' : 'Create your first article from the Upload page'}</div>
          {hasFilters && <button className="empty-link" onClick={clearFilters}>Clear filters</button>}
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div className="art-list">
          {articles.map(a => {
            const meta = STATUS_META[a.status] || STATUS_META.draft
            const transitions = TRANSITIONS[a.status] || []
            const isExpanded = expanded === a.id
            return (
              <div key={a.id} className={'art-card' + (isExpanded ? ' expanded' : '')}>
                <div className="art-card-header" onClick={() => toggle(a.id)}>
                  <div className="art-card-left">
                    <span className={'status-pill ' + meta.color}>{meta.label}</span>
                    <div className="art-card-title">{a.title}</div>
                  </div>
                  <div className="art-card-right">
                    <span className="art-meta">by {a.creator}</span>
                    <span className="art-meta">{new Date(a.created_at).toLocaleDateString()}</span>
                    {a.tags.length > 0 && a.tags.map(t => (
                      <span key={t} className="tag-chip">{t}</span>
                    ))}
                    <span className="art-chevron">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="art-card-body">
                    <pre className="art-content">{a.content}</pre>

                    {/* Status history */}
                    {a.history && a.history.length > 0 && (
                      <div className="history-section">
                        <div className="history-label">Status history</div>
                        <div className="history-timeline">
                          {a.history.map((h, i) => (
                            <div key={i} className="history-item">
                              <span className={'history-dot ' + (STATUS_META[h.to_status]?.color || 'gray')} />
                              <div className="history-info">
                                <span className="history-transition">
                                  {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
                                </span>
                                <span className="history-by">by {h.changed_by} · {new Date(h.changed_at).toLocaleString()}</span>
                                {h.note && <span className="history-note">{h.note}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow actions — reviewer only */}
                    {user?.role === 'reviewer' && transitions.length > 0 && (
                      <div className="art-actions">
                        {transitions.map(tr => (
                          <button
                            key={tr.to}
                            className={'transition-btn ' + tr.to}
                            disabled={transitioning === a.id}
                            onClick={() => handleTransition(a.id, tr.to)}
                          >
                            {transitioning === a.id ? '...' : tr.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {a.status === 'published' && (
                      <div className="locked-note">🔒 Published — locked for editing</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}