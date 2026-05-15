import { useState, useEffect, useMemo } from 'react';
import { incidentsAPI, tagsAPI, sourcesAPI, llmAPI, formatDate } from '../utils/api';

const PRIORITIES = ['High', 'Medium', 'Low'];

const prioritySortIndex = (raw) => {
  const p = String(raw || 'Medium').trim();
  const idx = PRIORITIES.indexOf(p);
  return idx === -1 ? PRIORITIES.indexOf('Medium') : idx;
};

/** Summary column: full AI summary when set; otherwise full description (no truncation). */
const listSummaryPreview = (incident) => {
  const s = (incident.summary || '').trim();
  if (s) return s;
  const d = (incident.description || '').trim();
  if (d) return d;
  return '—';
};

/** Colours for the priority control only (tags stay fixed yellow / black). */
const priorityTheme = (raw) => {
  const p = String(raw || 'Medium').trim();
  if (p === 'High') {
    return { accent: '#d32f2f', controlText: '#fff' };
  }
  if (p === 'Low') {
    return { accent: '#4fc3f7', controlText: '#082f49' };
  }
  return { accent: '#fb8c00', controlText: '#fff' };
};

export const ViewerPage = ({ user, onSelectIncident, onIncidentsChanged }) => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateRangeDays, setDateRangeDays] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [allSources, setAllSources] = useState([]);
  const [isSummarising, setIsSummarising] = useState(false);
  const [summariseProgress, setSummariseProgress] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [ollamaBanner, setOllamaBanner] = useState(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await tagsAPI.getAll();
        const names = (res.data || []).map((t) => t.name).filter(Boolean);
        if (names.length > 0) {
          setAllTags(names.sort());
        }
      } catch (_e) {
        // keep fallback tags derived from incidents
      }
    };
    loadTags();
  }, []);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const res = await sourcesAPI.getAll();
        const names = (res.data || []).map((s) => s.name).filter(Boolean);
        if (names.length > 0) {
          setAllSources(names.sort());
          return;
        }
      } catch (_e) {
        // keep fallback sources derived from incidents
      }

      // fallback: derive sources from incidents
      const src = new Set();
      incidents.forEach((i) => {
        if (i.source) src.add(i.source);
      });
      setAllSources(Array.from(src).sort());
    };
    loadSources();
  }, [incidents]);

  useEffect(() => {
    if (isLoading) return;
    onIncidentsChanged?.();
  }, [incidents, isLoading, onIncidentsChanged]);

  const tagFilterOptions = useMemo(() => {
    const map = new Map();
    for (const inc of Array.isArray(incidents) ? incidents : []) {
      for (const raw of inc.tags || []) {
        const s = String(raw || '').trim();
        if (!s) continue;
        map.set(s.toLowerCase(), s);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [incidents]);

  useEffect(() => {
    if (!tagFilter) return;
    const ok = tagFilterOptions.some((t) => t.toLowerCase() === tagFilter.toLowerCase());
    if (!ok) setTagFilter('');
  }, [tagFilter, tagFilterOptions]);

  /** Tag selection still in state but not on any loaded row — do not filter everything out. */
  const activeTagFilter = useMemo(() => {
    const raw = String(tagFilter || '').trim();
    if (!raw) return '';
    const ok = tagFilterOptions.some((t) => t.toLowerCase() === raw.toLowerCase());
    return ok ? raw : '';
  }, [tagFilter, tagFilterOptions]);

  const filteredIncidents = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : [];

    let filtered = list;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (incident) =>
          incident.title.toLowerCase().includes(term) ||
          (incident.description || '').toLowerCase().includes(term) ||
          (incident.summary || '').toLowerCase().includes(term) ||
          (incident.createdBy || '').toLowerCase().includes(term)
      );
    }

    if (activeTagFilter) {
      const needle = activeTagFilter.toLowerCase();
      filtered = filtered.filter((incident) =>
        (incident.tags || []).some((t) => String(t || '').toLowerCase() === needle)
      );
    }

    if (sourceFilter) {
      filtered = filtered.filter((incident) => incident.source === sourceFilter);
    }

    if (dateRangeDays) {
      const days = Number(dateRangeDays);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter((incident) => new Date(incident.createdAt) >= cutoff);
    }

    return [...filtered].sort((a, b) => {
      const pa = prioritySortIndex(a.priority);
      const pb = prioritySortIndex(b.priority);
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [incidents, searchTerm, activeTagFilter, sourceFilter, dateRangeDays]);

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const response = await incidentsAPI.getAll();
      const rows = Array.isArray(response.data) ? response.data : [];
      setIncidents(rows);

      // Fallback: derive tags from incidents if /tags not available
      if (!allTags || allTags.length === 0) {
        const tags = new Set();
        rows.forEach((incident) => {
          incident.tags?.forEach((tag) => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
      }
    } catch (err) {
      setError('Failed to fetch incidents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Manual reload from the toolbar: clears transient success/info banners. */
  const handleRefresh = async () => {
    setOllamaBanner(null);
    setError('');
    await fetchIncidents();
  };

  const isAdmin = user?.role === 'Admin';

  const handlePriorityChange = async (incidentId, nextPriority) => {
    try {
      await incidentsAPI.update(incidentId, { priority: nextPriority });
      setIncidents((prev) =>
        prev.map((i) => (i.id === incidentId ? { ...i, priority: nextPriority } : i))
      );
    } catch (err) {
      setError('Failed to update priority');
      console.error(err);
    }
  };

  const handleDelete = async (incidentId) => {
    const ok = window.confirm(`Delete incident ${incidentId}? This cannot be undone.`);
    if (!ok) return;

    try {
      await incidentsAPI.delete(incidentId);
      await fetchIncidents();
    } catch (err) {
      setError('Failed to delete incident');
      console.error(err);
    }
  };

  /** One-click Ollama: for every visible row with a description — fill missing summaries and/or set priority from AI. */
  const handleOllamaSummariseVisible = async () => {
    setError('');
    setOllamaBanner(null);

    const targets = filteredIncidents.filter((i) => (i.description || '').trim());

    if (targets.length === 0) {
      setOllamaBanner({
        variant: 'info',
        text:
          'Nothing to run: no incidents in this view have description text. Add a description on an incident, or clear filters.',
      });
      return;
    }

    setIsSummarising(true);
    setSummariseProgress({ current: 0, total: targets.length });

    try {
      try {
        const h = await llmAPI.health();
        if (h?.data && h.data.provider === 'ollama' && h.data.modelInstalled === false) {
          setError(
            `Ollama is running but model "${h.data.ollamaModel}" is not installed. Run: ollama pull ${h.data.ollamaModel}`
          );
          return;
        }
      } catch (healthErr) {
        const msg =
          healthErr?.response?.data?.error ||
          healthErr?.message ||
          'Cannot reach backend/LLM health endpoint';
        setError(
          `Cannot reach the backend or Ollama (${msg}). Ensure the API is up and Ollama is on port 11434.`
        );
        return;
      }

      let updated = 0;
      for (let idx = 0; idx < targets.length; idx++) {
        const incident = targets[idx];
        setSummariseProgress({ current: idx + 1, total: targets.length });

        const res = await llmAPI.classifyIncident({
          text: (incident.description || '').trim(),
          availableTags: allTags.length ? allTags : ['General'],
          availableSources: allSources.length
            ? allSources
            : ['Email', 'Google Drive', 'WhatsApp', 'Teams', 'Other'],
        });

        const ai = res?.data || {};
        const summary = String(ai.summary || '').trim();
        const rawPri = String(ai.priority || '').trim();
        const aiPriority = ['High', 'Medium', 'Low'].includes(rawPri) ? rawPri : null;

        const hadSummary = Boolean((incident.summary || '').trim());
        const currentPri = String(incident.priority || 'Medium').trim();
        const shouldSetSummary = Boolean(summary) && !hadSummary;
        const shouldSetPriority = Boolean(aiPriority) && aiPriority !== currentPri;

        if (shouldSetSummary || shouldSetPriority) {
          const payload = { ...incident };
          if (shouldSetSummary) payload.summary = summary;
          if (shouldSetPriority) payload.priority = aiPriority;
          await incidentsAPI.update(incident.id, payload);
          updated += 1;
        }
      }

      setOllamaBanner({
        variant: 'success',
        text: `Ollama finished: ${updated} of ${targets.length} incident(s) saved (new summary and/or priority). Rows already matching AI, or with no AI change, were skipped.`,
      });
      await fetchIncidents();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Ollama summarisation failed';
      setError(msg);
      console.error(err);
      await fetchIncidents();
    } finally {
      setIsSummarising(false);
      setSummariseProgress(null);
    }
  };

  const handleDeleteAll = async () => {
    const total = incidents.length;
    if (total === 0) {
      setOllamaBanner({
        variant: 'info',
        text: 'There are no incidents to delete.',
      });
      return;
    }

    const ok = window.confirm(
      `Delete ALL ${total} incident(s)? This permanently removes every report and cannot be undone.`
    );
    if (!ok) return;

    setError('');
    setOllamaBanner(null);
    setIsDeletingAll(true);
    try {
      await Promise.all(incidents.map((i) => incidentsAPI.delete(i.id)));
      await fetchIncidents();
      setOllamaBanner({
        variant: 'success',
        text: `Deleted ${total} incident(s).`,
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete all incidents');
      console.error(err);
      await fetchIncidents();
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (isLoading) {
    return <div style={styles.container}>Loading incidents...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Incidents Viewer</h2>
      <p style={styles.tableHint}>Click a row to open the incident. Use Delete only when you need to remove a record.</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.filtersContainer}>
        <input
          type="text"
          placeholder="Search by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          style={styles.filterSelect}
          aria-label="Filter by tag"
        >
          <option value="">All Tags</option>
          {tagFilterOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Sources</option>
          {allSources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={dateRangeDays}
          onChange={(e) => setDateRangeDays(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Dates</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
        </select>

        <button
          onClick={handleRefresh}
          className="btn-refresh"
          disabled={isDeletingAll || isSummarising}
        >
          Refresh
        </button>

        <button
          type="button"
          className="btn-ollama-summarise"
          onClick={handleOllamaSummariseVisible}
          disabled={isSummarising || isDeletingAll || filteredIncidents.length === 0}
          aria-busy={isSummarising}
          title="Runs Ollama on each visible row that has a description. Fills a missing summary; sets priority when AI suggests High/Medium/Low different from the current value. Does not replace an existing summary. Filters apply."
        >
          {isSummarising && summariseProgress
            ? `Running Ollama AI… ${summariseProgress.current}/${summariseProgress.total}`
            : 'Ollama AI'}
        </button>

        <button
          type="button"
          className="btn-delete-all"
          onClick={handleDeleteAll}
          disabled={isDeletingAll || isSummarising || incidents.length === 0}
          aria-busy={isDeletingAll}
          title="Permanently deletes every incident in the system (not only the filtered list)."
        >
          {isDeletingAll ? 'Deleting…' : 'Delete All'}
        </button>
      </div>

      {isSummarising && summariseProgress && summariseProgress.total > 0 && (
        <div style={styles.ollamaProgressSection} aria-live="polite">
          <div style={styles.ollamaProgressHeader}>
            <span style={styles.ollamaProgressTitle}>
              Ollama is processing visible incidents ({summariseProgress.current} of{' '}
              {summariseProgress.total})
            </span>
            <span style={styles.ollamaProgressPct}>
              {Math.round((summariseProgress.current / summariseProgress.total) * 100)}%
            </span>
          </div>
          <div style={styles.ollamaProgressBarOuter}>
            <div
              style={{
                ...styles.ollamaProgressBarInner,
                width: `${Math.min(100, Math.round((summariseProgress.current / summariseProgress.total) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {ollamaBanner && (
        <div
          style={
            ollamaBanner.variant === 'success'
              ? styles.ollamaBannerSuccess
              : ollamaBanner.variant === 'info'
                ? styles.ollamaBannerInfo
                : styles.error
          }
        >
          {ollamaBanner.text}
        </div>
      )}

      {filteredIncidents.length === 0 ? (
        <div style={styles.noData}>No incidents found</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.thCol1}>Incident</th>
                <th style={styles.thPriorityTags}>
                  Priority
                  <br />
                  &amp; tags
                </th>
                <th style={styles.thSummary}>Summary</th>
                <th style={styles.thDate}>Date</th>
                <th style={styles.thActions} aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((incident) => {
                const pr = incident.priority || 'Medium';
                const theme = priorityTheme(pr);
                return (
                <tr
                  key={incident.id}
                  className="viewer-incident-row"
                  style={styles.rowClickable}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open incident ${incident.id}: ${incident.title}`}
                  onClick={() => onSelectIncident(incident)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectIncident(incident);
                    }
                  }}
                >
                  <td style={styles.tdCol1}>
                    <div style={styles.incidentBlock}>
                      <div style={styles.reportId}>{incident.id}</div>
                      <div style={styles.reportTitle}>{incident.title}</div>
                      <div style={styles.incidentMetaLine}>
                        <span style={styles.metaChip}>{incident.source || '—'}</span>
                        <span style={styles.metaDot} aria-hidden>
                          ·
                        </span>
                        <span style={styles.metaBy}>{incident.createdBy || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td style={styles.tdPriorityTags}>
                    <div style={styles.priorityTagsStack}>
                      <div style={styles.priorityRow}>
                        {isAdmin ? (
                          <select
                            value={pr}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onChange={(e) => handlePriorityChange(incident.id, e.target.value)}
                            style={{
                              ...styles.prioritySelect,
                              backgroundColor: theme.accent,
                              color: theme.controlText,
                              borderColor: theme.accent,
                            }}
                            aria-label={`Priority for ${incident.id}`}
                          >
                            {PRIORITIES.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            style={{
                              ...styles.priorityPill,
                              backgroundColor: theme.accent,
                              color: theme.controlText,
                            }}
                          >
                            {pr}
                          </span>
                        )}
                      </div>
                      <div style={styles.tagPillRow}>
                        {(incident.tags || []).length === 0 ? (
                          <span style={styles.tagNone}>No tags</span>
                        ) : (
                          <>
                            {(incident.tags || []).slice(0, 2).map((tag) => (
                              <span key={tag} style={styles.tagPill}>
                                {tag}
                              </span>
                            ))}
                            {(incident.tags || []).length > 2 ? (
                              <span style={styles.tagMore}>+{incident.tags.length - 2}</span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={styles.tdSummary}>
                    <div style={styles.summaryText}>{listSummaryPreview(incident)}</div>
                  </td>
                  <td style={styles.tdDate}>{formatDate(incident.createdAt)}</td>
                  <td style={styles.tdActions}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(incident.id);
                      }}
                      style={styles.deleteButton}
                      aria-label={`Delete ${incident.id}`}
                      disabled={isDeletingAll || isSummarising}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
  },
  title: {
    marginBottom: '6px',
    color: 'var(--ink)',
  },
  tableHint: {
    margin: '0 0 16px 0',
    fontSize: '13px',
    color: 'var(--muted)',
    lineHeight: 1.4,
  },
  ollamaBannerSuccess: {
    padding: '8px 12px',
    marginTop: '10px',
    marginBottom: '12px',
    borderRadius: '10px',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    fontSize: '13px',
  },
  ollamaBannerInfo: {
    padding: '8px 12px',
    marginTop: '10px',
    marginBottom: '12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(79, 195, 247, 0.12)',
    color: 'var(--muted)',
    border: '1px solid rgba(79, 195, 247, 0.28)',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  ollamaProgressSection: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(8, 47, 73, 0.2)',
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
  },
  ollamaProgressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  ollamaProgressTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#082f49',
    lineHeight: 1.35,
  },
  ollamaProgressPct: {
    fontSize: '13px',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    color: '#082f49',
    flexShrink: 0,
  },
  ollamaProgressBarOuter: {
    height: '10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
    overflow: 'hidden',
  },
  ollamaProgressBarInner: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #4fc3f7 0%, #0288d1 100%)',
    transition: 'width 0.25s ease',
  },
  filtersContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    backgroundColor: 'var(--surface)',
    padding: '15px',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--dhl-yellow)',
    color: '#111',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
  },
  tableContainer: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: '#111',
    borderBottom: '2px solid var(--dhl-yellow)',
  },
  thCol1: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#fff',
    minWidth: '200px',
    width: '26%',
  },
  thPriorityTags: {
    padding: '10px 8px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#fff',
    width: '1%',
    maxWidth: '132px',
    lineHeight: 1.25,
    verticalAlign: 'bottom',
  },
  thSummary: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#fff',
    minWidth: '200px',
    width: '38%',
  },
  thDate: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    width: '150px',
  },
  thActions: {
    padding: '12px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontWeight: '600',
    color: '#fff',
    width: '96px',
  },
  rowClickable: {
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background-color 0.12s ease',
  },
  tdCol1: {
    padding: '12px 14px',
    color: 'var(--ink)',
    verticalAlign: 'top',
  },
  tdPriorityTags: {
    padding: '10px 8px',
    color: 'var(--ink)',
    verticalAlign: 'top',
    width: '1%',
    maxWidth: '132px',
  },
  tdSummary: {
    padding: '12px 14px',
    color: 'var(--ink)',
    verticalAlign: 'top',
  },
  tdDate: {
    padding: '12px 14px',
    color: 'var(--ink)',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    fontSize: '13px',
  },
  tdActions: {
    padding: '10px 12px',
    color: 'var(--ink)',
    width: '96px',
    verticalAlign: 'middle',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  incidentBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  incidentMetaLine: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--muted)',
    marginTop: '2px',
  },
  metaChip: {
    backgroundColor: 'var(--surface-2)',
    padding: '2px 8px',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    fontWeight: 600,
    color: 'var(--ink)',
    fontSize: '12px',
  },
  metaDot: {
    opacity: 0.45,
    userSelect: 'none',
  },
  metaBy: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '240px',
  },
  priorityTagsStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-start',
  },
  priorityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tagPillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  tagPill: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '999px',
    border: '1px solid rgba(17, 24, 39, 0.14)',
    backgroundColor: 'var(--dhl-yellow)',
    color: '#111',
  },
  tagMore: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#111',
  },
  tagNone: {
    fontSize: '12px',
    fontStyle: 'italic',
    color: 'var(--muted)',
  },
  reportId: {
    fontWeight: '700',
    fontSize: '12px',
    color: 'var(--muted)',
    fontFamily: 'ui-monospace, monospace',
    letterSpacing: '0.02em',
  },
  reportTitle: {
    fontWeight: '700',
    fontSize: '15px',
    lineHeight: 1.35,
    color: 'var(--ink)',
  },
  summaryText: {
    fontSize: '13px',
    lineHeight: 1.45,
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '100%',
    whiteSpace: 'pre-wrap',
  },
  prioritySelect: {
    padding: '5px 6px',
    borderRadius: '8px',
    borderWidth: 1,
    borderStyle: 'solid',
    fontSize: '12px',
    fontWeight: '700',
    minWidth: '0',
    width: '100%',
    maxWidth: '132px',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  priorityPill: {
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: '999px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    maxWidth: '100%',
  },
  deleteButton: {
    flexShrink: 0,
    padding: '8px 12px',
    backgroundColor: '#111',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
  },
  noData: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--muted)',
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  error: {
    padding: '10px',
    marginBottom: '15px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '10px',
    border: '1px solid #f5c6cb',
  },
};
