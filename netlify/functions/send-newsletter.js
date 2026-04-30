// Netlify Function: send-newsletter
// Sends a newsletter email to all active newsletter_subscribers
// POST /.netlify/functions/send-newsletter  { subject, body, preview_text? }
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

const SENDER = process.env.SENDER_EMAIL || 'hello@phelim.me';

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

  const { subject, body: msgBody, preview_text, content_type, content_title, content_url } = body;
  if (!subject || !msgBody) return json(400, { error: 'subject and body required' });

  // Fetch active subscribers
  const res = await fetch(
    `${SUP_URL}/rest/v1/newsletter_subscribers?active=eq.true&select=name,email`,
    { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
  );
  if (!res.ok) return json(500, { error: 'Failed to fetch subscribers from DB' });
  const subscribers = await res.json();

  if (!subscribers || !subscribers.length) {
    return json(200, { success: true, count: 0, message: 'No active subscribers.' });
  }

  let sent = 0;
  const errors = [];
  for (const sub of subscribers) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Phelim Ekwebe <${SENDER}>`,
          to: [sub.email],
          subject,
          html: buildNewsletterHtml(sub.name || '', subject, msgBody, { content_type, content_title, content_url, preview_text }),
        }),
      });
      if (emailRes.ok) { sent++; } else { errors.push(sub.email); }
    } catch(e) { errors.push(sub.email); }
  }

  // Persist send record to Supabase
  try {
    await fetch(`${SUP_URL}/rest/v1/newsletter_sends`, {
      method: 'POST',
      headers: {
        apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({ subject, body: msgBody, recipient_count: sent }),
    });
  } catch(_) { /* non-fatal — email was already sent */ }

  return json(200, { success: true, count: sent, total: subscribers.length, errors });
};

function buildNewsletterHtml(name, subject, msgBody, ctx) {
  const first    = name.split(' ')[0] || 'there';
  const bodyHtml = msgBody.split('\n\n').map(p =>
    `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">${p.replace(/\n/g, '<br>')}</p>`
  ).join('');

  // Optional content card (episode / article link)
  const contentCard = (ctx.content_type && ctx.content_title) ? `
    <div style="background:#f7f5f0;border:1px solid #e8e4dd;padding:18px 20px;margin:20px 0;">
      <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#888;margin-bottom:6px;">${ctx.content_type}</div>
      <div style="font-family:Georgia,serif;font-size:1rem;color:#1a1a1a;margin-bottom:10px;">${ctx.content_title}</div>
      ${ctx.content_url ? `<a href="${ctx.content_url}" style="font-size:.8rem;color:#263d33;text-decoration:none;border-bottom:1px solid #263d33;padding-bottom:1px;">Read / Listen →</a>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${ctx.preview_text ? `<span style="display:none;max-height:0;overflow:hidden;">${ctx.preview_text}</span>` : ''}
</head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:#263d33;padding:32px 40px;">
        <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,246,241,.5);">Future Foundations Newsletter</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f8f6f1;font-weight:400;line-height:1.2;">${subject}</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px;">
        <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">Dear ${first},</p>
        ${bodyHtml}
        ${contentCard}
      </td></tr>
      <tr><td style="background:#ffffff;border-top:1px solid #f0ede6;padding:24px 40px;">
        <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:16px;color:#0d0d0b;font-weight:500;">Phelim Ekwebe</p>
        <p style="margin:0;font-size:12px;color:#888;">Life Strategist · Systems Thinker · Author</p>
        <p style="margin:6px 0 0;font-size:12px;color:#888;"><a href="https://phelim.me" style="color:#263d33;text-decoration:none;">phelim.me</a> &nbsp;·&nbsp; <a href="https://phelim.me/podcast.html" style="color:#263d33;text-decoration:none;">Future Foundations Podcast</a></p>
      </td></tr>
      <tr><td style="padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
          You are receiving this because you subscribed at <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>
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
