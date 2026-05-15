/**
 * Incident Service
 * Handles all API calls related to incidents (CRUD operations)
 * Communicates with Supabase backend through RESTful API
 */

import { supabase } from './supabaseClient';
import type { Incident, SearchFilters, PaginatedResponse } from '../types';

/**
 * Create a new incident in the database
 * @param incident - The incident data to create
 * @returns The created incident with generated ID
 */
export async function createIncident(incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<Incident> {
  try {
    // Insert the incident into the 'incidents' table
    const { data, error } = await supabase
      .from('incidents')
      .insert([incident])
      .select()
      .single();

    // Check for errors
    if (error) throw error;

    // Return the created incident
    return data as Incident;
  } catch (error) {
    console.error('Error creating incident:', error);
    throw error;
  }
}

/**
 * Fetch all incidents with optional filtering and pagination
 * @param filters - Search filters and pagination parameters
 * @returns Paginated list of incidents
 */
export async function getIncidents(filters?: SearchFilters): Promise<PaginatedResponse<Incident>> {
  try {
    // Start building the query
    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' });

    // Apply search filter if provided
    if (filters?.query) {
      query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }

    // Apply status filter if provided
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Apply priority filter if provided
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    // Apply date range filter if provided
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Apply sorting
    const sortField = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder === 'asc';
    query = query.order(sortField, { ascending: sortOrder });

    // Apply pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 1000;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    // Execute the query
    const { data, error, count } = await query;

    // Check for errors
    if (error) throw error;

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);

    // Return paginated response
    return {
      success: true,
      data: data as Incident[],
      status: 200,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw error;
  }
}

/**
 * Fetch a single incident by ID
 * @param id - The incident ID
 * @returns The incident data
 */
export async function getIncidentById(id: string): Promise<Incident> {
  try {
    // Query the incident by ID
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    // Check for errors
    if (error) throw error;

    // Return the incident
    return data as Incident;
  } catch (error) {
    console.error('Error fetching incident:', id, error);
    throw error;
  }
}

/**
 * Update an existing incident
 * @param id - The incident ID
 * @param updates - Partial incident data to update
 * @returns The updated incident
 */
export async function updateIncident(
  id: string,
  updates: Partial<Incident>
): Promise<Incident> {
  try {
    // Update the incident and return the updated data
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    // Check for errors
    if (error) throw error;

    // Return the updated incident
    return data as Incident;
  } catch (error) {
    console.error(`Error updating incident ${id}:`, error);
    throw error;
  }
}

/**
 * Update incident status (Draft → Reviewed → Published)
 * @param id - The incident ID
 * @param newStatus - The new status
 * @param reviewedBy - User ID of reviewer (if applicable)
 * @returns The updated incident
 */
export async function updateIncidentStatus(
  id: string,
  newStatus: Incident['status'],
  reviewedBy?: string
): Promise<Incident> {
  try {
    // Prepare the update object
    const updates: Partial<Incident> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set reviewed_by if reviewing
    if (newStatus === 'reviewed' && reviewedBy) {
      updates.reviewed_by = reviewedBy;
      updates.reviewed_at = new Date().toISOString();
    }

    // Set published_at if publishing
    if (newStatus === 'published') {
      updates.published_at = new Date().toISOString();
    }

    // Execute the update
    return await updateIncident(id, updates);
  } catch (error) {
    console.error(`Error updating incident status for ${id}:`, error);
    throw error;
  }
}

/**
 * Delete an incident
 * @param id - The incident ID
 */
export async function deleteIncident(id: string): Promise<void> {
  try {
    // Delete the incident
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id);

    // Check for errors
    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting incident ${id}:`, error);
    throw error;
  }
}

/**
 * Get incident version history
 * @param incidentId - The incident ID
 * @returns List of version history entries
 */
export async function getIncidentVersionHistory(incidentId: string) {
  try {
    // Fetch all versions for the incident, ordered by most recent first
    const { data, error } = await supabase
      .from('incident_versions')
      .select('*')
      .eq('incident_id', incidentId)
      .order('changed_at', { ascending: false });

    // Check for errors
    if (error) throw error;

    // Return the version history
    return data;
  } catch (error) {
    console.error(`Error fetching version history for incident ${incidentId}:`, error);
    throw error;
  }
}

/**
 * Check for duplicate incident using content hash
 * Looks for incidents created in the last 14 days with the same hash
 * @param contentHash - Hash of the incident content
 * @returns True if duplicate found, false otherwise
 */
export async function checkForDuplicate(contentHash: string): Promise<boolean> {
  try {
    // Calculate date 14 days ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Query for incidents with same hash created in last 14 days
    const { data, error } = await supabase
      .from('incidents')
      .select('id')
      .eq('content_hash', contentHash)
      .gte('created_at', twoWeeksAgo.toISOString())
      .limit(1);

    // Check for errors
    if (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }

    // Return true if duplicate found, false otherwise
    return (data && data.length > 0) ? true : false;
  } catch (err) {
    console.error('Duplicate check error:', err);
    return false;
  }
}
