// Netlify Function: get-submissions
// Proxies Netlify Forms API so the token stays server-side
// Requires env vars: NETLIFY_API_TOKEN, NETLIFY_SITE_ID

exports.handler = async function(event) {
  const TOKEN   = process.env.NETLIFY_API_TOKEN;
  const SITE_ID = process.env.NETLIFY_SITE_ID;

  if (!TOKEN || !SITE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'NETLIFY_API_TOKEN or NETLIFY_SITE_ID not set' }),
    };
  }

  const formName = event.queryStringParameters?.form || null;

  try {
    // Fetch all forms for the site
    const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!formsRes.ok) throw new Error(`Forms API error: ${formsRes.status}`);
    const forms = await formsRes.json();

    // Fetch submissions for each relevant form in parallel
    const targetForms = formName
      ? forms.filter(f => f.name === formName)
      : forms;

    const allSubmissions = await Promise.all(
      targetForms.map(async form => {
        const subRes = await fetch(
          `https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=100`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        if (!subRes.ok) return [];
        const subs = await subRes.json();
        return subs.map(s => ({
          id:       s.id,
          formName: form.name,
          name:     s.data?.name     || s.data?.Name     || 'Unknown',
          email:    s.data?.email    || s.data?.Email    || '',
          message:  s.data?.message  || s.data?.Message  || '',
          company:  s.data?.company  || s.data?.organisation || '',
          extra:    s.data,
          created:  s.created_at,
        }));
      })
    );

    const submissions = allSubmissions.flat().sort(
      (a, b) => new Date(b.created) - new Date(a.created)
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions }),
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
