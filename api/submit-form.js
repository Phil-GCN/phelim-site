// Vercel Serverless Function: submit-form
// Handles all contact form submissions
// 1. Saves to Supabase  2. Auto-reply to submitter  3. Notification to owner
// POST /api/submit-form
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

const SENDER = process.env.SENDER_EMAIL || 'hello@phelim.me';

const DEFAULT_TEMPLATES = {
  speaking:    { colour: '#263d33', eyebrow: 'Speaking & Events',      heading: 'Thank you for your speaking enquiry',    intro: n => `Dear ${n},\n\nThank you for reaching out about a speaking engagement. I appreciate you taking the time to share the details of your event.`,    body: `I review all speaking enquiries personally and respond within 2 business days. If your event aligns with my current availability and the themes I speak on — identity, systems thinking, decision architecture, and long-term performance — I will be in touch to discuss further.\n\nIn the meantime, you can explore my speaking topics and previous engagements on the site.`, closing: 'I look forward to reviewing your enquiry.' },
  podcast:     { colour: '#1a3028', eyebrow: 'Podcast Collaboration',   heading: 'Thank you for your podcast enquiry',     intro: n => `Dear ${n},\n\nThank you for reaching out about a podcast collaboration. I appreciate your interest in Future Foundations.`,                      body: `I review all podcast enquiries carefully — whether you are inviting me onto your show or applying to guest on Future Foundations. Guest episodes are selective, and the most compelling applications centre on a specific story, perspective, or experience that would genuinely serve the audience.\n\nI will be in touch within 3–5 business days.`, closing: 'Thank you again for getting in touch.' },
  writing:     { colour: '#263d33', eyebrow: 'Writing & Media',         heading: 'Thank you for your media enquiry',       intro: n => `Dear ${n},\n\nThank you for your writing and media enquiry. It is good to hear from you.`,                                                       body: `Whether you are working on an interview, feature, guest essay, or press piece related to Built to Last, I take all media enquiries seriously and respond within 3–5 business days.\n\nIf this is time-sensitive, please do note that in a follow-up and I will do my best to accommodate.`, closing: 'I look forward to connecting.' },
  partnership: { colour: '#b08d57', eyebrow: 'Partnership',             heading: 'Thank you for your partnership proposal', intro: n => `Dear ${n},\n\nThank you for submitting a partnership proposal. I appreciate you taking the time to outline the opportunity.`,               body: `Partnerships are considered carefully — I only feature and align with work that genuinely reflects the Future Foundations philosophy around intentional building, systems thinking, and long-term value. I review all proposals and respond within 5–7 business days.\n\nIf there is a strong fit, I will reach out to explore the details further.`, closing: 'Thank you for your interest in working together.' },
  general:     { colour: '#263d33', eyebrow: 'General Enquiry',         heading: 'Thank you for getting in touch',         intro: n => `Dear ${n},\n\nThank you for your message. It is appreciated.`,                                                                                  body: `I read every message personally and respond to general enquiries within 3–5 business days. Whether you have a question about the podcast, a reaction to an essay, or simply want to start a conversation — I will get back to you.`,  closing: 'Thank you again for reaching out.' },
  waitlist:    { colour: '#1a3028', eyebrow: 'Launch Notification',     heading: "You're on the list",                     intro: (n, t) => `Dear ${n},\n\nThank you for signing up${t ? ` for launch notifications for "${t}"` : ' for launch notifications'}.`,               body: `You will be among the first to hear when it is available — along with any early-access offers or pre-launch pricing. No other emails, no noise. Just the one announcement when it matters.`, closing: "I appreciate your interest and look forward to sharing it with you." },
};

async function getSiteContent(url, key) {
  try {
    const r = await fetch(`${url}/rest/v1/site_content?select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) return null;
    const rows = await r.json();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  } catch { return null; }
}

async function getEmailTemplates(url, key) {
  try {
    const r = await fetch(`${url}/rest/v1/email_templates?select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) return {};
    const rows = await r.json();
    return Object.fromEntries((rows || []).map(r => [r.type, r]));
  } catch { return {}; }
}

function resolveNotifyEmail(sc, type, fallback) {
  const map = { speaking: sc?.routeSpeaking, podcast: sc?.routePodcast, writing: sc?.routeWriting, partnership: sc?.routePartnership };
  return map[type] || sc?.routeDefault || fallback;
}

