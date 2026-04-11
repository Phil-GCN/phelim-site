// Netlify Function: subscribe-newsletter
// Saves subscriber to newsletter_subscribers table, sends welcome email
// Deduplicates by email (returns { duplicate: true } if already subscribed)
// POST /.netlify/functions/subscribe-newsletter  { name, email }
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const RESEND_KEY     = process.env.RESEND_API_KEY;
  const SUP_URL        = process.env.SUPABASE_URL;
  const SUP_KEY        = process.env.SUPABASE_SERVICE_KEY;

  let body;
  try { body = JSON.parse(event.body); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { name, email } = body;
  if (!name || !email) return json(400, { error: 'name and email required' });

  // Dedup check
  if (SUP_URL && SUP_KEY) {
    try {
      const dupRes = await fetch(
        `${SUP_URL}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
        { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
      );
      const dupRows = dupRes.ok ? await dupRes.json() : [];
      if (dupRows && dupRows.length > 0) return json(200, { success: true, duplicate: true });
    } catch(_) {}

    // Save subscriber
    try {
      await fetch(`${SUP_URL}/rest/v1/newsletter_subscribers`, {
        method: 'POST',
        headers: {
          apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify([{
          id: 'ns-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name, email,
          subscribed_at: new Date().toISOString(),
          active: true,
        }]),
      });
    } catch(e) { console.warn('DB save failed:', e.message); }
  }

  // Send welcome email (best-effort)
  if (RESEND_KEY) {
    const html = buildWelcomeHtml(name);
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Phelim Ekwebe <hello@phelim.me>',
          to: [email],
          subject: 'Welcome — you\'re subscribed to Future Foundations',
          html,
        }),
      });
    } catch(e) { console.warn('Welcome email failed:', e.message); }
  }

  return json(200, { success: true });
};

function buildWelcomeHtml(name) {
  const first = name.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:#263d33;padding:32px 40px;">
        <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,246,241,.5);">Future Foundations</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f8f6f1;font-weight:400;line-height:1.2;">You're in.</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px;">
        <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">Dear ${first},</p>
        <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">Thank you for subscribing. You'll hear from me when there's something worth reading — a new episode, an essay, or a resource that has earned a place in the work.</p>
        <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">No filler, no frequency for its own sake. Just the things that matter, when they're ready.</p>
        <p style="margin:24px 0 0;font-family:Georgia,serif;font-size:15px;color:#263d33;font-style:italic;">Good to have you here.</p>
      </td></tr>
      <tr><td style="background:#ffffff;border-top:1px solid #f0ede6;padding:24px 40px;">
        <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:16px;color:#0d0d0b;font-weight:500;">Phelim Ekwebe</p>
        <p style="margin:0;font-size:12px;color:#888;">Life Strategist · Systems Thinker · Author</p>
        <p style="margin:6px 0 0;font-size:12px;color:#888;"><a href="https://phelim.me" style="color:#263d33;text-decoration:none;">phelim.me</a> &nbsp;·&nbsp; <a href="https://phelim.me/podcast.html" style="color:#263d33;text-decoration:none;">Future Foundations Podcast</a></p>
      </td></tr>
      <tr><td style="padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
          You subscribed at <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>
          &copy; ${new Date().getFullYear()} Phelim Ekwebe. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
