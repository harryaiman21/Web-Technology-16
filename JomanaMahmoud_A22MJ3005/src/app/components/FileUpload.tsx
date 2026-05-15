"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: any) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      const filePath = `incidents/${Date.now()}_${file.name}`;

      // 1. Upload to Supabase Storage
      const { data: storageData, error: uploadError } = await supabase.storage
        .from('incident-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Save reference to incidents table
      const { error: dbError } = await supabase
        .from('incidents')
        .insert({
          file_path: filePath,
          status: 'Pending', // RPA will pick this up when it sees 'Pending'
          issue_summary: 'Pending RPA classification' // Placeholder
        });

      if (dbError) throw dbError;
      alert("Incident uploaded successfully!");

    } catch (error) {
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <input type="file" disabled={uploading} onChange={handleFileUpload} />
  );
}