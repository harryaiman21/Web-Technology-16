/**
 * Admin Dashboard Component
 * Displays critical incidents and system overview
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getIncidents } from '../../services/incidentService';
import { listIncidentFiles, generateSignedUrl } from '../../services/fileService';
import type { Incident } from '../../types';
import '../Dashboard/IncidentViewer.css';
import './AdminDashboard.css';
import { PieChart } from '../Charts/PieChart';
import { getStatusLabelUpper } from '../../utils/status';

/**
 * Incident item interface - use actual Incident type from types/index.ts
 */
type IncidentItem = Incident;

/**
 * File item interface
 */
interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  metadata?: any;
}

/**
 * Admin Dashboard Component
 */
export function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  // State
  const [criticalIncidents, setCriticalIncidents] = useState<IncidentItem[]>([]);
  const [allIncidents, setAllIncidents] = useState<IncidentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'reviewed' | 'published'>('all');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [incidentFiles, setIncidentFiles] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const quickView = new URLSearchParams(location.search).get('view');

  // Fetch incidents on mount
  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (quickView === 'draft') {
      setStatusFilter('draft');
    } else if (quickView === 'resolved') {
      setStatusFilter('published');
    } else if (quickView === 'submitted') {
      setStatusFilter('submitted');
    } else {
      setStatusFilter('all');
    }

    if (quickView) {
      document.getElementById('all-incidents-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [quickView]);

  /**
   * Fetch all incidents
   */
  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch incidents from service
      const data = await getIncidents();

      // Extract incidents from response (handle paginated response)
      const incidentsList = Array.isArray(data) ? data : (data as any)?.data || [];

      // Set all incidents
      setAllIncidents(incidentsList);

      // Filter critical and high priority incidents (for dashboard)
      const critical = incidentsList.filter(
        (inc) => (inc.priority === 'critical' || inc.priority === 'high') && inc.status !== 'published'
      );

      // Sort by priority (critical first) then by created_at (newest first)
      critical.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];

        if (priorityDiff !== 0) return priorityDiff;

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setCriticalIncidents(critical);
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incidents');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch files when incident is selected
  useEffect(() => {
    if (selectedIncident) {
      fetchIncidentFiles(selectedIncident.id);
    } else {
      setIncidentFiles([]);
    }
  }, [selectedIncident]);

  /**
   * Fetch files for an incident
   */
  const fetchIncidentFiles = async (incidentId: string) => {
    try {
      setFilesLoading(true);
      const files = await listIncidentFiles(incidentId);
      setIncidentFiles(files || []);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      setIncidentFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  /**
   * Handle file download
   */
  const handleFileDownload = async (fileName: string) => {
    try {
      if (!selectedIncident) return;
      
      const filePath = `incidents/${selectedIncident.id}/${fileName}`;
      const url = await generateSignedUrl(filePath, 3600);
      
      // Open file in new tab
      window.open(url, '_blank');
    } catch (err: any) {
      console.error('Error downloading file:', err);
      alert('Failed to download file');
    }
  };

  /**
   * Get file extension
   */
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  /**
   * Check if file is image
   */
  const isImage = (fileName: string): boolean => {
    const ext = getFileExtension(fileName);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  /**
   * Check if file is PDF
   */
  const isPdf = (fileName: string): boolean => {
    return getFileExtension(fileName) === 'pdf';
  };

  /**
   * Get file type icon
   */
  const getFileTypeIcon = (fileName: string): string => {
    const ext = getFileExtension(fileName);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (ext === 'txt') return '📋';
    return '📎';
  };

  /**
   * Get preview URL for file
   */
  const getPreviewUrl = async (fileName: string): Promise<string | null> => {
    try {
      if (!selectedIncident) return null;
      
      const filePath = `incidents/${selectedIncident.id}/${fileName}`;
      const url = await generateSignedUrl(filePath, 3600);
      return url;
    } catch (err: any) {
      console.error('Error getting preview URL:', err);
      return null;
    }
  };

  /**
   * Get modal content styles for PDF
   */
  const PdfPreviewModal = ({ fileName }: { fileName: string }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    
    useEffect(() => {
      getPreviewUrl(fileName).then(setPdfUrl);
    }, [fileName]);

    if (!pdfUrl) return <p>Loading PDF...</p>;

    return (
      <iframe
        src={pdfUrl}
        style={{
          width: '100%',
          height: '500px',
          border: 'none',
          borderRadius: '4px'
        }}
        title="PDF Preview"
      />
    );
  };

  /**
   * Get modal content styles for image
   */
  const ImagePreviewModal = ({ fileName }: { fileName: string }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    
    useEffect(() => {
      getPreviewUrl(fileName).then(setImageUrl);
    }, [fileName]);

    if (!imageUrl) return <p>Loading image...</p>;

    return (
      <img
        src={imageUrl}
        alt={fileName}
        style={{
          width: '100%',
          maxHeight: '500px',
          objectFit: 'contain',
          borderRadius: '4px'
        }}
      />
    );
  };

  /**
   * File preview modal state
   */
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  /**
   * Render file preview modal
   */
  const renderFilePreview = () => {
    if (!previewFile) return null;

    const isImageFile = isImage(previewFile);
    const isPdfFile = isPdf(previewFile);

    return (
      <div 
        className="file-preview-modal"
        onClick={() => setPreviewFile(null)}
      >
        <div
          className="file-preview-content"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="modal-close-btn"
            onClick={() => setPreviewFile(null)}
          >
            ×
          </button>

          <div className="file-preview-body">
            {isImageFile && <ImagePreviewModal fileName={previewFile} />}
            {isPdfFile && <PdfPreviewModal fileName={previewFile} />}
            {!isImageFile && !isPdfFile && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Preview not available for this file type</p>
                <button
                  className="file-download-btn"
                  onClick={() => handleFileDownload(previewFile)}
                >
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Open selected incident in dedicated review page
   */
  const handleReviewIncident = () => {
    if (!selectedIncident) return;
    navigate(`/incidents/review/${selectedIncident.id}`);
  };

  const getFilteredIncidents = (): IncidentItem[] => {
    let filtered = allIncidents;

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((inc) => inc.priority === priorityFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inc) => inc.status === statusFilter);
    }

    return filtered;
  };

  /**
   * Get priority color
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return '#991B1B';
      case 'high':
        return '#92400e';
      case 'medium':
        return '#1e40af';
      case 'low':
        return '#166534';
      default:
        return '#666';
    }
  };

  /**
   * Format date
   */
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

  // JSX render
  return (
    <div className="admin-dashboard">
      {/* Welcome section */}
      <div className="dashboard-welcome">
        <h1>Welcome, Admin</h1>
        <p>Here's an overview of critical incidents requiring attention</p>
      </div>

      {/* Active incidents by priority */}
      <div className="priority-chart-section">
        <div className="section-header">
          <h2>Active Incidents by Priority</h2>
          <span className="incident-count">{allIncidents.filter(i => i.status !== 'published').length}</span>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <PieChart
            data={['critical', 'high', 'medium', 'low'].map((p) => ({
              label: p,
              value: allIncidents.filter(i => i.priority === p && i.status !== 'published').length,
              color: p === 'critical' ? '#991B1B' : p === 'high' ? '#92400e' : p === 'medium' ? '#1e40af' : '#166534'
            }))}
            size={160}
            innerRadius={48}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['critical', 'high', 'medium', 'low'].map((p) => {
              const count = allIncidents.filter(i => i.priority === p && i.status !== 'published').length;
              const color = p === 'critical' ? '#991B1B' : p === 'high' ? '#92400e' : p === 'medium' ? '#1e40af' : '#166534';
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: 12, height: 12, background: color, display: 'inline-block', borderRadius: 3 }}></span>
                  <strong style={{ textTransform: 'capitalize', minWidth: 80 }}>{p}</strong>
                  <span style={{ color: '#666' }}>{count} active</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical incidents section */}
      <div className="critical-section">
        <div className="section-header">
          <h2>🔴 Critical & High Priority Incidents</h2>
          <span className="incident-count">{criticalIncidents.length} incidents</span>
        </div>

        {isLoading ? (
          <div className="incident-viewer-loading">
            <div className="spinner"></div>
            <p>Loading incidents...</p>
          </div>
        ) : error ? (
          <div className="incident-viewer-error">
            <p>{error}</p>
          </div>
        ) : criticalIncidents.length === 0 ? (
          <div className="incident-viewer-empty">
            <p>✅ No critical incidents</p>
            <p className="empty-subtitle">All incidents are under control</p>
          </div>
        ) : (
          <div className="critical-incidents-list">
            {criticalIncidents.map((incident) => (
              <div
                key={incident.id}
                className="critical-incident-card"
                onClick={() => setSelectedIncident(incident)}
              >
                {/* Priority indicator */}
                <div
                  className="priority-indicator"
                  style={{ backgroundColor: getPriorityColor(incident.priority) }}
                ></div>

                {/* Content */}
                <div className="critical-card-content">
                  <div className="critical-card-header">
                    <h3>{incident.title}</h3>
                    <span
                      className={`priority-badge priority-${incident.priority}`}
                    >
                      {incident.priority.toUpperCase()}
                    </span>
                  </div>

                  <p className="critical-card-description">{incident.description}</p>

                  {incident.sender && (
                    <p className="critical-card-sender">
                      Sender: {incident.sender}
                    </p>
                  )}

                  <div className="critical-card-footer">
                    <span className="created-date">
                      {formatDate(incident.created_at)}
                    </span>
                    <span className={`status-badge status-${incident.status}`}>
                      {getStatusLabelUpper(incident.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All incidents section with filters */}
      <div className="all-incidents-section" id="all-incidents-section">
        <div className="section-header">
          <h2>All Incidents</h2>
          <span className="incident-count">{getFilteredIncidents().length} incidents</span>
        </div>

        {/* Priority filter */}
        <div className="filter-container">
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ marginLeft: '12px' }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="published">Resolved</option>
          </select>
        </div>

        {/* Incidents list */}
        <div className="incidents-list">
          {getFilteredIncidents().length === 0 ? (
            <div className="incident-viewer-empty">
              <p>No incidents found</p>
            </div>
          ) : (
            getFilteredIncidents().map((incident) => (
              <div
                key={incident.id}
                className="incident-card"
                onClick={() => setSelectedIncident(incident)}
              >
                {/* Card header */}
                <div className="incident-card-header">
                  <h3 className="incident-card-title">{incident.title}</h3>
                  <div className="incident-card-badges">
                    <span
                      className={`priority-badge priority-${incident.priority}`}
                    >
                      {incident.priority.toUpperCase()}
                    </span>
                    <span className={`status-badge status-${incident.status}`}>
                      {getStatusLabelUpper(incident.status)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="incident-card-description">{incident.description}</p>

                {incident.sender && (
                  <p className="incident-card-sender">Sender: {incident.sender}</p>
                )}

                {/* Tags */}
                {incident.tags.length > 0 && (
                  <div className="incident-tags">
                    {incident.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="incident-card-footer">
                  {formatDate(incident.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedIncident && (
        <div className="incident-detail-modal" onClick={() => setSelectedIncident(null)}>
          <div
            className="incident-detail-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="modal-close-btn"
              onClick={() => setSelectedIncident(null)}
            >
              ×
            </button>

            {/* Modal header */}
            <div className="modal-header">
              <h2>{selectedIncident.title}</h2>
              <div className="modal-badges">
                <span
                  className={`priority-badge priority-${selectedIncident.priority}`}
                >
                  {selectedIncident.priority.toUpperCase()}
                </span>
                <span
                  className={`status-badge status-${selectedIncident.status}`}
                >
                  {getStatusLabelUpper(selectedIncident.status)}
                </span>
              </div>
            </div>

            {/* Modal body */}
            <div className="modal-body">
              {/* Description */}
              <div className="modal-section">
                <h3>Description</h3>
                <p>{selectedIncident.description}</p>
              </div>

              {/* Tags */}
              {selectedIncident.tags.length > 0 && (
                <div className="modal-section">
                  <h3>Tags</h3>
                  <div className="incident-tags">
                    {selectedIncident.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
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
                    <label>ID</label>
                    <span className="metadata-id">
                      {selectedIncident.id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="metadata-item">
                    <label>Sender</label>
                    <span>{selectedIncident.sender || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Files section */}
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
                          <p className="file-meta">
                            Updated: {new Date(file.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="file-actions">
                          {(isImage(file.name) || isPdf(file.name)) && (
                            <button
                              className="file-preview-btn"
                              onClick={() => setPreviewFile(file.name)}
                              title="Preview file"
                            >
                              Preview
                            </button>
                          )}
                          <button
                            className="file-download-btn"
                            onClick={() => handleFileDownload(file.name)}
                            title="Download file"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="modal-section" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', flexWrap: 'wrap' }}>
                {(selectedIncident.status === 'draft' || (selectedIncident.status as string) === 'submitted') && (
                  <button
                    className="btn btn-success"
                    onClick={handleReviewIncident}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    ✓ Review & Approve
                  </button>
                )}
                {selectedIncident.status === 'reviewed' && (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={handleReviewIncident}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      ✓ Resolve & Close
                    </button>
                    <span style={{ padding: '10px 16px', color: '#10b981', fontWeight: 'bold' }}>
                      ✓ Reviewed
                    </span>
                  </>
                )}
                {selectedIncident.status === 'published' && (
                  <span style={{ padding: '10px 16px', color: '#10b981', fontWeight: 'bold' }}>
                    ✓ Resolved & Closed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File preview modal */}
      {renderFilePreview()}
    </div>
  );
}