function buildSignatureHtml(sc) {
  const name  = sc?.emailSigName  || 'Phelim Ekwebe';
  const title = sc?.emailSigTitle || 'Life Strategist · Systems Thinker · Author';
  return `
    <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:16px;color:#0d0d0b;font-weight:500;">${name}</p>
    <p style="margin:0;font-size:12px;color:#888;">${title}</p>
    <p style="margin:6px 0 0;font-size:12px;color:#888;"><a href="https://phelim.me" style="color:#263d33;text-decoration:none;">phelim.me</a> &nbsp;·&nbsp; <a href="https://phelim.me/podcast.html" style="color:#263d33;text-decoration:none;">Future Foundations Podcast</a></p>`;
}

function buildEmailHtml({ colour, eyebrow, heading, content, closing, signatureHtml }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 20px;">
  <tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="background:${colour};padding:32px 40px;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,246,241,.5);">${eyebrow}</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f8f6f1;font-weight:400;line-height:1.2;">${heading}</p>
    </td></tr>
    <tr><td style="background:#fff;padding:36px 40px;">
      ${content}
      ${closing ? `<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:15px;color:#263d33;font-style:italic;">${closing}</p>` : ''}
    </td></tr>
    <tr><td style="background:#fff;border-top:1px solid #f0ede6;padding:24px 40px;">${signatureHtml || buildSignatureHtml(null)}</td></tr>
    <tr><td style="padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">You received this because you submitted an enquiry at <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>&copy; ${new Date().getFullYear()} Phelim Ekwebe.</p>
    </td></tr>
  </table></td></tr>
</table></body></html>`;
}

function buildAutoReply(name, type, override, signatureHtml, extraCtx) {
  const base    = DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES.general;
  const introFn = override?.intro ? (n => override.intro.replace(/{name}/g, n)) : base.intro;
  const intro   = typeof introFn === 'function' ? introFn(name, extraCtx?.item_title) : String(introFn).replace(/{name}/g, name);
  const bodyTxt = override?.body    || base.body;
  const closing = override?.closing !== undefined ? override.closing : base.closing;
  const heading = override?.heading || base.heading;
  const content = [intro, bodyTxt].map(p =>
    p.split('\n\n').map(line => `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">${line.replace(/\n/g,'<br>')}</p>`).join('')
  ).join('');
  return buildEmailHtml({ colour: base.colour, eyebrow: base.eyebrow, heading, content, closing: closing || null, signatureHtml });
}

