// Netlify Function: db
// Universal Supabase proxy — keeps the service role key server-side
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// GET  /.netlify/functions/db?table=X              → select all rows
// GET  /.netlify/functions/db?table=X&id=Y         → select one row
// POST /.netlify/functions/db  { table, action, data, id, match }
//   actions: upsert | delete | rpc
//
// Tables: articles | episodes | books | site_content | email_templates
//         sent_messages | message_threads

const ALLOWED_TABLES = new Set([
  'articles', 'episodes', 'books', 'site_content', 'email_templates',
  'sent_messages', 'message_threads', 'submissions', 'newsletter_subscribers',
  'newsletter_sends', 'book_orders', 'orders',
]);

exports.handler = async function(event) {
  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!URL || !KEY) {
    return json(500, { error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not set' });
  }

  const headers = {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // ── GET ──
  if (event.httpMethod === 'GET') {
    const { table, id, filter } = event.queryStringParameters || {};
    if (!table) return json(400, { error: 'table param required' });
    if (!ALLOWED_TABLES.has(table)) return json(400, { error: 'Unknown table' });

    let url = `${URL}/rest/v1/${table}`;
    const params = new URLSearchParams({ select: '*' });

    if (id) params.set('id', `eq.${id}`);

    // Optional extra filter: filter=key:eq:value
    if (filter) {
      const [col, op, val] = filter.split(':');
      if (col && op && val) params.set(col, `${op}.${val}`);
    }

    // Always order by created_at or number desc if column exists
    if (['articles','episodes','sent_messages','message_threads','submissions'].includes(table)) {
      params.set('order', 'created_at.desc');
    }

    url += '?' + params.toString();

    const res  = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) return json(res.status, { error: data });
    return json(200, id ? (data[0] || null) : data);
  }

  // ── POST ──
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const { table, action, data, id, match } = body;
    if (!table || !action) return json(400, { error: 'table and action required' });
    if (!ALLOWED_TABLES.has(table)) return json(400, { error: 'Unknown table' });

    if (action === 'upsert') {
      const res = await fetch(`${URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      const result = await res.json();
      if (!res.ok) return json(res.status, { error: result });
      return json(200, { success: true, data: result });
    }

    if (action === 'patch') {
      const col = match?.col || 'id';
      const val = match?.val || id;
      if (!val) return json(400, { error: 'id required for patch' });
      const res = await fetch(`${URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return json(res.status, { error: result });
      return json(200, { success: true, data: result });
    }

    if (action === 'delete') {
      const col = match?.col || 'id';
      const val = match?.val || id;
      if (!val) return json(400, { error: 'id or match required for delete' });
      const res = await fetch(`${URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        return json(res.status, { error: result });
      }
      return json(200, { success: true });
    }

    return json(400, { error: `Unknown action: ${action}` });
  }

  return json(405, { error: 'Method not allowed' });
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
