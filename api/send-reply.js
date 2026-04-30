// Vercel Serverless Function: send-reply
// Handles: auto-reply to submitter, notification to owner, custom portal replies
// POST /api/send-reply
// Requires: RESEND_API_KEY

const SENDER = process.env.SENDER_EMAIL || 'hello@phelim.me';

const DEFAULT_TEMPLATES = {
  speaking:    { colour: '#263d33', eyebrow: 'Speaking & Events',    heading: 'Thank you for your speaking enquiry',    intro: n => `Dear ${n},\n\nThank you for reaching out about a speaking engagement. I appreciate you taking the time to share the details of your event.`,  body: `I review all speaking enquiries personally and respond within 2 business days. If your event aligns with my current availability and the themes I speak on — identity, systems thinking, decision architecture, and long-term performance — I will be in touch to discuss further.\n\nIn the meantime, you can explore my speaking topics and previous engagements on the site.`, closing: 'I look forward to reviewing your enquiry.' },
  podcast:     { colour: '#1a3028', eyebrow: 'Podcast Collaboration', heading: 'Thank you for your podcast enquiry',     intro: n => `Dear ${n},\n\nThank you for reaching out about a podcast collaboration. I appreciate your interest in Future Foundations.`,                    body: `I review all podcast enquiries carefully — whether you are inviting me onto your show or applying to guest on Future Foundations. Guest episodes are selective, and the most compelling applications centre on a specific story, perspective, or experience that would genuinely serve the audience.\n\nI will be in touch within 3–5 business days.`, closing: 'Thank you again for getting in touch.' },
  writing:     { colour: '#263d33', eyebrow: 'Writing & Media',       heading: 'Thank you for your media enquiry',       intro: n => `Dear ${n},\n\nThank you for your writing and media enquiry. It is good to hear from you.`,                                                     body: `Whether you are working on an interview, feature, guest essay, or press piece related to Built to Last, I take all media enquiries seriously and respond within 3–5 business days.\n\nIf this is time-sensitive, please do note that in a follow-up and I will do my best to accommodate.`, closing: 'I look forward to connecting.' },
  partnership: { colour: '#b08d57', eyebrow: 'Partnership',           heading: 'Thank you for your partnership proposal', intro: n => `Dear ${n},\n\nThank you for submitting a partnership proposal. I appreciate you taking the time to outline the opportunity.`,             body: `Partnerships are considered carefully — I only feature and align with work that genuinely reflects the Future Foundations philosophy around intentional building, systems thinking, and long-term value. I review all proposals and respond within 5–7 business days.\n\nIf there is a strong fit, I will reach out to explore the details further.`, closing: 'Thank you for your interest in working together.' },
  general:     { colour: '#263d33', eyebrow: 'General Enquiry',       heading: 'Thank you for getting in touch',         intro: n => `Dear ${n},\n\nThank you for your message. It is appreciated.`,                                                                                body: `I read every message personally and respond to general enquiries within 3–5 business days. Whether you have a question about the podcast, a reaction to an essay, or simply want to start a conversation — I will get back to you.`, closing: 'Thank you again for reaching out.' },
};

function buildEmailHtml({ colour, eyebrow, heading, content, closing }) {
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
    <tr><td style="background:#fff;border-top:1px solid #f0ede6;padding:24px 40px;">
      <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:16px;color:#0d0d0b;font-weight:500;">Phelim Ekwebe</p>
      <p style="margin:0;font-size:12px;color:#888;">Life Strategist · Systems Thinker · Author</p>
      <p style="margin:6px 0 0;font-size:12px;color:#888;"><a href="https://phelim.me" style="color:#263d33;text-decoration:none;">phelim.me</a> &nbsp;·&nbsp; <a href="https://phelim.me/podcast.html" style="color:#263d33;text-decoration:none;">Future Foundations Podcast</a></p>
    </td></tr>
    <tr><td style="padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">You received this because you submitted an enquiry at <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>&copy; ${new Date().getFullYear()} Phelim Ekwebe.</p>
    </td></tr>
  </table></td></tr>
</table></body></html>`;
}

function buildAutoReply(name, type, override) {
  const base        = DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES.general;
  const introText   = override?.intro  ? override.intro.replace(/{name}/g, name) : base.intro(name);
  const bodyText    = override?.body   || base.body;
  const closingText = override?.closing !== undefined ? override.closing : base.closing;
  const heading     = override?.heading || base.heading;
  const paragraphs  = [introText, bodyText].map(p =>
    p.split('\n\n').map(line => `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">${line.replace(/\n/g,'<br>')}</p>`).join('')
  ).join('');
  return buildEmailHtml({ colour: base.colour, eyebrow: base.eyebrow, heading, content: paragraphs, closing: closingText || null });
}

