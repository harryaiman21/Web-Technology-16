import { useEffect, useMemo, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import { incidentsAPI, tagsAPI, sourcesAPI, uploadAPI, llmAPI, generateHash, checkDuplicates } from '../utils/api';

export const UploadConsole = ({ user, onIncidentsChanged }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
    source: '',
    file: null,
    priority: 'Medium',
    summary: '',
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [showOtherTag, setShowOtherTag] = useState(false);
  const [availableSources, setAvailableSources] = useState([]);
  const [customSource, setCustomSource] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [llmHealth, setLlmHealth] = useState(null);
  const [llmHealthError, setLlmHealthError] = useState('');
  const [extractProgress, setExtractProgress] = useState(0);
  const [aiCategorizeProgress, setAiCategorizeProgress] = useState(0);
  const fileInputRef = useRef(null);
  const aiProgressIntervalRef = useRef(null);

  const SOURCE_OTHER_VALUE = '__other__';

  useMemo(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }, []);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await tagsAPI.getAll();
        const names = (res.data || []).map((t) => t.name).filter(Boolean);
        setAvailableTags(names);
      } catch (_e) {
        // fallback to stakeholder defaults if API is unavailable
        setAvailableTags([
          'Late Deliveries',
          'Address Issue',
          'Damaged Parcels',
          'System Errors',
          'Customer Complaints',
        ]);
      }
    };
    loadTags();
  }, []);

  useEffect(() => {
    return () => {
      if (aiProgressIntervalRef.current) {
        clearInterval(aiProgressIntervalRef.current);
        aiProgressIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const res = await sourcesAPI.getAll();
        const names = (res.data || []).map((s) => s.name).filter(Boolean);
        setAvailableSources(names);
      } catch (_e) {
        setAvailableSources([
          'Email',
          'Google Drive',
          'WhatsApp',
          'Teams',
          'Image',
          'Screenshot',
          'Handwriting instruction',
        ]);
      }
    };
    loadSources();
  }, []);

  const canExtract = (file) => {
    if (!file) return false;
    if (file.type === 'text/plain') return true;
    if (file.type === 'application/pdf') return true;
    if (file.type.startsWith('image/')) return true;
    return false;
  };

  const extractTextFromFile = async (file) => {
    if (!file) return '';

    if (file.type === 'text/plain') {
      const raw = await file.text();
      setExtractProgress(100);
      return raw.trim();
    }

    if (file.type === 'application/pdf') {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const pages = Math.min(pdf.numPages, 10); 
      let out = '';
      for (let p = 1; p <= pages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const text = content.items.map((it) => it.str).join(' ');
        out += text + '\n';
        setExtractProgress(Math.round((p / pages) * 100));
      }
      return out.trim();
    }

    if (file.type.startsWith('image/')) {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
            setExtractProgress(Math.round(m.progress * 100));
          }
        },
      });
      return (result?.data?.text || '').trim();
    }

    return '';
  };

  const extractAndPrefill = async (file) => {
    if (!file) return;
    if (!canExtract(file)) return;

    setIsExtracting(true);
    setExtractProgress(0);
    setError('');
    setSuccess('');
    try {
      const text = await extractTextFromFile(file);
      if (!text) {
        throw new Error('No text could be extracted from the file');
      }

      setFormData((prev) => ({
        ...prev,
        description: prev.description?.trim() ? prev.description : text,
        title: prev.title?.trim()
          ? prev.title
          : `Incident from ${file.name.replace(/\.[^/.]+$/, '')}`,
      }));
      setSuccess('Extracted text added to Description.');
    } catch (err) {
      setError(err.message || 'Failed to extract text');
    } finally {
      setIsExtracting(false);
    }
  };

  const autoCategorizeWithAI = async () => {
    const text = (formData.description || '').trim();
    if (!text) {
      setError('Add some Description text (or extract from file) before using AI categorization.');
      return;
    }

    setIsAutoCategorizing(true);
    setAiCategorizeProgress(5);
    setError('');
    setSuccess('');
    setLlmHealthError('');
    const clearAiProgressRamp = () => {
      if (aiProgressIntervalRef.current) {
        clearInterval(aiProgressIntervalRef.current);
        aiProgressIntervalRef.current = null;
      }
    };
    const startAiProgressRamp = () => {
      clearAiProgressRamp();
      aiProgressIntervalRef.current = setInterval(() => {
        setAiCategorizeProgress((p) => {
          if (p >= 90) return p;
          const step = 4 + Math.round(Math.random() * 9);
          return Math.min(90, p + step);
        });
      }, 320);
    };
    try {
      // Quick preflight: helps explain "Network Error" (backend down / Ollama not running / model missing).
      try {
        const h = await llmAPI.health();
        setLlmHealth(h?.data || null);
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
        setLlmHealthError(String(msg));
        setError(
          'Cannot reach the backend or Ollama. Make sure backend is running on port 3000 and Ollama is running on 11434.'
        );
        return;
      }

      setAiCategorizeProgress(18);
      startAiProgressRamp();

      const res = await llmAPI.classifyIncident({
        text,
        availableTags,
        availableSources,
      });

      clearAiProgressRamp();
      setAiCategorizeProgress(100);

      const ai = res?.data || {};

      // Apply AI suggestions, but don't overwrite user-entered values unless empty.
      setFormData((prev) => {
        const nextTitle = prev.title?.trim() ? prev.title : (ai.title || prev.title);
        const nextSource = prev.source?.trim() ? prev.source : (ai.source || prev.source);
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

      // If AI proposed new tags not in the list, add them so they can render/checkbox properly.
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

      // If AI returned a source not in the list (shouldn't), still add it so it can be selected.
      if (ai.source) {
        const src = String(ai.source).trim();
        if (src) {
          setAvailableSources((prev) => {
            const exists = prev.some((s) => String(s).toLowerCase() === src.toLowerCase());
            return exists ? prev : [...prev, src].sort((a, b) => a.localeCompare(b));
          });
        }
      }

      setSuccess('AI categorization applied. Please review before saving.');
      await new Promise((r) => setTimeout(r, 420));
    } catch (e) {
      const msg = e?.response?.data?.error
        || e?.response?.data?.details
        || (e?.code === 'ERR_NETWORK' ? 'Network error: backend not reachable' : null)
        || e?.message
        || 'AI categorization failed';
      setError(String(msg));
    } finally {
      if (aiProgressIntervalRef.current) {
        clearInterval(aiProgressIntervalRef.current);
        aiProgressIntervalRef.current = null;
      }
      setIsAutoCategorizing(false);
      setAiCategorizeProgress(0);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const toggleTag = (tagName) => {
    setFormData((prev) => {
      const has = prev.tags.includes(tagName);
      return {
        ...prev,
        tags: has ? prev.tags.filter((t) => t !== tagName) : [...prev.tags, tagName],
      };
    });
    setError('');
  };

  const handleAddCustomTag = async () => {
    const name = customTag.trim();
    if (!name) return;

    // If it already exists, just select it
    const exists = availableTags.some((t) => t.toLowerCase() === name.toLowerCase());
    if (!exists) {
      try {
        await tagsAPI.create({ id: `tag_${Date.now()}`, name });
        setAvailableTags((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      } catch (_e) {
        // If backend is down, still allow it for this incident
        setAvailableTags((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      }
    }

    setCustomTag('');
    setShowOtherTag(false);
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(name) ? prev.tags : [...prev.tags, name],
    }));
  };

  const handleAddCustomSource = async () => {
    const name = customSource.trim();
    if (!name) return;

    const exists = availableSources.some((s) => s.toLowerCase() === name.toLowerCase());
    if (!exists) {
      try {
        await sourcesAPI.create({ id: `src_${Date.now()}`, name });
        setAvailableSources((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      } catch (_e) {
        setAvailableSources((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      }
    }

    setCustomSource('');
    setFormData((prev) => ({ ...prev, source: name }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      file,
    }));
    setError('');
    setSuccess('');
    setExtractProgress(0);

    // Auto-extract text for supported files (TXT/PDF/Image)
    if (file) {
      await extractAndPrefill(file);
    }
  };

  const handleExtract = async () => {
    if (!formData.file) return;
    if (!canExtract(formData.file)) {
      setError('Unsupported file type for extraction. Use TXT, PDF, or an image.');
      return;
    }

    await extractAndPrefill(formData.file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate inputs
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }

      // Generate hash from description
      const hash = generateHash(formData.description);

      // Check for duplicates
      const duplicates = await checkDuplicates(hash);
      if (duplicates.length > 0) {
        throw new Error(
          `Duplicate incident found (last 14 days). ID: ${duplicates[0].id}`
        );
      }

      // Upload attachment (optional)
      let attachments = [];
      if (formData.file) {
        const uploadRes = await uploadAPI.uploadFile(formData.file);
        const uploaded = uploadRes.data;
        attachments = [
          {
            name: uploaded.name,
            url: uploaded.url,
            type: uploaded.type,
          },
        ];
      }

      // Prepare incident data
      const incident = {
        id: `INC${Date.now()}`,
        title: formData.title,
        description: formData.description,
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        source: formData.source,
        status: 'Draft',
        createdBy: user.username,
        createdAt: new Date().toISOString(),
        priority: formData.priority || 'Medium',
        summary: (formData.summary || '').trim(),
        attachments,
        hash,
        history: [
          {
            status: 'Draft',
            date: new Date().toISOString(),
          },
        ],
      };

      // Save to API
      await incidentsAPI.create(incident);

      setSuccess(`Incident created successfully! ID: ${incident.id}`);
      onIncidentsChanged?.();
      setFormData({
        title: '',
        description: '',
        tags: [],
        source: '',
        file: null,
        priority: 'Medium',
        summary: '',
      });
      setCustomTag('');
      setShowOtherTag(false);
      setCustomSource('');
      // source resets via formData below

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setExtractProgress(0);
    } catch (err) {
      setError(err.message || 'Error creating incident');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Upload New Incident</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.leadCard}>
          <div style={styles.leadCardHeader}>
            <span style={styles.stepPill}>Step 1</span>
            <h3 style={styles.leadHeading}>Attachment (optional)</h3>
          </div>
          <p style={styles.leadText}>
            Start here if you have a file. PDF, TXT, or images can fill the description for you; other
            types are still saved with the incident.
          </p>
          <div style={styles.filePickRow}>
            <label htmlFor="fileInput" style={styles.chooseFileBtn}>
              Choose file
            </label>
            <input
              ref={fileInputRef}
              id="fileInput"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              style={styles.fileInputHidden}
            />
            <span style={formData.file ? styles.fileChosenName : styles.fileChosenPlaceholder}>
              {formData.file ? formData.file.name : 'No file selected'}
            </span>
          </div>
          <small style={styles.hint}>Accepted: PDF, DOCX, TXT, PNG, JPG (max 25 MB)</small>
          {formData.file && !canExtract(formData.file) && (
            <small style={styles.hintWarn}>
              This file type is attached only — use PDF or TXT to auto-fill the description.
            </small>
          )}
          {formData.file && canExtract(formData.file) && (
            <div style={styles.extractBlock}>
              <button
                type="button"
                onClick={handleExtract}
                disabled={isLoading || isExtracting}
                style={{
                  ...styles.extractTextButton,
                  opacity: isLoading || isExtracting ? 0.55 : 1,
                  cursor: isLoading || isExtracting ? 'not-allowed' : 'pointer',
                }}
              >
                {isExtracting ? `Extracting… ${extractProgress}%` : 'Extract text into description'}
              </button>
              {isExtracting && (
                <>
                  <div style={styles.extractProgressRow}>
                    <span style={styles.extractProgressLabel}>Extraction progress</span>
                    <span style={styles.extractProgressPct}>{extractProgress}%</span>
                  </div>
                  <div style={styles.progressBarOuter}>
                    <div
                      style={{
                        ...styles.progressBarInner,
                        width: `${extractProgress}%`,
                      }}
                    />
                  </div>
                </>
              )}
              <small style={styles.hint}>
                TXT is instant. PDF reads up to 10 pages. Images use OCR (slower).
              </small>
            </div>
          )}
        </div>

        <div style={styles.formSectionLabel}>
          <span style={styles.stepPillMuted}>Step 2</span>
          <span style={styles.formSectionTitleText}>Incident details</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Incident title..."
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Detailed description of the incident..."
            rows="6"
            style={styles.textarea}
          />
          <div style={styles.aiCategorizeBlock}>
            <div style={styles.aiCategorizeRow}>
              <button
                type="button"
                onClick={autoCategorizeWithAI}
                disabled={isLoading || isExtracting || isAutoCategorizing || !formData.description.trim()}
                style={{
                  ...styles.aiCategorizeButton,
                  opacity:
                    isLoading || isExtracting || isAutoCategorizing || !formData.description.trim()
                      ? 0.55
                      : 1,
                  cursor:
                    isLoading || isExtracting || isAutoCategorizing || !formData.description.trim()
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {isAutoCategorizing ? 'Auto-categorizing (AI)…' : 'Auto-categorize (AI)'}
              </button>
              {!isAutoCategorizing && llmHealth?.provider === 'ollama' && (
                <span style={styles.aiStatusHint}>
                  Ollama: {llmHealth.modelInstalled ? 'ready' : 'model missing'} ({llmHealth.ollamaModel})
                </span>
              )}
            </div>
            {isAutoCategorizing && (
              <div style={styles.aiProgressSection} aria-live="polite">
                <div style={styles.aiProgressHeader}>
                  <span style={styles.aiProgressTitle}>Ollama is processing your description</span>
                  <span style={styles.aiProgressPct}>{aiCategorizeProgress}%</span>
                </div>
                <div style={styles.progressBarOuter}>
                  <div
                    style={{
                      ...styles.aiProgressBarInner,
                      width: `${aiCategorizeProgress}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {llmHealthError && (
              <div style={{ marginTop: 8, color: 'var(--dhl-red)', fontWeight: 700, fontSize: 12 }}>
                {llmHealthError}
              </div>
            )}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
            style={styles.input}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <small style={styles.hint}>
            Low = mild issues (e.g. slightly damaged, minor delay, tracking not updated promptly). High = severe
            impact.
          </small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Suggested summary (AI, max 30 words)</label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            placeholder="Brief neutral English summary (filled by Ollama; at most 30 words)..."
            rows="3"
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Tags</label>
          <div style={styles.tagsGrid}>
            {availableTags.map((tag) => (
              <label key={tag} style={styles.tagOption}>
                <input
                  type="checkbox"
                  checked={formData.tags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                />
                <span style={styles.tagOptionLabel}>{tag}</span>
              </label>
            ))}
            <label style={styles.tagOption}>
              <input
                type="checkbox"
                checked={showOtherTag}
                onChange={(e) => {
                  setShowOtherTag(e.target.checked);
                  setError('');
                  setSuccess('');
                }}
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
                style={styles.input}
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={isLoading || isExtracting || !customTag.trim()}
                style={styles.addTagButton}
              >
                Add
              </button>
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Source</label>
          <select
            value={formData.source}
            onChange={(e) => {
              const v = e.target.value;
              setFormData((prev) => ({ ...prev, source: v }));
              if (v !== SOURCE_OTHER_VALUE) {
                setCustomSource('');
              }
              setError('');
              setSuccess('');
            }}
            style={styles.select}
          >
            <option value="">Select source...</option>
            {availableSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={SOURCE_OTHER_VALUE}>Others</option>
          </select>

          {formData.source === SOURCE_OTHER_VALUE && (
            <div style={styles.customTagRow}>
              <input
                type="text"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="Create new source and save..."
                style={styles.input}
              />
              <button
                type="button"
                onClick={handleAddCustomSource}
                disabled={isLoading || isExtracting || !customSource.trim()}
                style={styles.addTagButton}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <button
          type="submit"
          disabled={isLoading || isExtracting}
          style={{
            opacity: isLoading || isExtracting ? 0.6 : 1,
          }}
          className="btn-save-draft"
        >
          {isLoading ? 'Saving...' : 'Save as Draft'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    marginBottom: '20px',
    color: 'var(--ink)',
  },
  form: {
    backgroundColor: 'var(--surface)',
    padding: '20px',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border)',
  },
  leadCard: {
    marginBottom: '24px',
    padding: '16px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 204, 0, 0.45)',
    backgroundColor: 'rgba(255, 204, 0, 0.12)',
  },
  leadCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  stepPill: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    color: '#111',
    backgroundColor: 'var(--dhl-yellow)',
  },
  stepPillMuted: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    color: 'var(--muted)',
    backgroundColor: 'rgba(17, 24, 39, 0.06)',
  },
  leadHeading: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--ink)',
  },
  leadText: {
    margin: '0 0 14px',
    fontSize: '14px',
    lineHeight: 1.5,
    color: 'var(--muted)',
  },
  filePickRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '6px',
  },
  chooseFileBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    backgroundColor: 'var(--dhl-yellow)',
    color: '#111',
    border: 'none',
    boxShadow: '0 2px 0 rgba(17, 24, 39, 0.12)',
    flexShrink: 0,
  },
  fileInputHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  fileChosenName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--ink)',
    wordBreak: 'break-word',
    minWidth: 0,
  },
  fileChosenPlaceholder: {
    fontSize: '14px',
    color: 'var(--muted)',
    fontStyle: 'italic',
  },
  extractBlock: {
    marginTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  extractTextButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    backgroundColor: '#111',
    color: 'var(--dhl-yellow)',
    border: '2px solid #111',
    boxShadow: '0 2px 0 rgba(17, 24, 39, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  },
  extractProgressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--ink)',
  },
  extractProgressLabel: {
    color: 'var(--muted)',
    fontWeight: 600,
  },
  extractProgressPct: {
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--ink)',
  },
  aiCategorizeBlock: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  aiCategorizeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
  },
  aiCategorizeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    backgroundColor: 'rgba(79, 195, 247, 0.18)',
    color: '#082f49',
    border: '1px solid rgba(8, 47, 73, 0.35)',
    boxShadow: '0 1px 0 rgba(8, 47, 73, 0.12)',
  },
  aiStatusHint: {
    fontSize: '12px',
    color: 'var(--muted)',
  },
  aiProgressSection: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(8, 47, 73, 0.2)',
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
  },
  aiProgressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    gap: '10px',
  },
  aiProgressTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#082f49',
  },
  aiProgressPct: {
    fontSize: '13px',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    color: '#082f49',
  },
  aiProgressBarInner: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #4fc3f7 0%, #0288d1 100%)',
    transition: 'width 0.25s ease',
  },
  formSectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  formSectionTitleText: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--ink)',
  },
  hintWarn: {
    display: 'block',
    marginTop: '8px',
    color: 'var(--dhl-red)',
    fontWeight: 600,
    fontSize: '13px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: 'var(--muted)',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: 'var(--surface)',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    outline: 'none',
  },
  fileInput: {
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    marginTop: '5px',
    color: 'var(--muted)',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'var(--dhl-red)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(212, 5, 17, 0.18)',
  },
  secondaryButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--ink)',
    border: '1px solid rgba(255, 204, 0, 0.35)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
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
  progressBarOuter: {
    height: '10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
    overflow: 'hidden',
    marginTop: '10px',
  },
  progressBarInner: {
    height: '100%',
    borderRadius: '999px',
    backgroundColor: 'var(--dhl-yellow)',
    transition: 'width 0.15s ease',
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
};
