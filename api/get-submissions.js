// Vercel Serverless Function: get-submissions
// Returns submissions from Supabase (replaces the Netlify Forms API proxy)
// GET /api/get-submissions?form=speaking  (optional filter by form_type)
// Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY

module.exports = async function(req, res) {
  const SUP_URL = process.env.SUPABASE_URL;
  const SUP_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUP_URL || !SUP_KEY) {
    respond(res, 500, { error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not set' });
    return;
  }

  const formType = req.query?.form || null;
  let url = `${SUP_URL}/rest/v1/submissions?select=*&order=created_at.desc`;
  if (formType) url += `&form_type=eq.${encodeURIComponent(formType)}`;

  try {
    const r = await fetch(url, { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } });
    if (!r.ok) throw new Error(`Supabase error: ${r.status}`);
    const rows = await r.json();
    // Normalise to the shape the portal expects
    const submissions = (rows || []).map(s => ({
      id:       s.id,
      formName: s.form_type || 'general',
      name:     s.name     || 'Unknown',
      email:    s.email    || '',
      message:  s.data?.message || s.fields?.message || '',
      extra:    s.data || s.fields || {},
      created:  s.created_at,
      status:   s.status,
    }));
    respond(res, 200, { submissions });
  } catch(err) {
    respond(res, 500, { error: err.message });
  }
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