function buildNotification(name, email, type, fields, submissionId, signatureHtml) {
  const label = (type || 'general').charAt(0).toUpperCase() + (type || 'general').slice(1);
  const skip  = new Set(['name','email','bot-field','form-name']);
  const rows  = Object.entries(fields || {}).filter(([k]) => !skip.has(k) && fields[k])
    .map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap;vertical-align:top;width:140px;">${k.replace(/-/g,' ')}</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;line-height:1.6;">${String(v).replace(/\n/g,'<br>')}</td></tr>`).join('');
  const portalUrl = submissionId ? `https://phelim.me/portal/contacts.html?open=${submissionId}` : 'https://phelim.me/portal/contacts.html';
  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.6;">New <strong>${label}</strong> enquiry from <strong>${name}</strong> &lt;<a href="mailto:${email}" style="color:#263d33;">${email}</a>&gt;.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:20px;">
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;">name</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${name}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">email</td><td style="padding:8px 12px;font-size:14px;"><a href="mailto:${email}" style="color:#263d33;">${email}</a></td></tr>
      ${rows}
    </table>
    <a href="${portalUrl}" style="display:inline-block;background:#263d33;color:#f8f6f1;text-decoration:none;padding:12px 24px;font-size:14px;letter-spacing:.03em;margin-right:10px;">Reply in Portal →</a>
    <a href="mailto:${email}?subject=Re: Your ${type || 'general'} enquiry" style="display:inline-block;background:transparent;color:#263d33;text-decoration:none;padding:12px 24px;font-size:14px;letter-spacing:.03em;border:1px solid #263d33;">Quick reply</a>`;
  return buildEmailHtml({ colour: '#263d33', eyebrow: `New ${label} Enquiry`, heading: `${name} sent you a message`, content, closing: null, signatureHtml });
}

async function sendEmail(apiKey, { from, to, subject, html, replyTo }) {
  const payload = { from, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) payload.reply_to = replyTo;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') { respond(res, 405, { error: 'Method not allowed' }); return; }

  const RESEND_KEY     = process.env.RESEND_API_KEY;
  const SUP_URL        = process.env.SUPABASE_URL;
  const SUP_KEY        = process.env.SUPABASE_SERVICE_KEY;
  const NOTIFY_DEFAULT = process.env.NOTIFY_EMAIL || 'hello@phelim.me';

  if (!RESEND_KEY) { respond(res, 500, { error: 'RESEND_API_KEY not set' }); return; }

  const body     = req.body || {};
  const sanitize = s => (typeof s === 'string' ? s.replace(/[\r\n]/g, ' ').trim().slice(0, 500) : '');
  const isEmail  = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const { type, fields, templateOverride, item_key, item_title } = body;
  const name  = sanitize(body.name);
  const email = sanitize(body.email);

  if (!name || !email)   { respond(res, 400, { error: 'name and email required' }); return; }
  if (!isEmail(email))   { respond(res, 400, { error: 'Invalid email address' }); return; }

  // Rate limiting
  if (SUP_URL && SUP_KEY) {
    try {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const rateRes   = await fetch(
        `${SUP_URL}/rest/v1/submissions?email=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(tenMinAgo)}&select=id`,
        { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } }
      );
      const rateRows = rateRes.ok ? await rateRes.json() : [];
      if (Array.isArray(rateRows) && rateRows.length >= 3) {
        respond(res, 429, { error: 'Too many submissions. Please wait a few minutes before trying again.' });
        return;
      }
    } catch(_) {}
  }

  // Waitlist duplicate check
  if (type === 'waitlist' && SUP_URL && SUP_KEY) {
    try {
      const filter = item_key
        ? `?type=eq.waitlist&email=eq.${encodeURIComponent(email)}&fields->>item_key=eq.${encodeURIComponent(item_key)}&select=id&limit=1`
        : `?type=eq.waitlist&email=eq.${encodeURIComponent(email)}&select=id&limit=1`;
      const dupRes  = await fetch(`${SUP_URL}/rest/v1/submissions${filter}`, { headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}` } });
      const dupRows = dupRes.ok ? await dupRes.json() : [];
      if (dupRows && dupRows.length > 0) { respond(res, 200, { success: true, duplicate: true }); return; }
    } catch(_) {}
  }

  const submissionId   = 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const enrichedFields = { ...(fields || {}) };
  if (item_key)   enrichedFields.item_key   = item_key;
  if (item_title) enrichedFields.item_title = item_title;

  if (SUP_URL && SUP_KEY) {
    try {
      await fetch(`${SUP_URL}/rest/v1/submissions`, {
        method: 'POST',
        headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify([{ id: submissionId, name, email, type: type || 'general', fields: enrichedFields, status: 'new', starred: false, created_at: new Date().toISOString() }]),
      });
    } catch(e) { console.warn('Supabase save failed:', e.message); }
  }

  const [sc, dbTemplates] = await Promise.all([
    (SUP_URL && SUP_KEY) ? getSiteContent(SUP_URL, SUP_KEY) : Promise.resolve(null),
    (SUP_URL && SUP_KEY) ? getEmailTemplates(SUP_URL, SUP_KEY) : Promise.resolve({}),
  ]);
  const signatureHtml     = buildSignatureHtml(sc);
  const resolvedTemplate  = dbTemplates[type] || templateOverride || null;
  const NOTIFY            = resolveNotifyEmail(sc, type, NOTIFY_DEFAULT);
  const fromAddr          = sc?.routeNoreply ? `Phelim Ekwebe <${sc.routeNoreply}>` : `Phelim Ekwebe <${SENDER}>`;
  const errors            = [];

  try {
    await sendEmail(RESEND_KEY, {
      from: fromAddr, to: email, replyTo: NOTIFY,
      subject: templateOverride?.subject || `Thank you for your ${type || 'general'} enquiry — Phelim Ekwebe`,
      html: buildAutoReply(name, type || 'general', resolvedTemplate, signatureHtml, { item_key, item_title }),
    });
  } catch(e) { errors.push('auto-reply: ' + e.message); }

  try {
    await sendEmail(RESEND_KEY, {
      from: fromAddr, to: NOTIFY, replyTo: email,
      subject: `New ${type || 'general'} enquiry from ${name}`,
      html: buildNotification(name, email, type, fields || {}, submissionId, signatureHtml),
    });
  } catch(e) { errors.push('notification: ' + e.message); }

  if (errors.length === 2) { respond(res, 500, { error: errors.join('; ') }); return; }
  respond(res, 200, { success: true, id: submissionId });
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
