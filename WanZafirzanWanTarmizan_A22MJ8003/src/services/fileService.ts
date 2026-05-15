/**
 * File Service
 * Handles file upload and storage operations with Supabase Storage
 * Supports multiple file types (PDF, DOCX, images, text)
 */

import { supabase } from './supabaseClient';

// Maximum file size in bytes (50 MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types for upload
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param incidentId - The incident ID (used as folder)
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(file: File, incidentId: string): Promise<string> {
  try {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`File type not allowed: ${file.type}`);
    }

    // Generate unique filename using timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomString}-${file.name}`;

    // Construct the file path (incidents/{incidentId}/{filename})
    const filePath = `incidents/${incidentId}/${filename}`;

    // Upload the file to Supabase Storage bucket 'incident-files'
    const { data, error } = await supabase.storage
      .from('incident-files')
      .upload(filePath, file);

    // Check for errors during upload
    if (error) throw error;

    // Generate public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('incident-files')
      .getPublicUrl(data.path);

    // Return the public URL
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Upload multiple files at once
 * @param files - Array of files to upload
 * @param incidentId - The incident ID
 * @returns Array of public URLs for uploaded files
 */
export async function uploadMultipleFiles(
  files: File[],
  incidentId: string
): Promise<string[]> {
  try {
    // Upload each file and collect the results
    const uploadPromises = files.map((file) => uploadFile(file, incidentId));
    const urls = await Promise.all(uploadPromises);

    // Return array of public URLs
    return urls;
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw error;
  }
}

/**
 * Delete a file from storage
 * @param filePath - The full path of the file to delete
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    // Delete the file from storage
    const { error } = await supabase.storage
      .from('incident-files')
      .remove([filePath]);

    // Check for errors
    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Download a file from storage
 * @param filePath - The full path of the file to download
 * @returns The file blob
 */
export async function downloadFile(filePath: string): Promise<Blob> {
  try {
    // Download the file
    const { data, error } = await supabase.storage
      .from('incident-files')
      .download(filePath);

    // Check for errors
    if (error) throw error;

    // Return the file blob
    return data;
  } catch (error) {
    console.error(`Error downloading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Get file metadata (size, type, etc.)
 * @param filePath - The full path of the file
 * @returns File metadata
 */
export async function getFileMetadata(filePath: string) {
  try {
    // List files in the incident directory to get metadata
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    const { data, error } = await supabase.storage
      .from('incident-files')
      .list(dirPath);

    // Check for errors
    if (error) throw error;

    // Find the specific file
    const fileMetadata = data?.find((f) => f.name === filePath.split('/').pop());

    // Return the metadata
    return fileMetadata;
  } catch (error) {
    console.error(`Error getting file metadata for ${filePath}:`, error);
    throw error;
  }
}

/**
 * List all files for an incident
 * @param incidentId - The incident ID
 * @returns Array of file metadata
 */
export async function listIncidentFiles(incidentId: string) {
  try {
    // List all files in the incident directory
    const { data, error } = await supabase.storage
      .from('incident-files')
      .list(`incidents/${incidentId}`);

    // Check for errors
    if (error) throw error;

    // Return the list of files
    return data || [];
  } catch (error) {
    console.error(`Error listing files for incident ${incidentId}:`, error);
    throw error;
  }
}

/**
 * Generate a temporary signed URL for a file (valid for X seconds)
 * @param filePath - The full path of the file
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Signed URL
 */
export async function generateSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    // Generate signed URL
    const { data, error } = await supabase.storage
      .from('incident-files')
      .createSignedUrl(filePath, expiresIn);

    // Check for errors
    if (error) throw error;

    // Return the signed URL
    return data.signedUrl;
  } catch (error) {
    console.error(`Error generating signed URL for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Calculate hash of file content for duplicate detection
 * Uses SHA-256 algorithm
 * @param file - The file to hash
 * @returns Hex string of the hash
 */
export async function calculateFileHash(file: File): Promise<string> {
  try {
    // Read file as array buffer
    const buffer = await file.arrayBuffer();

    // Use Web Crypto API to calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Return the hash
    return hashHex;
  } catch (error) {
    console.error('Error calculating file hash:', error);
    throw error;
  }
}