function buildCustomReply(name, replyBody) {
  const content = replyBody.split('\n\n')
    .map(p => `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">${p.replace(/\n/g,'<br>')}</p>`)
    .join('');
  return buildEmailHtml({ colour: '#263d33', eyebrow: 'Message from Phelim Ekwebe', heading: `Hi ${name},`, content, closing: null });
}

function buildNotification(name, email, type, fields, submissionId) {
  const label = (type || 'general').charAt(0).toUpperCase() + (type || 'general').slice(1);
  const skip  = new Set(['name','email','bot-field','form-name']);
  const rows  = Object.entries(fields || {}).filter(([k]) => !skip.has(k) && fields[k])
    .map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap;vertical-align:top;width:140px;">${k.replace(/-/g,' ')}</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;line-height:1.6;">${String(v).replace(/\n/g,'<br>')}</td></tr>`).join('');
  const portalUrl = submissionId ? `https://phelim.me/portal/contacts.html?open=${submissionId}` : 'https://phelim.me/portal/contacts.html';
  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.6;">You have a new <strong>${label}</strong> enquiry from <strong>${name}</strong> &lt;<a href="mailto:${email}" style="color:#263d33;">${email}</a>&gt;.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;overflow:hidden;margin-bottom:20px;">
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;">name</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${name}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">email</td><td style="padding:8px 12px;font-size:14px;"><a href="mailto:${email}" style="color:#263d33;">${email}</a></td></tr>
      ${rows}
    </table>
    <a href="${portalUrl}" style="display:inline-block;background:#263d33;color:#f8f6f1;text-decoration:none;padding:12px 24px;font-size:14px;letter-spacing:.03em;margin-right:10px;">Reply in Portal →</a>
    <a href="mailto:${email}?subject=Re: Your ${type || 'general'} enquiry — Phelim Ekwebe" style="display:inline-block;background:transparent;color:#263d33;text-decoration:none;padding:12px 24px;font-size:14px;letter-spacing:.03em;border:1px solid #263d33;">Quick reply</a>`;
  return buildEmailHtml({ colour: '#263d33', eyebrow: `New ${label} Enquiry`, heading: `${name} sent you a message`, content, closing: null });
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

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) { respond(res, 500, { error: 'RESEND_API_KEY not set' }); return; }

  const body     = req.body || {};
  const sanitize = s => (typeof s === 'string' ? s.replace(/[\r\n]/g, ' ').trim().slice(0, 500) : '');
  const isEmail  = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const { type, replyBody, mode, fields, templateOverride, submissionId } = body;
  const to           = sanitize(body.to);
  const name         = sanitize(body.name);
  const subject      = sanitize(body.subject);
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'hello@phelim.me';

  if (!to || !name) { respond(res, 400, { error: 'Missing required fields: to, name' }); return; }
  if (!isEmail(to)) { respond(res, 400, { error: 'Invalid recipient email' }); return; }

  try {
    if (mode === 'auto') {
      await sendEmail(RESEND_API_KEY, {
        from: `Phelim Ekwebe <${SENDER}>`, to, replyTo: NOTIFY_EMAIL,
        subject: subject || `Thank you for your ${type || 'general'} enquiry — Phelim Ekwebe`,
        html: buildAutoReply(name, type || 'general', templateOverride || null),
      });
      await sendEmail(RESEND_API_KEY, {
        from: `phelim.me <${SENDER}>`, to: NOTIFY_EMAIL, replyTo: to,
        subject: `New ${type || 'general'} enquiry from ${name}`,
        html: buildNotification(name, to, type, fields || {}, submissionId || null),
      });
    } else {
      await sendEmail(RESEND_API_KEY, {
        from: `Phelim Ekwebe <${SENDER}>`, to, replyTo: NOTIFY_EMAIL,
        subject: subject || 'Re: Your enquiry — Phelim Ekwebe',
        html: buildCustomReply(name, replyBody || ''),
      });
    }
    respond(res, 200, { success: true });
  } catch(err) {
    respond(res, 500, { error: err.message });
  }
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
