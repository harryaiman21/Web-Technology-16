/**
 * Upload Console Component
 * Handles incident file uploads with drag-drop, file validation, and duplicate detection
 * Features: drag-drop upload, file preview, validation, duplicate detection, batch upload
 * All lines are fully commented for clarity
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { uploadFile, calculateFileHash } from '../../services/fileService';
import { createIncident, checkForDuplicate } from '../../services/incidentService';
import { handleError } from '../../utils/helpers';
import './UploadConsole.css';

/**
 * Interface for upload file with metadata
 */
interface UploadedFile {
  // File object from input
  file: File;
  // SHA-256 hash of file content
  hash: string;
  // Preview URL for images
  preview?: string;
  // Upload progress percentage
  progress: number;
  // Current upload status
  status: 'pending' | 'uploading' | 'success' | 'error' | 'duplicate';
  // Error message if upload failed
  error?: string;
}

/**
 * Interface for incident details form
 */
interface IncidentDetails {
  // Incident title/subject
  title: string;
  // Detailed description of incident
  description: string;
  // Priority level
  priority: 'low' | 'medium' | 'high' | 'critical';
  // Tags for categorization
  tags: string[];
}

/**
 * Upload Console Component
 * Main component for uploading incident files
 */
export function UploadConsole() {
  // Get current user from auth context
  const { userId } = useAuthContext();
  
  // Get navigation hook to redirect after upload
  const navigate = useNavigate();

  // Reference to hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-drop active state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // List of files selected for upload
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);

  // Incident details form data
  const [incidentDetails, setIncidentDetails] = useState<IncidentDetails>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
  });

  // Current tag input value
  const [tagInput, setTagInput] = useState<string>('');

  // Overall upload status
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');

  // Error message for display
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Show/hide incident details form
  const [showDetailsForm, setShowDetailsForm] = useState<boolean>(false);

  /**
   * Handle drag over event
   * Highlight drop zone when dragging files
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Prevent default drag behavior
    e.preventDefault();

    // Prevent propagation to parent elements
    e.stopPropagation();

    // Set dragging state to true
    setIsDragging(true);
  };

  /**
   * Handle drag leave event
   * Remove highlight when leaving drop zone
   */
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Prevent default drag behavior
    e.preventDefault();

    // Prevent propagation to parent elements
    e.stopPropagation();

    // Set dragging state to false
    setIsDragging(false);
  };

  /**
   * Handle drop event
   * Process dropped files
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // Prevent default drop behavior
    e.preventDefault();

    // Prevent propagation to parent elements
    e.stopPropagation();

    // Set dragging state to false
    setIsDragging(false);

    // Get dropped files from drag event
    const droppedFiles = Array.from(e.dataTransfer.files);

    // Process the dropped files
    processFiles(droppedFiles);
  };

  /**
   * Handle file input change
   * Process selected files from file picker
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get selected files from input
    const inputFiles = Array.from(e.target.files || []);

    // Process the selected files
    processFiles(inputFiles);
  };

  /**
   * Process files for upload
   * Validates files and adds them to upload queue
   */
  const processFiles = async (files: File[]) => {
    // Clear previous error messages
    setErrorMessage('');

    // Array to store processed files
    const processedFiles: UploadedFile[] = [];

    // Iterate through each file
    for (const file of files) {
      try {
        // Calculate hash of file for duplicate detection
        const hash = await calculateFileHash(file);

        // Check if file is allowed type
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg'];

        // If file type not allowed, skip with error
        if (!allowedTypes.includes(file.type)) {
          // Continue to next file
          continue;
        }

        // Create preview URL for images
        let preview: string | undefined = undefined;

        // Check if file is image
        if (file.type.startsWith('image/')) {
          // Create object URL for image preview
          preview = URL.createObjectURL(file);
        }

        // Create upload file object
        const uploadedFile: UploadedFile = {
          file,
          hash,
          preview,
          progress: 0,
          status: 'pending',
        };

        // Add to processed files array
        processedFiles.push(uploadedFile);
      } catch (error) {
        // Log error for debugging
        console.error('Error processing file:', error);
      }
    }

    // Add processed files to existing selected files
    setSelectedFiles(prev => [...prev, ...processedFiles]);

    // Show incident details form if files were selected
    if (processedFiles.length > 0) {
      setShowDetailsForm(true);
    }
  };

  /**
   * Handle title input change
   * Update incident title state
   */
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update title in incident details
    setIncidentDetails(prev => ({
      ...prev,
      title: e.target.value,
    }));
  };

  /**
   * Handle description input change
   * Update incident description state
   */
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Update description in incident details
    setIncidentDetails(prev => ({
      ...prev,
      description: e.target.value,
    }));
  };

  /**
   * Handle priority selection change
   * Update incident priority state
   */
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Update priority in incident details
    setIncidentDetails(prev => ({
      ...prev,
      priority: e.target.value as 'low' | 'medium' | 'high' | 'critical',
    }));
  };

  /**
   * Handle tag input change
   * Update tag input state
   */
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update tag input value
    setTagInput(e.target.value);
  };

  /**
   * Add tag to incident details
   * Called when user presses Enter or clicks add button
   */
  const addTag = () => {
    // Check if tag input is not empty
    if (tagInput.trim()) {
      // Add tag to incident details
      setIncidentDetails(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));

      // Clear tag input
      setTagInput('');
    }
  };

  /**
   * Remove tag from incident details
   * Called when user clicks remove button on tag
   */
  const removeTag = (index: number) => {
    // Remove tag at specified index
    setIncidentDetails(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  /**
   * Remove file from upload queue
   * Called when user clicks remove button on file
   */
  const removeFile = (index: number) => {
    // Get file being removed
    const removedFile = selectedFiles[index];

    // Revoke preview URL if exists to free memory
    if (removedFile.preview) {
      URL.revokeObjectURL(removedFile.preview);
    }

    // Remove file from selected files
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Handle upload button click
   * Validates and uploads all selected files
   */
  const handleUpload = async () => {
    // Check if incident title is provided
    if (!incidentDetails.title.trim()) {
      // Show error message
      setErrorMessage('Please provide an incident title');
      return;
    }

    // Check if incident description is provided
    if (!incidentDetails.description.trim()) {
      // Show error message
      setErrorMessage('Please provide an incident description');
      return;
    }

    // Check if files are selected
    if (selectedFiles.length === 0) {
      // Show error message
      setErrorMessage('Please select at least one file to upload');
      return;
    }

    // Set upload status to uploading
    setUploadStatus('uploading');

    // Clear error message
    setErrorMessage('');

    try {
      // Create incident record in database
      const incident = await createIncident({
        title: incidentDetails.title,
        description: incidentDetails.description,
        priority: incidentDetails.priority,
        tags: incidentDetails.tags,
        status: 'draft',
        created_by: userId || '',
      });

      // Update selected files to uploading status
      setSelectedFiles(prev =>
        prev.map(file => ({
          ...file,
          status: 'uploading',
        }))
      );

      // Upload all files
      const uploadPromises = selectedFiles.map((uploadedFile, index) =>
        (async () => {
          try {
            // Check for duplicate using file hash
            const isDuplicate = await checkForDuplicate(uploadedFile.hash);

            // If duplicate found, update status
            if (isDuplicate) {
              // Update file status to duplicate
              setSelectedFiles(prev => {
                const updated = [...prev];
                updated[index].status = 'duplicate';
                updated[index].error = 'This file has been uploaded in the last 14 days';
                return updated;
              });

              // Skip uploading this file
              return { success: false };
            }

            // Upload file to storage
            await uploadFile(uploadedFile.file, incident.id);

            // Update file status to success
            setSelectedFiles(prev => {
              const updated = [...prev];
              updated[index].status = 'success';
              updated[index].progress = 100;
              return updated;
            });

            return { success: true };
          } catch (error) {
            // Update file status to error
            setSelectedFiles(prev => {
              const updated = [...prev];
              updated[index].status = 'error';
              updated[index].error = handleError(error);
              return updated;
            });

            return { success: false };
          }
        })()
      );

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);

      // Check if any files uploaded successfully
      const anySuccess = results.some(r => r.success);

      // Set upload status based on results
      if (anySuccess) {
        setUploadStatus('completed');
        // Redirect to dashboard after 2 seconds to show success message
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setUploadStatus('error');
        setErrorMessage('No files were uploaded successfully');
      }
    } catch (error) {
      // Set upload status to error
      setUploadStatus('error');

      // Update error message
      setErrorMessage(handleError(error));
    }
  };

  /**
   * Handle reset button click
   * Clear all selected files and reset form
   */
  const handleReset = () => {
    // Revoke all preview URLs
    selectedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });

    // Clear selected files
    setSelectedFiles([]);

    // Reset incident details
    setIncidentDetails({
      title: '',
      description: '',
      priority: 'medium',
      tags: [],
    });

    // Clear tag input
    setTagInput('');

    // Hide details form
    setShowDetailsForm(false);

    // Reset upload status
    setUploadStatus('idle');

    // Clear error message
    setErrorMessage('');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // JSX render
  return (
    <div className="upload-console-container">
      {/* Console header */}
      <div className="console-header">
        {/* Title */}
        <h2 className="console-title">Upload Incident Report</h2>

        {/* Subtitle */}
        <p className="console-subtitle">
          Upload incident files and provide details. Supports PDF, DOCX, TXT, PNG, JPG
        </p>
        
        {/* Status explanation */}
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '14px' }}>
          <p style={{ margin: '0 0 6px 0' }}>
            <strong>Note:</strong> When you upload here, the incident status is set to <strong>Draft</strong> - waiting for admin review.
          </p>
          <p style={{ margin: '0' }}>
            Once an admin reviews and approves it, the status changes to <strong>Reviewed</strong> and it becomes active in the system.
          </p>
        </div>
      </div>

      {/* Main console content */}
      <div className="console-content">
        {/* Error banner if exists */}
        {errorMessage && (
          <div className="error-banner" role="alert">
            {/* Error icon */}
            <span className="error-icon">⚠️</span>

            {/* Error message */}
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Drag-drop zone */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            aria-hidden="true"
          />

          {/* Drop zone content */}
          <div className="drop-zone-content">
            {/* Icon */}
            <span className="drop-icon">📁</span>

            {/* Main text */}
            <h3 className="drop-title">
              {isDragging ? 'Drop files here' : 'Drag files here or click to select'}
            </h3>

            {/* Description */}
            <p className="drop-description">
              Upload incident documents (PDF, DOCX, TXT) or images (PNG, JPG)
            </p>
          </div>
        </div>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="files-section">
            {/* Section title */}
            <h3 className="section-title">Selected Files ({selectedFiles.length})</h3>

            {/* Files list */}
            <div className="files-list">
              {/* Iterate through selected files */}
              {selectedFiles.map((uploadedFile, index) => (
                <div key={index} className={`file-item status-${uploadedFile.status}`}>
                  {/* File preview or icon */}
                  <div className="file-preview">
                    {uploadedFile.preview ? (
                      <img src={uploadedFile.preview} alt="preview" />
                    ) : (
                      <span className="file-icon">📄</span>
                    )}
                  </div>

                  {/* File details */}
                  <div className="file-details">
                    {/* File name */}
                    <p className="file-name">{uploadedFile.file.name}</p>

                    {/* File size */}
                    <p className="file-size">
                      {(uploadedFile.file.size / 1024).toFixed(2)} KB
                    </p>

                    {/* Error message if exists */}
                    {uploadedFile.error && (
                      <p className="file-error">{uploadedFile.error}</p>
                    )}
                  </div>

                  {/* File status indicator */}
                  <div className="file-status">
                    {uploadedFile.status === 'pending' && <span className="status-badge pending">Pending</span>}
                    {uploadedFile.status === 'uploading' && (
                      <>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${uploadedFile.progress}%` }}></div>
                        </div>
                        <span className="status-text">{uploadedFile.progress}%</span>
                      </>
                    )}
                    {uploadedFile.status === 'success' && <span className="status-badge success">✓ Uploaded</span>}
                    {uploadedFile.status === 'error' && <span className="status-badge error">✗ Failed</span>}
                    {uploadedFile.status === 'duplicate' && <span className="status-badge duplicate">⚠ Duplicate</span>}
                  </div>

                  {/* Remove button */}
                  <button
                    className="file-remove"
                    onClick={() => removeFile(index)}
                    disabled={uploadedFile.status === 'uploading'}
                    aria-label={`Remove ${uploadedFile.file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incident details form */}
        {showDetailsForm && (
          <div className="details-section">
            {/* Section title */}
            <h3 className="section-title">Incident Details</h3>

            {/* Form group for title */}
            <div className="form-group">
              {/* Label */}
              <label htmlFor="incident-title" className="form-label">
                Incident Title
                <span className="required-indicator">*</span>
              </label>

              {/* Input */}
              <input
                id="incident-title"
                type="text"
                className="form-input"
                placeholder="Brief summary of the incident"
                value={incidentDetails.title}
                onChange={handleTitleChange}
                disabled={uploadStatus === 'uploading'}
              />
            </div>

            {/* Form group for description */}
            <div className="form-group">
              {/* Label */}
              <label htmlFor="incident-description" className="form-label">
                Description
                <span className="required-indicator">*</span>
              </label>

              {/* Textarea */}
              <textarea
                id="incident-description"
                className="form-textarea"
                placeholder="Detailed description of the incident"
                rows={4}
                value={incidentDetails.description}
                onChange={handleDescriptionChange}
                disabled={uploadStatus === 'uploading'}
              />
            </div>

            {/* Form group for priority */}
            <div className="form-group">
              {/* Label */}
              <label htmlFor="incident-priority" className="form-label">
                Priority
              </label>

              {/* Select */}
              <select
                id="incident-priority"
                className="form-select"
                value={incidentDetails.priority}
                onChange={handlePriorityChange}
                disabled={uploadStatus === 'uploading'}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Form group for tags */}
            <div className="form-group">
              {/* Label */}
              <label htmlFor="incident-tags" className="form-label">
                Tags
              </label>

              {/* Tag input */}
              <div className="tag-input-container">
                {/* Input */}
                <input
                  id="incident-tags"
                  type="text"
                  className="form-input"
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  disabled={uploadStatus === 'uploading'}
                />

                {/* Add button */}
                <button
                  type="button"
                  className="add-tag-btn"
                  onClick={addTag}
                  disabled={uploadStatus === 'uploading' || !tagInput.trim()}
                >
                  Add
                </button>
              </div>

              {/* Tags list */}
              {incidentDetails.tags.length > 0 && (
                <div className="tags-list">
                  {incidentDetails.tags.map((tag, index) => (
                    <div key={index} className="tag">
                      {/* Tag text */}
                      <span>{tag}</span>

                      {/* Remove tag button */}
                      <button
                        type="button"
                        className="tag-remove"
                        onClick={() => removeTag(index)}
                        aria-label={`Remove tag ${tag}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="action-buttons">
          {/* Upload button */}
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploadStatus === 'uploading' || selectedFiles.length === 0 || !showDetailsForm}
            aria-busy={uploadStatus === 'uploading'}
          >
            {uploadStatus === 'uploading' ? (
              <>
                <span className="spinner"></span>
                <span>Uploading...</span>
              </>
            ) : (
              'Upload Incident'
            )}
          </button>

          {/* Reset button */}
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={uploadStatus === 'uploading'}
          >
            Clear
          </button>
        </div>

        {/* Upload completed message */}
        {uploadStatus === 'completed' && (
          <div className="success-banner" role="status">
            {/* Success icon */}
            <span className="success-icon">✓</span>

            {/* Message */}
            <div>
              <p>Incident uploaded successfully!</p>
              <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>Status: <strong>Draft</strong> - Waiting for admin review. Redirecting to dashboard...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export component as default
export default UploadConsole;
