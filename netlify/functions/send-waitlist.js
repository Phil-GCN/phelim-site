// Netlify Function: send-waitlist
// Queries all waitlist submissions from Supabase and sends a launch notification email
// via Resend to every subscriber.
// POST /.netlify/functions/send-waitlist  { subject, body }
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SUP_URL    = process.env.SUPABASE_URL;
  const SUP_KEY    = process.env.SUPABASE_SERVICE_KEY;

  if (!RESEND_KEY) return json(500, { error: 'RESEND_API_KEY not set' });
  if (!SUP_URL || !SUP_KEY) return json(500, { error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not set' });

  let body;
  try { body = JSON.parse(event.body); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { subject, body: msgBody, item_key } = body;
  if (!subject || !msgBody) return json(400, { error: 'subject and body required' });

  // Fetch waitlist entries — optionally filtered by item_key stored in fields JSONB
  // Note: Supabase supports filtering on JSONB with ->>, but we do client-side filter as fallback
  const res = await fetch(
    `${SUP_URL}/rest/v1/submissions?type=eq.waitlist&select=name,email,fields`,
    { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
  );
  if (!res.ok) return json(500, { error: 'Failed to fetch waitlist from DB' });
  const subscribers = await res.json();

  if (!subscribers || !subscribers.length) {
    return json(200, { success: true, count: 0, message: 'No waitlist subscribers found.' });
  }

  // Filter by item_key if specified
  let filtered = subscribers;
  if (item_key) {
    filtered = subscribers.filter(s => (s.fields?.item_key || '') === item_key);
  }

  if (!filtered.length) {
    return json(200, { success: true, count: 0, message: `No subscribers for item "${item_key}".` });
  }

  // De-duplicate by email (same email may have signed up multiple times for different items)
  const seen = new Set();
  const unique = filtered.filter(s => {
    if (!s.email || seen.has(s.email.toLowerCase())) return false;
    seen.add(s.email.toLowerCase());
    return true;
  });

  // Build email HTML
  function buildHtml(name, subject, msgBody) {
    const bodyHtml = msgBody.split('\n\n').map(p =>
      `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">${p.replace(/\n/g, '<br>')}</p>`
    ).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:#1a3028;padding:32px 40px;">
        <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,246,241,.5);">Launch Notification</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f8f6f1;font-weight:400;line-height:1.2;">${subject}</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px;">
        ${name ? `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">Dear ${name},</p>` : ''}
        ${bodyHtml}
      </td></tr>
      <tr><td style="background:#ffffff;border-top:1px solid #f0ede6;padding:24px 40px;">
        <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:16px;color:#0d0d0b;font-weight:500;">Phelim Ekwebe</p>
        <p style="margin:0;font-size:12px;color:#888;">Life Strategist · Systems Thinker · Author</p>
        <p style="margin:6px 0 0;font-size:12px;color:#888;"><a href="https://phelim.me" style="color:#263d33;text-decoration:none;">phelim.me</a> &nbsp;·&nbsp; <a href="https://phelim.me/podcast.html" style="color:#263d33;text-decoration:none;">Future Foundations Podcast</a></p>
      </td></tr>
      <tr><td style="padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
          You received this because you signed up for launch notifications at <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>
          &copy; ${new Date().getFullYear()} Phelim Ekwebe. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  }

  // Send to each subscriber (sequential to stay within Resend rate limits)
  let sent = 0;
  const errors = [];
  for (const sub of unique) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Phelim Ekwebe <hello@phelim.me>',
          to: [sub.email],
          subject,
          html: buildHtml(sub.name || '', subject, msgBody),
        }),
      });
      if (emailRes.ok) { sent++; } else { errors.push(sub.email); }
    } catch(e) { errors.push(sub.email); }
  }

  return json(200, { success: true, count: sent, total: unique.length, errors });
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
