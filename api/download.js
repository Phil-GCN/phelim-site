// Vercel Serverless Function: download
// Serves a digital file (eBook PDF or Audiobook) for a verified order.
//
// GET /api/download?token=XXX
//
// Security model: 
//   - A unique, single-use, expiring token is generated for each download.
//   - The token is stored in the `download_tokens` table.
//   - The token is used to retrieve the file from Supabase Storage.
//
// Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY

module.exports = async function(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const SUP_URL = process.env.SUPABASE_URL;
  const SUP_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUP_URL || !SUP_KEY) {
    res.status(500).send('Server configuration error');
    return;
  }

  const token = (typeof req.query.token === 'string' ? req.query.token : '').trim();

  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  // 1. Fetch the token data
  let tokenData;
  try {
    const r = await fetch(
      `${SUP_URL}/rest/v1/download_tokens?token=eq.${encodeURIComponent(token)}&select=*,order:orders!inner(id,status,variant,item_id,item_title)&limit=1`,
      { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
    );
    const rows = await r.json();
    if (!r.ok || !rows.length) {
      res.status(404).send('Invalid or expired token');
      return;
    }
    tokenData = rows[0];
  } catch (e) {
    res.status(500).send('Database error');
    return;
  }

  // 2. Check token expiry
  if (new Date(tokenData.expires_at) < new Date()) {
    res.status(403).send('This download link has expired. Please request a new one.');
    return;
  }

  // 3. Delete the token to prevent reuse
  try {
    await fetch(
      `${SUP_URL}/rest/v1/download_tokens?token=eq.${encodeURIComponent(token)}`,
      { method: 'DELETE', headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
    );
  } catch (e) {
    console.warn(`Failed to delete token ${token}:`, e.message);
  }

  // 4. Fetch the book data
  let bookData;
  try {
    const r = await fetch(
      `${SUP_URL}/rest/v1/books?id=eq.${encodeURIComponent(tokenData.order.item_id)}&select=pdf_storage_path,audio_storage_path&limit=1`,
      { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
    );
    const rows = await r.json();
    if (!r.ok || !rows.length) {
      res.status(404).send('Book data not found for this order');
      return;
    }
    bookData = rows[0];
  } catch (e) {
    res.status(500).send('Database error fetching book data');
    return;
  }

  const storagePath = tokenData.file_type === 'ebook' ? bookData.pdf_storage_path : bookData.audio_storage_path;

  if (!storagePath) {
    res.status(404).send('File not found in storage. Please contact support.');
    return;
  }

  // 5. Generate a signed URL for the file in Supabase Storage
  let signedUrl;
  try {
    const r = await fetch(
      `${SUP_URL}/storage/v1/object/sign/${storagePath}`,
      {
        method: 'POST',
        headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 60 })
      }
    );
    const data = await r.json();
    if (!r.ok) {
        throw new Error(data.message || 'Failed to sign URL');
    }
    signedUrl = `${SUP_URL}/storage/v1${data.signedURL}`;
  } catch (e) {
    res.status(500).send('Could not generate download link.');
    return;
  }

  // 6. Redirect the user to the signed URL
  res.setHeader('Location', signedUrl);
  res.status(302).send('Redirecting to download...');
};
