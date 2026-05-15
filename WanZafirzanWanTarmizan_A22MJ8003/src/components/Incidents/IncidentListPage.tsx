import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getIncidents } from '../../services/incidentService';
import { listIncidentFiles, generateSignedUrl } from '../../services/fileService';
import type { Incident } from '../../types';
import '../Dashboard/IncidentViewer.css';
import '../Admin/AdminDashboard.css';
import './IncidentListPage.css';
import { getStatusLabelUpper } from '../../utils/status';

type IncidentViewMode = 'all' | 'submitted' | 'draft' | 'resolved';

interface IncidentListPageProps {
  view: IncidentViewMode;
  title: string;
  subtitle: string;
}

interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  metadata?: any;
}

export function IncidentListPage({ view, title, subtitle }: IncidentListPageProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentFiles, setIncidentFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getIncidents({ limit: 1000, page: 1, sortBy: 'created_at', sortOrder: 'desc' });
        const incidentsList = Array.isArray(data) ? data : (data as any)?.data || [];
        setIncidents(incidentsList);
      } catch (err: any) {
        console.error('Error fetching incidents:', err);
        setError(err.message || 'Failed to load incidents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncidents();
  }, [view]);

  useEffect(() => {
    if (!selectedIncident) {
      setIncidentFiles([]);
      setPreviewFile(null);
      return;
    }

    const fetchIncidentFiles = async () => {
      try {
        setFilesLoading(true);
        const files = await listIncidentFiles(selectedIncident.id);
        setIncidentFiles(files || []);
      } catch (err) {
        console.error('Error fetching files:', err);
        setIncidentFiles([]);
      } finally {
        setFilesLoading(false);
      }
    };

    fetchIncidentFiles();
  }, [selectedIncident]);

  const filteredIncidents = useMemo(() => {
    let viewFiltered: Incident[];

    if (view === 'all') {
      viewFiltered = incidents;
    } else if (view === 'submitted') {
      viewFiltered = incidents.filter((incident) => {
        const status = incident.status as string;
        return status === 'submitted' || status === 'reviewed';
      });
    } else if (view === 'draft') {
      viewFiltered = incidents.filter((incident) => (incident.status as string) === 'draft');
    } else {
      viewFiltered = incidents.filter((incident) => (incident.status as string) === 'published');
    }

    if (!searchQuery) {
      return viewFiltered;
    }

    return viewFiltered.filter((incident) => {
      const title = (incident.title || '').toLowerCase();
      const description = (incident.description || '').toLowerCase();
      const sender = (incident.sender || '').toLowerCase();
      const tags = Array.isArray(incident.tags) ? incident.tags.join(' ').toLowerCase() : '';
      const id = (incident.id || '').toLowerCase();

      return (
        title.includes(searchQuery) ||
        description.includes(searchQuery) ||
        sender.includes(searchQuery) ||
        tags.includes(searchQuery) ||
        id.includes(searchQuery)
      );
    });
  }, [incidents, view, searchQuery]);

  // Sorting options
  const [sortOption, setSortOption] = useState<'priority_desc' | 'priority_asc' | 'date_desc' | 'date_asc'>('date_desc');

  const sortedIncidents = useMemo(() => {
    const copy = [...filteredIncidents];
    switch (sortOption) {
      case 'priority_desc':
        return copy.sort((a, b) => {
          const order: any = { critical: 4, high: 3, medium: 2, low: 1 };
          return (order[b.priority] || 0) - (order[a.priority] || 0);
        });
      case 'priority_asc':
        return copy.sort((a, b) => {
          const order: any = { critical: 4, high: 3, medium: 2, low: 1 };
          return (order[a.priority] || 0) - (order[b.priority] || 0);
        });
      case 'date_asc':
        return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'date_desc':
      default:
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [filteredIncidents, sortOption]);

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

  const getFileTypeIcon = (fileName: string): string => {
    const ext = getFileExtension(fileName);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (ext === 'txt') return '📋';
    return '📎';
  };

  const handleFileDownload = async (fileName: string) => {
    if (!selectedIncident) return;

    const filePath = `incidents/${selectedIncident.id}/${fileName}`;
    const url = await generateSignedUrl(filePath, 3600);
    window.open(url, '_blank');
  };

  const PdfPreview = ({ fileName }: { fileName: string }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
      if (!selectedIncident) return;

      const load = async () => {
        const filePath = `incidents/${selectedIncident.id}/${fileName}`;
        setPdfUrl(await generateSignedUrl(filePath, 3600));
      };

      load();
    }, [fileName]);

    if (!pdfUrl) return <p>Loading PDF...</p>;

    return <iframe src={pdfUrl} style={{ width: '100%', height: '500px', border: 'none', borderRadius: '4px' }} title="PDF Preview" />;
  };

  const ImagePreview = ({ fileName }: { fileName: string }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
      if (!selectedIncident) return;

      const load = async () => {
        const filePath = `incidents/${selectedIncident.id}/${fileName}`;
        setImageUrl(await generateSignedUrl(filePath, 3600));
      };

      load();
    }, [fileName]);

    if (!imageUrl) return <p>Loading image...</p>;

    return <img src={imageUrl} alt={fileName} style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '4px' }} />;
  };

  const renderFilePreview = () => {
    if (!previewFile || !selectedIncident) return null;

    const imageFile = isImage(previewFile);
    const pdfFile = isPdf(previewFile);

    return (
      <div className="file-preview-modal" onClick={() => setPreviewFile(null)}>
        <div className="file-preview-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setPreviewFile(null)}>×</button>
          <div className="file-preview-body">
            {imageFile && <ImagePreview fileName={previewFile} />}
            {pdfFile && <PdfPreview fileName={previewFile} />}
            {!imageFile && !pdfFile && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Preview not available for this file type</p>
                <button className="file-download-btn" onClick={() => handleFileDownload(previewFile)}>
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="incident-list-page">
      <div className="incident-list-page-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <span className="incident-list-count">{filteredIncidents.length} incidents</span>
      </div>

      {isLoading ? (
        <div className="incident-list-state">Loading incidents...</div>
      ) : error ? (
        <div className="incident-list-state incident-list-error">{error}</div>
      ) : filteredIncidents.length === 0 ? (
        <div className="incident-list-state">No incidents found</div>
      ) : (
        <div className="incident-list-results">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontWeight: 600 }}>Sort:</label>
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value as any)}>
              <option value="priority_desc">Priority: High → Low</option>
              <option value="priority_asc">Priority: Low → High</option>
              <option value="date_desc">Date: Newest → Oldest</option>
              <option value="date_asc">Date: Oldest → Newest</option>
            </select>
          </div>

          <div className="incident-list-grid">
            {sortedIncidents.map((incident) => (
              <article
                key={incident.id}
                className="incident-list-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedIncident(incident)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIncident(incident);
                  }
                }}
              >
                <div className="incident-list-card-header">
                  <h2>{incident.title}</h2>
                  <span className={`incident-list-badge incident-list-priority-${incident.priority}`}>
                    {incident.priority.toUpperCase()}
                  </span>
                  {incident.status !== 'published' && (
                    <button
                      className="incident-review-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/incidents/review/${incident.id}`);
                      }}
                      style={{ marginLeft: 8, padding: '6px 10px', fontSize: 12, borderRadius: 6 }}
                    >
                      Review
                    </button>
                  )}
                </div>

                <p className="incident-list-description">{incident.description}</p>

                <p className="incident-list-sender">Sender: {incident.sender || 'Not provided'}</p>

                {incident.tags.length > 0 && (
                  <div className="incident-list-tags">
                    {incident.tags.map((tag) => (
                      <span key={tag} className="incident-list-tag">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="incident-list-footer">
                  <span className={`incident-list-status incident-list-status-${incident.status}`}>
                    {getStatusLabelUpper(incident.status)}
                  </span>
                  <span>{formatDate(incident.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedIncident && (
        <div className="incident-detail-modal" onClick={() => setSelectedIncident(null)}>
          <div className="incident-detail-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedIncident(null)} aria-label="Close">
              ✕
            </button>

            <div className="modal-header">
              <h2>{selectedIncident.title}</h2>
              <div className="modal-badges">
                <span className={`incident-list-badge incident-list-priority-${selectedIncident.priority}`}>
                  {selectedIncident.priority.toUpperCase()}
                </span>
                <span className={`incident-list-status incident-list-status-${selectedIncident.status}`}>
                  {getStatusLabelUpper(selectedIncident.status)}
                </span>
              </div>
            </div>

            <div className="modal-body">
              {selectedIncident.description && (
                <div className="modal-section">
                  <h3>Description</h3>
                  <p>{selectedIncident.description}</p>
                </div>
              )}

              {selectedIncident.tags.length > 0 && (
                <div className="modal-section">
                  <h3>Tags</h3>
                  <div className="incident-list-tags">
                    {selectedIncident.tags.map((tag) => (
                      <span key={tag} className="incident-list-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-section">
                <h3>Metadata</h3>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <label>Created</label>
                    <span>{formatDate(selectedIncident.created_at)}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Updated</label>
                    <span>{formatDate(selectedIncident.updated_at)}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Sender</label>
                    <span>{selectedIncident.sender || 'Not provided'}</span>
                  </div>
                  <div className="metadata-item">
                    <label>ID</label>
                    <span className="metadata-id">{selectedIncident.id.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>Attachments</h3>
                {filesLoading ? (
                  <p>Loading files...</p>
                ) : incidentFiles.length === 0 ? (
                  <p style={{ color: '#999' }}>No files attached</p>
                ) : (
                  <div className="files-list">
                    {incidentFiles.map((file) => (
                      <div key={file.id} className="file-item">
                        <span className="file-icon">{getFileTypeIcon(file.name)}</span>
                        <div className="file-info">
                          <p className="file-name">{file.name}</p>
                          <p className="file-meta">Updated: {new Date(file.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div className="file-actions">
                          {(isImage(file.name) || isPdf(file.name)) && (
                            <button className="file-preview-btn" onClick={() => setPreviewFile(file.name)} title="Preview file">
                              Preview
                            </button>
                          )}
                          <button className="file-download-btn" onClick={() => handleFileDownload(file.name)} title="Download file">
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {renderFilePreview()}
    </div>
  );
}

export default IncidentListPage;