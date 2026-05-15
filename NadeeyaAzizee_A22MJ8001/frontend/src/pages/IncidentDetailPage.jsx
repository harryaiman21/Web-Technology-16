import { useState, useEffect, useRef, useCallback } from 'react';
import { incidentsAPI, tagsAPI, sourcesAPI, llmAPI, formatDate } from '../utils/api';

const AUTO_AI_DEBOUNCE_MS = 2000;
const AUTO_AI_MIN_CHARS = 48;
const LS_AUTO_SUGGEST = 'incidentDetailAutoSuggestAi';

export const IncidentDetailPage = ({ incident, onBack, onUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(incident);
  const [availableTags, setAvailableTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [showOtherTag, setShowOtherTag] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [availableSources, setAvailableSources] = useState([]);
  const [llmHealthError, setLlmHealthError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoSuggestAi, setAutoSuggestAi] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(LS_AUTO_SUGGEST) === '1';
    } catch (_e) {
      return false;
    }
  });

  const classifyRequestId = useRef(0);
  const descRef = useRef(formData.description);
  descRef.current = formData.description;

  const setAutoSuggestAiPersisted = (value) => {
    setAutoSuggestAi(value);
    try {
      window.localStorage.setItem(LS_AUTO_SUGGEST, value ? '1' : '0');
    } catch (_e) {
      // ignore
    }
  };

  useEffect(() => {
    setFormData(incident);
    setCustomTag('');
    setShowOtherTag(false);
  }, [incident]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await tagsAPI.getAll();
        const names = (res.data || []).map((t) => t.name).filter(Boolean);
        if (names.length > 0) {
          setAvailableTags(names.sort());
          return;
        }
      } catch (_e) {
        // ignore and fallback
      }

      setAvailableTags([
        'Late Deliveries',
        'Address Issue',
        'Damaged Parcels',
        'System Errors',
        'Customer Complaints',
      ]);
    };
    loadTags();
  }, []);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const res = await sourcesAPI.getAll();
        const names = (res.data || []).map((s) => s.name).filter(Boolean);
        setAvailableSources(names.length > 0 ? names : []);
      } catch (_e) {
        setAvailableSources([
          'Email',
          'Google Drive',
          'WhatsApp',
          'Teams',
          'Image',
          'Screenshot',
          'Handwriting instruction',
          'Other',
        ]);
      }
    };
    loadSources();
  }, []);

  useEffect(() => {
    if (!editMode) {
      classifyRequestId.current += 1;
      setIsAutoCategorizing(false);
    }
  }, [editMode]);

  const runClassify = useCallback(
    async (text, { manual }) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) {
        if (manual) {
          setError('Add description text before using AI categorization.');
          setSuccess('');
        }
        return;
      }

      const requestSnapshot = ++classifyRequestId.current;
      setIsAutoCategorizing(true);
      if (manual) {
        setError('');
        setSuccess('');
      } else {
        setSuccess('');
      }
      setLlmHealthError('');

      try {
        try {
          const h = await llmAPI.health();
          if (requestSnapshot !== classifyRequestId.current) return;
          if (h?.data && h.data.provider === 'ollama' && h.data.modelInstalled === false) {
            setError(
              `Ollama is running but model "${h.data.ollamaModel}" is not installed. Run: ollama pull ${h.data.ollamaModel}`
            );
            return;
          }
        } catch (healthErr) {
          if (requestSnapshot !== classifyRequestId.current) return;
          const msg =
            healthErr?.response?.data?.error ||
            healthErr?.message ||
            'Cannot reach backend/LLM health endpoint';
          setLlmHealthError(String(msg));
          setError(
            'Cannot reach the backend or Ollama. Ensure the API is up and Ollama is on port 11434.'
          );
          return;
        }

        const res = await llmAPI.classifyIncident({
          text: trimmed,
          availableTags,
          availableSources,
        });

        if (requestSnapshot !== classifyRequestId.current) return;

        const ai = res?.data || {};

        setFormData((prev) => {
          const nextTitle = prev.title?.trim() ? prev.title : (ai.title || prev.title);
          const nextSource = (prev.source && String(prev.source).trim())
            ? prev.source
            : (ai.source || prev.source);
          const nextDescription = prev.description?.trim()
            ? prev.description
            : (ai.description || prev.description);

          const nextPriority = String(ai.priority || '').trim()
            ? (['High', 'Medium', 'Low'].includes(String(ai.priority).trim())
                ? String(ai.priority).trim()
                : 'Medium')
            : (prev.priority || 'Medium');
          const nextSummary = String(ai.summary || '').trim()
            ? String(ai.summary).trim()
            : (prev.summary || '');

          const incomingTags = Array.isArray(ai.tags) ? ai.tags : [];
          const mergedTags = Array.from(new Set([...(prev.tags || []), ...incomingTags]));

          return {
            ...prev,
            title: nextTitle,
            source: nextSource,
            description: nextDescription,
            priority: nextPriority,
            summary: nextSummary,
            tags: mergedTags,
          };
        });

        if (Array.isArray(ai.tags) && ai.tags.length > 0) {
          setAvailableTags((prev) => {
            const map = new Map(prev.map((t) => [String(t).toLowerCase(), t]));
            for (const t of ai.tags) {
              const cleaned = String(t || '').trim();
              if (!cleaned) continue;
              const k = cleaned.toLowerCase();
              if (!map.has(k)) map.set(k, cleaned);
            }
            return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
          });
        }

        if (ai.source) {
          const src = String(ai.source).trim();
          if (src) {
            setAvailableSources((prev) => {
              const exists = prev.some((s) => String(s).toLowerCase() === src.toLowerCase());
              return exists ? prev : [...prev, src].sort((a, b) => a.localeCompare(b));
            });
          }
        }

        if (manual) {
          setSuccess('AI suggestions applied. Review priority, summary, and tags, then save.');
        } else {
          setError('');
        }
      } catch (err) {
        if (requestSnapshot !== classifyRequestId.current) return;
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.details ||
          err?.message ||
          'AI categorization failed';
        setError(String(msg));
      } finally {
        if (requestSnapshot === classifyRequestId.current) {
          setIsAutoCategorizing(false);
        }
      }
    },
    [availableTags, availableSources]
  );

  useEffect(() => {
    if (!editMode || !autoSuggestAi) return undefined;

    const t = window.setTimeout(() => {
      const latest = (descRef.current || '').trim();
      if (latest.length < AUTO_AI_MIN_CHARS) return;
      runClassify(latest, { manual: false });
    }, AUTO_AI_DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [formData.description, editMode, autoSuggestAi, runClassify]);

  const autoCategorizeWithAI = () => runClassify(formData.description, { manual: true });

  const toggleTag = (tagName) => {
    setFormData((prev) => {
      const existing = Array.isArray(prev.tags) ? prev.tags : [];
      const has = existing.includes(tagName);
      return {
        ...prev,
        tags: has ? existing.filter((t) => t !== tagName) : [...existing, tagName],
      };
    });
  };

  const handleAddCustomTag = async () => {
    const name = customTag.trim();
    if (!name) return;

    const exists = availableTags.some((t) => t.toLowerCase() === name.toLowerCase());
    if (!exists) {
      try {
        await tagsAPI.create({ id: `tag_${Date.now()}`, name });
        setAvailableTags((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      } catch (_e) {
        setAvailableTags((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      }
    }

    setCustomTag('');
    setShowOtherTag(false);
    setFormData((prev) => {
      const existing = Array.isArray(prev.tags) ? prev.tags : [];
      return { ...prev, tags: existing.includes(name) ? existing : [...existing, name] };
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const nextTags = Array.isArray(formData.tags)
        ? formData.tags
        : String(formData.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

      const updatedIncident = {
        ...formData,
        tags: nextTags,
        history: incident.history,
      };

      await incidentsAPI.update(incident.id, updatedIncident);
      setSuccess('Changes saved successfully');
      onUpdate(updatedIncident);

      setTimeout(() => {
        setEditMode(false);
      }, 1500);
    } catch (err) {
      setError('Failed to save changes: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button type="button" onClick={onBack} style={styles.backButton}>
          ← Back to Home
        </button>
      </div>

      <div style={styles.detailsBox}>
        <div style={styles.header}>
          <div style={styles.headerInner}>
            {editMode ? (
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                style={styles.titleInput}
              />
            ) : (
              <h2 style={styles.title}>{incident.title}</h2>
            )}
            <p style={styles.meta}>ID: {incident.id}</p>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Description</h3>
          {editMode ? (
            <>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                style={styles.editTextarea}
                rows="6"
                aria-busy={isAutoCategorizing}
              />
              <div style={styles.aiPanel}>
                <button
                  type="button"
                  onClick={autoCategorizeWithAI}
                  disabled={isLoading || isAutoCategorizing}
                  style={styles.aiButton}
                >
                  {isAutoCategorizing ? 'Working…' : 'Auto-categorize (AI)'}
                </button>
                <p style={styles.aiHint}>
                  Runs Ollama to suggest tags, summary, and priority from the description.
                </p>
                {isAutoCategorizing ? (
                  <div style={styles.aiProgressBlock}>
                    <div
                      className="incident-ai-progress-track"
                      role="progressbar"
                      aria-valuetext="Ollama is generating suggestions"
                    >
                      <div className="incident-ai-progress-bar" />
                    </div>
                    <span style={styles.aiProgressCaption}>Ollama in progress</span>
                  </div>
                ) : null}
                <label style={styles.aiToggle}>
                  <input
                    type="checkbox"
                    checked={autoSuggestAi}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setAutoSuggestAiPersisted(on);
                      if (!on) {
                        classifyRequestId.current += 1;
                        setIsAutoCategorizing(false);
                      }
                    }}
                  />
                  <span>
                    Auto-suggest after typing pauses ({AUTO_AI_DEBOUNCE_MS / 1000}s, min{' '}
                    {AUTO_AI_MIN_CHARS} chars)
                  </span>
                </label>
              </div>
              {llmHealthError ? (
                <div style={styles.aiHealthWarn}>{llmHealthError}</div>
              ) : null}
            </>
          ) : (
            <p style={styles.description}>{incident.description}</p>
          )}
        </div>

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Reporting</h3>
          {editMode ? (
            <>
              <label style={styles.labelSmall}>Priority</label>
              <select
                name="priority"
                value={formData.priority || 'Medium'}
                onChange={handleInputChange}
                style={styles.editInput}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <small style={{ display: 'block', marginTop: 6, color: 'var(--muted)', fontSize: 12, lineHeight: 1.4 }}>
                Low: slightly damaged, minor delay, tracking not updated promptly, or similar low impact. High:
                severe impact.
              </small>
              <label style={{ ...styles.labelSmall, marginTop: 12, display: 'block' }}>
                Summary
              </label>
              <textarea
                name="summary"
                value={formData.summary || ''}
                onChange={handleInputChange}
                rows="3"
                style={styles.editTextarea}
              />
            </>
          ) : (
            <div style={styles.sectionBody}>
              <p style={styles.metaLine}>
                <strong>Priority:</strong> {incident.priority || 'Medium'}
              </p>
              <p style={styles.summaryBlock}>
                <strong>Summary:</strong> {incident.summary || '—'}
              </p>
            </div>
          )}
        </div>

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Tags</h3>
          {editMode ? (
            <>
              <div style={styles.tagsGrid}>
                {availableTags.map((tag) => (
                  <label key={tag} style={styles.tagOption}>
                    <input
                      type="checkbox"
                      checked={(Array.isArray(formData.tags) ? formData.tags : []).includes(tag)}
                      onChange={() => toggleTag(tag)}
                    />
                    <span style={styles.tagOptionLabel}>{tag}</span>
                  </label>
                ))}
                <label style={styles.tagOption}>
                  <input
                    type="checkbox"
                    checked={showOtherTag}
                    onChange={(e) => setShowOtherTag(e.target.checked)}
                  />
                  <span style={styles.tagOptionLabel}>Others</span>
                </label>
              </div>
              {showOtherTag && (
                <div style={styles.customTagRow}>
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Create new tag and save..."
                    style={styles.editInput}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={isLoading || !customTag.trim()}
                    style={styles.addTagButton}
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={styles.tagsReadRow}>
              {incident.tags?.map((tag) => (
                <span key={tag} style={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Metadata</h3>
          <div style={styles.metadataGrid}>
            <div style={styles.metadataItem}>
              <strong>Source:</strong> {incident.source || '—'}
            </div>
            <div style={styles.metadataItem}>
              <strong>Status:</strong> {incident.status || '—'}
            </div>
            <div style={styles.metadataItem}>
              <strong>Created By:</strong> {incident.createdBy}
            </div>
            <div style={styles.metadataItem}>
              <strong>Created At:</strong> {formatDate(incident.createdAt)}
            </div>
            <div style={styles.metadataItem}>
              <strong>Content Hash:</strong> {incident.hash}
            </div>
          </div>
        </div>

        {incident.attachments && incident.attachments.length > 0 && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Attachments</h3>
            <ul style={styles.attachmentList}>
              {incident.attachments.map((attachment, idx) => (
                <li key={idx} style={styles.attachmentItem}>
                  📎{' '}
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.attachmentLink}
                  >
                    {attachment.name}
                  </a>{' '}
                  <span style={styles.attachmentMeta}>({attachment.type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={styles.actionsContainer}>
          {!editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              style={styles.editButton}
            >
              Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isLoading}
                style={styles.saveButton}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setFormData(incident);
                  setCustomTag('');
                  setShowOtherTag(false);
                  setLlmHealthError('');
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '820px',
    margin: '0 auto',
  },
  topBar: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#111',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    borderBottom: '2px solid var(--dhl-yellow)',
    display: 'inline-block',
  },
  detailsBox: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border)',
    padding: '24px',
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '2px solid rgba(255, 204, 0, 0.45)',
  },
  headerInner: {
    maxWidth: '720px',
    margin: '0 auto',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 10px 0',
    color: 'var(--ink)',
    fontSize: '24px',
    fontWeight: '800',
    lineHeight: 1.25,
    textAlign: 'center',
  },
  titleInput: {
    width: '100%',
    maxWidth: '720px',
    margin: '0 auto 10px',
    display: 'block',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '20px',
    fontWeight: '700',
    boxSizing: 'border-box',
    outline: 'none',
    textAlign: 'center',
    color: 'var(--ink)',
  },
  meta: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: '14px',
    textAlign: 'center',
    fontFamily: 'ui-monospace, monospace',
  },
  labelSmall: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    color: 'var(--ink)',
  },
  metaLine: {
    margin: '0 0 10px 0',
    fontSize: '15px',
    color: 'var(--ink)',
    lineHeight: 1.5,
  },
  summaryBlock: {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.65,
    color: 'var(--ink)',
  },
  sectionCard: {
    marginBottom: '16px',
    padding: '18px 18px 20px',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    boxShadow: '0 1px 0 rgba(17, 24, 39, 0.04)',
  },
  sectionBody: {
    maxWidth: '680px',
    margin: '0 auto',
    textAlign: 'left',
  },
  sectionTitle: {
    margin: '0 0 14px 0',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(17, 24, 39, 0.08)',
    color: 'var(--ink)',
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  description: {
    margin: '0 auto',
    color: 'var(--ink)',
    fontSize: '15px',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    textAlign: 'left',
    maxWidth: '680px',
  },
  editTextarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    outline: 'none',
  },
  editInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  tagsReadRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: '4px',
  },
  tagsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  tagOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(17, 24, 39, 0.08)',
    backgroundColor: 'var(--surface)',
  },
  tagOptionLabel: {
    fontWeight: 600,
    color: 'var(--ink)',
  },
  customTagRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginTop: '10px',
  },
  addTagButton: {
    padding: '10px 14px',
    backgroundColor: 'var(--dhl-yellow)',
    color: '#111',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  tag: {
    display: 'inline-block',
    margin: 0,
    padding: '6px 14px',
    backgroundColor: 'var(--dhl-yellow)',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 700,
    border: '1px solid rgba(17, 24, 39, 0.14)',
    color: '#111',
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
  },
  metadataItem: {
    padding: '12px 14px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: 1.45,
    color: 'var(--ink)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  attachmentList: {
    listStyle: 'none',
    padding: 0,
  },
  attachmentItem: {
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    color: 'var(--ink)',
  },
  attachmentLink: {
    color: 'var(--dhl-red)',
    fontWeight: 800,
    textDecoration: 'none',
  },
  attachmentMeta: {
    color: 'var(--muted)',
    fontSize: '13px',
  },
  actionsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '8px',
    paddingTop: '22px',
    borderTop: '2px solid rgba(255, 204, 0, 0.45)',
  },
  editButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--dhl-red)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--dhl-red)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '800',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#111',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  error: {
    padding: '10px',
    marginBottom: '15px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '10px',
    border: '1px solid #f5c6cb',
  },
  success: {
    padding: '10px',
    marginBottom: '15px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '10px',
    border: '1px solid #c3e6cb',
  },
  aiPanel: {
    marginTop: '14px',
    padding: '14px 16px 12px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    backgroundColor: 'rgba(255, 249, 230, 0.65)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  aiButton: {
    width: '100%',
    maxWidth: '280px',
    padding: '10px 16px',
    backgroundColor: 'var(--dhl-yellow)',
    color: '#111',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '800',
  },
  aiHint: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--muted)',
    lineHeight: 1.45,
    textAlign: 'center',
    maxWidth: '420px',
  },
  aiProgressBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    maxWidth: '280px',
  },
  aiProgressCaption: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  aiToggle: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    width: '100%',
    maxWidth: '420px',
    marginTop: '4px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(17, 24, 39, 0.1)',
    fontSize: '12px',
    color: 'var(--ink)',
    cursor: 'pointer',
    lineHeight: 1.45,
    textAlign: 'left',
  },
  aiHealthWarn: {
    marginTop: '10px',
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: '520px',
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    border: '1px solid rgba(255, 193, 7, 0.5)',
    color: 'var(--ink)',
  },
};
