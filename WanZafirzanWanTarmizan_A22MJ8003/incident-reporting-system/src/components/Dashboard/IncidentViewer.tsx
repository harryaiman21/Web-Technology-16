/**
 * Incident Viewer Component
 * Displays searchable, filterable, sortable list of incidents
 * Features: search, filter by status/priority, sort, incident details modal
 * All lines fully commented for clarity
 */

import { useState, useEffect } from 'react';
import { getStatusLabelUpper } from '../../utils/status';
import { listIncidentFiles, generateSignedUrl } from '../../services/fileService';
import { useAuthContext } from '../../context/AuthContext';
import * as incidentService from '../../services/incidentService';
import './IncidentViewer.css';

/**
 * Interface for incident with metadata
 */
interface IncidentItem {
  // Incident ID
  id: string;
  // Incident title
  title: string;
  // Incident description
  description?: string;
  // Current status (draft, submitted, under_review, resolved, closed)
  status: 'draft' | 'submitted' | 'under_review' | 'resolved' | 'closed';
  // Priority level
  priority: 'low' | 'medium' | 'high' | 'critical';
  // Tags for categorization
  tags: string[];
  // Who created this incident
  created_by: string;
  // When it was created
  created_at: string;
  // Last update time
  updated_at: string;
  // Optional sender (email address) when incident created via RPA/email
  sender?: string;
}

/**
 * Incident Viewer Component
 * Main component for displaying and managing incidents
 */
