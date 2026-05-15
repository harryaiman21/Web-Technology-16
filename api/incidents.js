export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.UIPATH_API_KEY || 'uipath-secret-key-12345';

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      title, 
      description, 
      priority, 
      tags, 
      source, 
      external_id,
      sender,
      file_content,
      file_name,
      file_type,
      file_url
    } = req.body;

    // Validate title
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get Supabase config
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase env vars');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Use Supabase REST API directly via fetch (no SDK needed)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Prefer': 'return=representation',
    };

    // Step 1: Get first available user (required for created_by foreign key)
    let userId = null;

    try {
      const usersRes = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?select=id&limit=1`,
        { headers, method: 'GET' }
      );

      const users = await usersRes.json();
      if (Array.isArray(users) && users.length > 0) {
        userId = users[0].id;
        console.log('Found user for created_by:', userId);
      }
    } catch (err) {
      console.error('Could not query users:', err);
    }

    // If no users exist, we can't create incidents
    if (!userId) {
      return res.status(500).json({
        error: 'No users in system',
        message: 'At least one user must exist in the system to create incidents',
      });
    }

    // Step 2: Create incident (created_by is required - we found a user above)
    const incidentBody = {
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      status: 'submitted',
      tags: tags || [],
      created_by: userId,
      ...(sender ? { sender } : {}),
      ...(file_url ? { file_url } : {}),
    };

    const incidentRes = await fetch(`${supabaseUrl}/rest/v1/incidents`, {
      headers,
      method: 'POST',
      body: JSON.stringify(incidentBody),
    });

    if (!incidentRes.ok) {
      const err = await incidentRes.json();
      console.error('Error creating incident:', err);
      throw new Error(`Failed to create incident: ${JSON.stringify(err)}`);
    }

    const incident = await incidentRes.json();
    const incidentId = incident[0]?.id;

    if (!incidentId) {
      throw new Error('Failed to get incident ID');
    }

    // Step 3: If file content provided, upload it to Supabase Storage
    let fileUrl = null;
    if (file_content && file_name) {
      try {
        const fileName = `${incidentId}/${file_name}`;
        const storageHeaders = {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': file_type || 'application/octet-stream',
        };

        const uploadRes = await fetch(
          `${supabaseUrl}/storage/v1/object/incident-files/${fileName}`,
          {
            headers: storageHeaders,
            method: 'POST',
            body: file_content,
          }
        );

        if (uploadRes.ok) {
          fileUrl = `${supabaseUrl}/storage/v1/object/public/incident-files/${fileName}`;
          console.log('File uploaded successfully:', fileUrl);

          // Create file record in incident_files table
          await fetch(`${supabaseUrl}/rest/v1/incident_files`, {
            headers,
            method: 'POST',
            body: JSON.stringify({
              incident_id: incidentId,
              file_name: file_name,
              file_path: fileName,
              file_type: file_type || 'application/octet-stream',
              source: source || 'google-drive',
            }),
          }).catch(err => console.error('Error logging file (non-critical):', err));
        } else {
          console.error('File upload failed:', uploadRes.status);
        }
      } catch (err) {
        console.error('Error uploading file (non-critical):', err);
      }
    }

    // Step 4: Log to audit (non-critical, don't fail if this errors)
    fetch(`${supabaseUrl}/rest/v1/incident_audit_log`, {
      headers,
      method: 'POST',
      body: JSON.stringify({
        incident_id: incidentId,
        action: 'created_via_rpa',
        actor_id: userId,
        details: {
          source: source || 'uipath',
          external_id: external_id,
          file_name: file_name,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(err => console.error('Audit log error (non-critical):', err));

    // Success response
    return res.status(201).json({
      success: true,
      incident_id: incidentId,
      file_url: fileUrl || file_url || null,
      message: 'Incident created successfully',
      sender: sender || null,
    });
  } catch (error) {
    console.error('API Handler Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Unknown error',
    });
  }
}
