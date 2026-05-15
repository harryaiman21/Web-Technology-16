/**
 * Core TypeScript types for the Incident Reporting System
 * Defines all data structures used throughout the application
 */

// Status enum for incident workflow (Draft → Reviewed → Published)
export type IncidentStatus = 'draft' | 'reviewed' | 'published';

// Incident Priority level
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

// Main Incident data structure
export interface Incident {
  // Unique identifier for the incident
  id: string;
  
  // Incident title/subject
  title: string;
  
  // Detailed description of the incident
  description: string;
  
  // Current status of the incident
  status: IncidentStatus;
  
  // Priority level
  priority: IncidentPriority;
  
  // Tags for categorization and filtering
  tags: string[];
  
  // User ID of the incident creator
  created_by: string;
  // Optional sender information (e.g., email sender from RPA ingestion)
  sender?: string;

  // Optional resolution notes added when an incident is closed
  resolution_comments?: string;
  
  // User ID of the reviewer (if reviewed)
  reviewed_by?: string;
  
  // Timestamp when incident was created
  created_at: string;
  
  // Timestamp when incident was last updated
  updated_at: string;
  
  // Timestamp when incident was reviewed
  reviewed_at?: string;
  
  // Timestamp when incident was published
  published_at?: string;
  
  // Hash for duplicate detection (RPA use)
  content_hash?: string;
}

// File attachment structure
export interface IncidentFile {
  // Unique identifier
  id: string;
  
  // Reference to parent incident
  incident_id: string;
  
  // File path in Supabase Storage
  file_path: string;
  
  // Original filename
  file_name: string;
  
  // File type (pdf, docx, txt, etc.)
  file_type: string;
  
  // File size in bytes
  file_size: number;
  
  // When file was uploaded
  uploaded_at: string;
}

// Version history structure tracking all changes
export interface IncidentVersion {
  // Unique identifier
  id: string;
  
  // Reference to parent incident
  incident_id: string;
  
  // Previous data before the change
  old_data?: Partial<Incident>;
  
  // New data after the change
  new_data: Partial<Incident>;
  
  // User who made the change
  changed_by: string;
  
  // Status before change
  status_before: IncidentStatus;
  
  // Status after change
  status_after: IncidentStatus;
  
  // Change reason/notes
  change_reason?: string;
  
  // When the change occurred
  changed_at: string;
}

// Audit log for RPA and system actions
export interface AuditLog {
  // Unique identifier
  id: string;
  
  // Action performed (create, update, delete, etc.)
  action: 'create' | 'update' | 'delete' | 'publish' | 'review';
  
  // Reference to incident if applicable
  incident_id?: string;
  
  // User or system that performed the action
  actor: string;
  
  // Additional details about the action
  details?: Record<string, unknown>;
  
  // When the action occurred
  timestamp: string;
}

// User profile structure
export interface UserProfile {
  // User UUID from Supabase Auth
  id: string;
  
  // User email
  email: string;
  
  // Display name
  full_name: string;
  
  // User role (editor, reviewer, admin)
  role: 'editor' | 'reviewer' | 'admin';
  
  // Avatar URL
  avatar_url?: string;
  
  // When profile was created
  created_at: string;
  
  // When profile was last updated
  updated_at: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  // Success status
  success: boolean;
  
  // Response data
  data?: T;
  
  // Error message if failed
  error?: string;
  
  // HTTP status code
  status: number;
}

// Pagination metadata
export interface PaginationMeta {
  // Current page number
  page: number;
  
  // Items per page
  limit: number;
  
  // Total items count
  total: number;
  
  // Total pages
  totalPages: number;
}

// Paginated response structure
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  // Pagination information
  meta: PaginationMeta;
}

// Search and filter parameters
export interface SearchFilters {
  // Search query string
  query?: string;
  
  // Filter by status
  status?: IncidentStatus;
  
  // Filter by priority
  priority?: IncidentPriority;
  
  // Filter by tags
  tags?: string[];
  
  // Filter by creator
  creator?: string;
  
  // Date range start
  dateFrom?: string;
  
  // Date range end
  dateTo?: string;
  
  // Page number for pagination
  page?: number;
  
  // Items per page
  limit?: number;
  
  // Sort field
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'priority';
  
  // Sort order
  sortOrder?: 'asc' | 'desc';
}