export function IncidentViewer() {
  // Get current user from auth context
  const { userId } = useAuthContext();

  // List of all incidents
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Filter by status
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter by priority
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Sort field (created_at, updated_at, priority, status)
  const [sortBy, setSortBy] = useState<string>('created_at');

  // Sort direction (asc, desc)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Selected incident for detail view
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [incidentFiles, setIncidentFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedIncident) {
      setIncidentFiles([]);
      setPreviewFile(null);
      return;
    }

    const fetchFiles = async () => {
      try {
        setFilesLoading(true);
        const files = await listIncidentFiles(selectedIncident.id);
        setIncidentFiles(files || []);
      } catch (err) {
        console.error('Error listing files for incident:', err);
        setIncidentFiles([]);
      } finally {
        setFilesLoading(false);
      }
    };

    fetchFiles();
  }, [selectedIncident]);

  const PdfPreviewComponent = ({ fileName }: { fileName: string }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;
      const load = async () => {
        if (!selectedIncident) return;
        try {
          const url = await generateSignedUrl(`incidents/${selectedIncident.id}/${fileName}`, 3600);
          if (mounted) setPdfUrl(url);
        } catch (err) {
          console.error('Error getting pdf url', err);
        }
      };
      load();
      return () => { mounted = false; };
    }, [fileName]);

    if (!pdfUrl) return <p>Loading PDF...</p>;
    return <iframe src={pdfUrl} style={{ width: '100%', height: 500, border: 'none' }} title="PDF Preview" />;
  };

  const ImagePreviewComponent = ({ fileName }: { fileName: string }) => {
    const [imgUrl, setImgUrl] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;
      const load = async () => {
        if (!selectedIncident) return;
        try {
          const url = await generateSignedUrl(`incidents/${selectedIncident.id}/${fileName}`, 3600);
          if (mounted) setImgUrl(url);
        } catch (err) {
          console.error('Error getting image url', err);
        }
      };
      load();
      return () => { mounted = false; };
    }, [fileName]);

    if (!imgUrl) return <p>Loading image...</p>;
    return <img src={imgUrl} alt={fileName} style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }} />;
  };

  /**
   * Fetch incidents on component mount
   */
  useEffect(() => {
    // Function to fetch incidents
    const fetchIncidents = async () => {
      try {
        // Set loading state
        setIsLoading(true);
        setError(null);

        // Fetch incidents from service
        const data = await incidentService.getIncidents();

        // Extract incidents from response (handle paginated response)
        const incidentsList = Array.isArray(data) ? data : (data as any)?.data || [];

        if (import.meta.env.DEV) {
          try {
            console.debug('Fetched incidents (id -> sender):', incidentsList.map((i: any) => ({ id: i.id, sender: i.sender })));
          } catch (e) {
            /* ignore */
          }
        }
        // Set incidents state
        setIncidents(incidentsList);
      } catch (err: any) {
        // Handle error
        console.error('Error fetching incidents:', err);
        setError(err.message || 'Failed to fetch incidents');
      } finally {
        // Clear loading state
        setIsLoading(false);
      }
    };

    // Call fetch function
    fetchIncidents();
    if (import.meta.env.DEV) {
      // Log incidents for debugging sender presence (fetch once more to inspect API response)
      fetchIncidents().then(() => {
        // no-op
      });
    }
  }, [userId]);

  /**
   * Get priority color for badge
   * @param priority - Priority level
   * @returns Color class name
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return 'priority-critical';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  /**
   * Get status color for badge
   * @param status - Incident status
   * @returns Color class name
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'status-draft';
      case 'submitted':
        return 'status-submitted';
      case 'under_review':
        return 'status-review';
      case 'resolved':
        return 'status-resolved';
      case 'closed':
        return 'status-closed';
      default:
        return 'status-draft';
    }
  };

  /**
   * Format date for display
   * @param dateString - ISO date string
   * @returns Formatted date
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

  /**
   * Filter incidents based on search and filters
   * @returns Filtered and sorted incidents
   */
  const getFilteredAndSortedIncidents = (): IncidentItem[] => {
    // Start with all incidents
    let filtered = [...incidents];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(query) ||
        incident.description?.toLowerCase().includes(query) ||
        incident.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(incident => incident.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(incident => incident.priority === priorityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Determine sort values based on sortBy field
      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      // Apply sort direction
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Return sorted and filtered incidents
    return filtered;
  };

  // Get filtered incidents
  const filteredIncidents = getFilteredAndSortedIncidents();

  // JSX render
  return (
    <div className="incident-viewer">
      {/* Header section */}
      <div className="incident-viewer-header">
        {/* Title */}
        <h2 className="incident-viewer-title">Incidents</h2>

        {/* Subtitle */}
        <p className="incident-viewer-subtitle">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search and filters section */}
      <div className="incident-controls">
        {/* Search box */}
        <div className="search-box">
          {/* Search icon */}
          <span className="search-icon">🔍</span>

          {/* Search input */}
          <input
            type="text"
            className="search-input"
            placeholder="Search incidents by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters row */}
        <div className="filters-row">
          {/* Status filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority filter */}
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort by select */}
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created_at">Sort by Created</option>
            <option value="updated_at">Sort by Updated</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
          </select>

          {/* Sort direction toggle */}
          <button
            className="sort-direction-btn"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Content section */}
      {isLoading ? (
        /* Loading state */
        <div className="incident-viewer-loading">
          <div className="spinner"></div>
          <p>Loading incidents...</p>
        </div>
      ) : error ? (
        /* Error state */
        <div className="incident-viewer-error">
          <p>⚠️ {error}</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        /* Empty state */
        <div className="incident-viewer-empty">
          <p>No incidents found</p>
          <p className="empty-subtitle">Try adjusting your search or filters</p>
        </div>
      ) : (
        /* Incidents list */
        <div className="incidents-list">
          {/* Map over filtered incidents */}
          {filteredIncidents.map((incident) => (
            // Incident card
            <div
              key={incident.id}
              className="incident-card"
              onClick={() => setSelectedIncident(incident)}
            >
              {/* Card header with title and badges */}
              <div className="incident-card-header">
                {/* Title */}
                <h3 className="incident-card-title">{incident.title}</h3>

                {/* Badges container */}
                <div className="incident-card-badges">
                  {/* Status badge */}
                  <span className={`badge status-badge ${getStatusColor(incident.status)}`}>
                    {getStatusLabelUpper(incident.status)}
                  </span>

                  {/* Priority badge */}
                  <span className={`badge priority-badge ${getPriorityColor(incident.priority)}`}>
                    {incident.priority}
                  </span>
                </div>
              </div>

              {/* Card body with description */}
              {incident.description && (
                <p className="incident-card-description">
                  {incident.description.substring(0, 100)}
                  {incident.description.length > 100 ? '...' : ''}
                </p>
              )}

              {/* Sender */}
              <p className="incident-card-sender">Sender: {incident.sender || 'Not provided'}</p>

              {/* Tags display */}
              {incident.tags.length > 0 && (
                <div className="incident-tags">
                  {incident.tags.map((tag, idx) => (
                    <span key={idx} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Card footer with dates */}
              <div className="incident-card-footer">
                <span className="date-info">Created: {formatDate(incident.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal - shows when incident is selected */}
      {selectedIncident && (
        <div className="incident-detail-modal" onClick={() => setSelectedIncident(null)}>
          <div
            className="incident-detail-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setSelectedIncident(null)}
            >
              ×
            </button>

            <div className="modal-header">
              <h2>{selectedIncident.title}</h2>
              <div className="modal-badges">
                <span className={`priority-badge priority-${selectedIncident.priority}`}>
                  {selectedIncident.priority.toUpperCase()}
                </span>
                <span className={`status-badge status-${selectedIncident.status}`}>
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
                  <div className="incident-tags">
                    {selectedIncident.tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
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
                    {incidentFiles.map((file) => {
                      const parts = (file.name || '').split('.');
                      const ext = parts.length ? parts[parts.length - 1].toUpperCase() : '';
                      const isPreviewable = file.name.endsWith('.pdf') || ['jpg','jpeg','png','gif','webp'].some(e => file.name.endsWith(e));
                      return (
                        <div key={file.id} className="file-item">
                          <span className="file-icon">{ext}</span>
                          <div className="file-info">
                            <p className="file-name">{file.name}</p>
                            <p className="file-meta">Updated: {new Date(file.updated_at).toLocaleDateString()}</p>
                          </div>
                          <div className="file-actions">
                            {isPreviewable && (
                              <button className="file-preview-btn" onClick={() => setPreviewFile(file.name)}>Preview</button>
                            )}
                            <button className="file-download-btn" onClick={async () => {
                              try {
                                const filePath = `incidents/${selectedIncident.id}/${file.name}`;
                                const url = await generateSignedUrl(filePath, 3600);
                                window.open(url, '_blank');
                              } catch (err) {
                                console.error('Download error', err);
                                alert('Failed to download file');
                              }
                            }}>Download</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File preview modal */}
      {previewFile && (
        <div className="file-preview-modal" onClick={() => setPreviewFile(null)}>
          <div className="file-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setPreviewFile(null)}>×</button>
            <div className="file-preview-body">
              {previewFile.endsWith('.pdf') ? (
                <PdfPreviewComponent fileName={previewFile} />
              ) : (
                <ImagePreviewComponent fileName={previewFile} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
