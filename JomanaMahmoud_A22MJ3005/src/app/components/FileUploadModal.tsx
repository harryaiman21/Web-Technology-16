"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FileUploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Supabase getUser error:', error.message);
          return;
        }
        setUser(currentUser);
      } catch (err) {
        console.warn('Supabase getUser failure:', err);
      }
    };
    getUser();
  }, []);

  const handleUpload = async () => {
  if (!file) return;
  setUploading(true);

  // 1. Upload the file
  const filePath = `incidents/${Date.now()}_${file.name}`;
  const { data: storageData, error: storageError } = await supabase.storage
    .from('incident-attachments')
    .upload(filePath, file);

  if (storageError) {
    console.error("Storage Error:", storageError);
    return alert("Upload failed: " + storageError.message);
  }

  // Verification point: The file definitely exists in storage now
  console.log("File uploaded to path:", storageData?.path);

  // 2. Insert record
  const { error: dbError } = await supabase.from('incidents').insert({
    user_id: user.id,
    file_path: filePath, // This links the DB row to the storage file
    status: 'Pending'
  });

  if (dbError) {
    console.error("Database Error:", dbError);
    return alert("File uploaded, but database record failed: " + dbError.message);
  }

  alert("Success!");
};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-[#D40511]">Upload New Incident</h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Incident File</label>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#D40511] file:text-white hover:file:bg-red-700"
          />
        </div>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 text-black rounded">Cancel</button>
          <button 
            onClick={handleUpload} 
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-[#D40511] text-black rounded font-bold"
          >
            {uploading ? "Uploading..." : "Submit File"}
          </button>
        </div>
      </div>
    </div>
  );
}