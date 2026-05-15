import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { getIncidentById, updateIncident } from '../../services/incidentService';
import { listIncidentFiles, generateSignedUrl } from '../../services/fileService';
import type { Incident } from '../../types';
import { getStatusLabel } from '../../utils/status';
import './IncidentReviewPage.css';

interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  metadata?: any;
}

export function IncidentReviewPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthContext();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Incident['priority']>('medium');
  const [resolutionComments, setResolutionComments] = useState('');
  const [incidentFiles, setIncidentFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  useEffect(() => {
    if (!incidentId) {
      setError('Incident ID is missing.');
      setIsLoading(false);
      return;
    }

    const fetchIncident = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getIncidentById(incidentId);
        setIncident(data);
        setDescription(data.description || '');
        setPriority(data.priority || 'medium');
        setResolutionComments(data.resolution_comments || '');
      } catch (err: any) {
        console.error('Error loading incident review page:', err);
        setError(err.message || 'Failed to load incident');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncident();
  }, [incidentId]);

  useEffect(() => {
    if (!incident) {
      setIncidentFiles([]);
      setPreviewFile(null);
      return;
    }

    const fetchFiles = async () => {
      try {
        setFilesLoading(true);
        const files = await listIncidentFiles(incident.id);
        setIncidentFiles(files || []);
      } catch (err) {
        console.error('Error fetching incident files:', err);
        setIncidentFiles([]);
      } finally {
        setFilesLoading(false);
      }
    };

    fetchFiles();
  }, [incident]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileExtension = (fileName: string): string => fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = (fileName: string): boolean => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(getFileExtension(fileName));
  const isPdf = (fileName: string): boolean => getFileExtension(fileName) === 'pdf';

  const handleFileDownload = async (fileName: string) => {
    if (!incident) return;

    const filePath = `incidents/${incident.id}/${fileName}`;
    const url = await generateSignedUrl(filePath, 3600);
    window.open(url, '_blank');
  };

  const PdfPreview = ({ fileName }: { fileName: string }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;

      const load = async () => {
        if (!incident) return;
        const filePath = `incidents/${incident.id}/${fileName}`;
        const url = await generateSignedUrl(filePath, 3600);
        if (mounted) setPdfUrl(url);
      };

      load();
      return () => {
        mounted = false;
      };
    }, [fileName]);

    if (!pdfUrl) return <p>Loading PDF...</p>;

    return <iframe src={pdfUrl} style={{ width: '100%', height: '520px', border: 'none', borderRadius: '8px' }} title="PDF Preview" />;
  };

  const ImagePreview = ({ fileName }: { fileName: string }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;

      const load = async () => {
        if (!incident) return;
        const filePath = `incidents/${incident.id}/${fileName}`;
        const url = await generateSignedUrl(filePath, 3600);
        if (mounted) setImageUrl(url);
      };

      load();
      return () => {
        mounted = false;
      };
    }, [fileName]);

    if (!imageUrl) return <p>Loading image...</p>;

    return <img src={imageUrl} alt={fileName} style={{ width: '100%', maxHeight: '520px', objectFit: 'contain', borderRadius: '8px' }} />;
  };

  const renderPreviewModal = () => {
    if (!previewFile || !incident) return null;

    return (
      <div className="review-preview-modal" onClick={() => setPreviewFile(null)}>
        <div className="review-preview-content" onClick={(e) => e.stopPropagation()}>
          <button className="review-preview-close" onClick={() => setPreviewFile(null)}>×</button>
          {isPdf(previewFile) && <PdfPreview fileName={previewFile} />}
          {isImage(previewFile) && <ImagePreview fileName={previewFile} />}
          {!isPdf(previewFile) && !isImage(previewFile) && (
            <div className="review-preview-fallback">
              <p>Preview not available for this file type.</p>
              <button className="review-secondary-btn" onClick={() => handleFileDownload(previewFile)}>
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const saveReview = async (nextStatus: Incident['status']) => {
    if (!incident) return;

    if (nextStatus === 'published' && !resolutionComments.trim()) {
      setError('Resolution comments are required before resolving an incident.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const now = new Date().toISOString();
      const updates: Partial<Incident> = {
        description: description.trim(),
        priority,
        status: nextStatus,
        updated_at: now,
        reviewed_at: now,
      };

      // Only include resolution_comments if user provided text
      if (resolutionComments.trim()) {
        updates.resolution_comments = resolutionComments.trim();
      }

      if (userId) {
        updates.reviewed_by = userId;
      }

      if (nextStatus === 'published') {
        updates.published_at = now;
      }

      const updated = await updateIncident(incident.id, updates);
      setIncident(updated);

      if (nextStatus === 'published') {
        navigate('/incidents/resolved');
      }
    } catch (err: any) {
      console.error('Error saving review:', err);

      const msg = String(err?.message || err);

      // Detect common PostgREST / Supabase schema error for missing column
      if (msg.toLowerCase().includes('resolution_comments') || msg.toLowerCase().includes('could not find') || msg.toLowerCase().includes('does not exist')) {
        setError('Database schema missing `resolution_comments` column. Run the migration to add it, or save without resolution comments.');
      } else {
        setError(msg || 'Failed to save incident review');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isResolved = useMemo(() => incident?.status === 'published', [incident]);

  return (
    <div className="incident-review-page">
      <div className="incident-review-header">
        <div>
          <p className="incident-review-eyebrow">Incident review</p>
          <h1>{incident?.title || 'Review incident'}</h1>
          <p>
            Edit the incident details, record resolution notes, and close it when the issue is confirmed handled.
          </p>
        </div>
        <div className="incident-review-actions-top">
          <button className="review-secondary-btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="incident-review-state">Loading incident...</div>
      ) : error ? (
        <div className="incident-review-state incident-review-error">{error}</div>
      ) : incident ? (
        <div className="incident-review-layout">
          <section className="incident-review-panel">
              <div className="incident-review-panel-header">
                <h2>Review details</h2>
                <span className={`review-status review-status-${incident.status}`}>{getStatusLabel(incident.status)}</span>
              </div>

            <label className="review-field">
              <span>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Incident['priority'])} disabled={isResolved}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>

            <label className="review-field">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                disabled={isResolved}
                placeholder="Explain the issue in detail"
              />
            </label>

            <label className="review-field">
              <span>Resolution Comments</span>
              <textarea
                value={resolutionComments}
                onChange={(e) => setResolutionComments(e.target.value)}
                rows={6}
                disabled={isResolved}
                placeholder="What was done to resolve this incident?"
              />
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 6 }}>
                Resolution comments are required when resolving an incident.
              </div>
            </label>

            <div className="review-action-row">
              <button className="review-secondary-btn" onClick={() => saveReview('reviewed')} disabled={isSaving || isResolved}>
                {isSaving ? 'Saving...' : 'Save Review'}
              </button>
              <button className="review-primary-btn" onClick={() => saveReview('published')} disabled={isSaving || isResolved}>
                {isSaving ? 'Resolving...' : 'Resolve Incident'}
              </button>
            </div>

            {isResolved && <p className="review-success-note">This incident is already resolved.</p>}
          </section>

          <aside className="incident-review-sidebar">
            <section className="incident-review-panel">
              <div className="incident-review-panel-header">
                <h2>Metadata</h2>
              </div>
              <div className="review-metadata-grid">
                <div>
                  <label>ID</label>
                  <span>{incident.id}</span>
                </div>
                <div>
                  <label>Sender</label>
                  <span>{incident.sender || 'Not provided'}</span>
                </div>
                <div>
                  <label>Created</label>
                  <span>{formatDate(incident.created_at)}</span>
                </div>
                <div>
                  <label>Updated</label>
                  <span>{formatDate(incident.updated_at)}</span>
                </div>
                <div>
                  <label>Reviewed</label>
                  <span>{incident.reviewed_at ? formatDate(incident.reviewed_at) : 'Not reviewed yet'}</span>
                </div>
                <div>
                  <label>Resolved</label>
                  <span>{incident.published_at ? formatDate(incident.published_at) : 'Not resolved yet'}</span>
                </div>
              </div>
            </section>

            <section className="incident-review-panel">
              <div className="incident-review-panel-header">
                <h2>Attachments</h2>
              </div>
              {filesLoading ? (
                <p>Loading files...</p>
              ) : incidentFiles.length === 0 ? (
                <p className="review-empty-state">No files attached</p>
              ) : (
                <div className="review-files-list">
                  {incidentFiles.map((file) => (
                    <article key={file.id} className="review-file-item">
                      <div>
                        <p className="review-file-name">{file.name}</p>
                        <p className="review-file-meta">Updated: {new Date(file.updated_at).toLocaleDateString()}</p>
                      </div>
                      <div className="review-file-actions">
                        {(isImage(file.name) || isPdf(file.name)) && (
                          <button className="review-secondary-btn" onClick={() => setPreviewFile(file.name)}>
                            Preview
                          </button>
                        )}
                        <button className="review-secondary-btn" onClick={() => handleFileDownload(file.name)}>
                          Download
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      ) : null}

      {renderPreviewModal()}
    </div>
  );
}