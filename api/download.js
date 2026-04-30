// Vercel Serverless Function: download
// Serves a digital file (eBook PDF or Audiobook) for a verified order.
//
// GET /api/download?orderId=PE-xxx&type=ebook|audiobook
//
// Security model: the order ID is used as the access token.
//   - Order IDs are PE-YYYYMMDD-XXXX (hard to guess, brand-scoped)
//   - We verify: order exists, order status is not cancelled, variant matches type
//   - No authentication required — link in email is the credential
//
// Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY

module.exports = async function(req, res) {
  // Only GET
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

  // Sanitise inputs
  const orderId = (typeof req.query.orderId === 'string' ? req.query.orderId : '')
    .replace(/[^\w\-]/g, '').slice(0, 50);
  const type = (typeof req.query.type === 'string' ? req.query.type : '').toLowerCase().trim();

  if (!orderId) {
    res.status(400).send('Missing orderId');
    return;
  }
  if (!['ebook', 'audiobook'].includes(type)) {
    res.status(400).send('type must be "ebook" or "audiobook"');
    return;
  }

  // 1. Fetch the order
  let order;
  try {
    const r = await fetch(
      `${SUP_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,variant,item_id,item_title,email&limit=1`,
      { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
    );
    const rows = await r.json();
    if (!r.ok || !rows.length) {
      res.status(404).send('Order not found');
      return;
    }
    order = rows[0];
  } catch (e) {
    res.status(500).send('Database error');
    return;
  }

  // 2. Check order is valid
  if (order.status === 'cancelled') {
    res.status(403).send('This order has been cancelled');
    return;
  }

  // 3. Verify the requested type matches the purchased variant
  const variantLower = (order.variant || '').toLowerCase();
  const allowedForEbook     = variantLower === 'ebook' || variantLower === 'complete bundle';
  const allowedForAudiobook = variantLower === 'audiobook' || variantLower === 'complete bundle';

  if (type === 'ebook' && !allowedForEbook) {
    res.status(403).send('This order does not include an eBook');
    return;
  }
  if (type === 'audiobook' && !allowedForAudiobook) {
    res.status(403).send('This order does not include an Audiobook');
    return;
  }

  // 4. Fetch the file from the books table
  let fileData, fileName, mimeType;
  try {
    const r = await fetch(
      `${SUP_URL}/rest/v1/books?id=eq.${encodeURIComponent(order.item_id)}&select=pdf_data,pdf_name,audio_data,audio_name&limit=1`,
      { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
    );
    const rows = await r.json();
    if (!r.ok || !rows.length) {
      res.status(404).send('File not found for this title');
      return;
    }
    const book = rows[0];

    if (type === 'ebook') {
      fileData = book.pdf_data   || null;
      fileName = book.pdf_name   || 'ebook.pdf';
      mimeType = 'application/pdf';
    } else {
      fileData = book.audio_data || null;
      fileName = book.audio_name || 'audiobook.mp3';
      // Detect mime from extension
      const ext = fileName.split('.').pop().toLowerCase();
      mimeType = ext === 'm4b' || ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg';
    }
  } catch (e) {
    res.status(500).send('Database error fetching file');
    return;
  }

  if (!fileData) {
    res.status(404).send('File not yet available for download — please check back soon or contact support');
    return;
  }

  // 5. Strip data URL prefix and convert base64 → Buffer
  const base64 = fileData.replace(/^data:[^;]+;base64,/, '');
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch (e) {
    res.status(500).send('File encoding error');
    return;
  }

  // 6. Send the file as a download
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.status(200).send(buffer);
};
