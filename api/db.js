// Vercel Serverless Function: db
// Universal Supabase proxy — keeps the service role key server-side
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// GET  /api/db?table=X              → select all rows
// GET  /api/db?table=X&id=Y         → select one row
// POST /api/db  { table, action, data, id, match }
//   actions: upsert | patch | delete

const ALLOWED_TABLES = new Set([
  'articles', 'episodes', 'books', 'site_content', 'email_templates',
  'sent_messages', 'message_threads', 'submissions', 'newsletter_subscribers',
  'newsletter_sends', 'book_orders', 'orders',
]);

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!URL || !KEY) {
    respond(res, 500, { error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not set' });
    return;
  }

  const headers = {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // ── GET ──
  if (req.method === 'GET') {
    const { table, id, filter } = req.query || {};
    if (!table) { respond(res, 400, { error: 'table param required' }); return; }
    if (!ALLOWED_TABLES.has(table)) { respond(res, 400, { error: 'Unknown table' }); return; }

    let url = `${URL}/rest/v1/${table}`;
    const params = new URLSearchParams({ select: '*' });

    if (id) params.set('id', `eq.${id}`);

    if (filter) {
      const [col, op, val] = filter.split(':');
      if (col && op && val) params.set(col, `${op}.${val}`);
    }

    if (['articles','episodes','sent_messages','message_threads','submissions'].includes(table)) {
      params.set('order', 'created_at.desc');
    }

    url += '?' + params.toString();

    const r    = await fetch(url, { headers });
    const data = await r.json();
    if (!r.ok) { respond(res, r.status, { error: data }); return; }
    respond(res, 200, id ? (data[0] || null) : data);
    return;
  }

  // ── POST ──
  if (req.method === 'POST') {
    const body = req.body || {};
    const { table, action, data, id, match } = body;
    if (!table || !action) { respond(res, 400, { error: 'table and action required' }); return; }
    if (!ALLOWED_TABLES.has(table)) { respond(res, 400, { error: 'Unknown table' }); return; }

    if (action === 'upsert') {
      const r = await fetch(`${URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      const result = await r.json();
      if (!r.ok) { respond(res, r.status, { error: result }); return; }
      respond(res, 200, { success: true, data: result });
      return;
    }

    if (action === 'patch') {
      const col = match?.col || 'id';
      const val = match?.val || id;
      if (!val) { respond(res, 400, { error: 'id required for patch' }); return; }
      const r = await fetch(`${URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (!r.ok) { respond(res, r.status, { error: result }); return; }
      respond(res, 200, { success: true, data: result });
      return;
    }

    if (action === 'delete') {
      const col = match?.col || 'id';
      const val = match?.val || id;
      if (!val) { respond(res, 400, { error: 'id or match required for delete' }); return; }
      const r = await fetch(`${URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
        method: 'DELETE',
        headers,
      });
      if (!r.ok) {
        const result = await r.json().catch(() => ({}));
        respond(res, r.status, { error: result });
        return;
      }
      respond(res, 200, { success: true });
      return;
    }

    respond(res, 400, { error: `Unknown action: ${action}` });
    return;
  }

  respond(res, 405, { error: 'Method not allowed' });
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}

// Raise Vercel's default 4.5 MB body-parser limit so cover images,
// PDFs, and audio files (stored as base64) can be saved via upsert.
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};
