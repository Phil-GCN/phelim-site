// Netlify Function: send-reply
// Receives { to, name, subject, type, replyBody } from portal
// Sends a branded HTML email via Resend API

const TEMPLATES = {
  speaking: {
    colour: '#263d33',
    eyebrow: 'Speaking & Events',
    heading: 'Thank you for your speaking enquiry',
    intro: (name) => `Dear ${name},\n\nThank you for reaching out about a speaking engagement. I appreciate you taking the time to share the details of your event.`,
    body: `I review all speaking enquiries personally and respond within 2 business days. If your event aligns with my current availability and the themes I speak on — identity, systems thinking, decision architecture, and long-term performance — I will be in touch to discuss further.\n\nIn the meantime, you can explore my speaking topics and previous engagements on the site.`,
    closing: 'I look forward to reviewing your enquiry.',
  },
  podcast: {
    colour: '#1a3028',
    eyebrow: 'Podcast Collaboration',
    heading: 'Thank you for your podcast enquiry',
    intro: (name) => `Dear ${name},\n\nThank you for reaching out about a podcast collaboration. I appreciate your interest in Future Foundations.`,
    body: `I review all podcast enquiries carefully — whether you are inviting me onto your show or applying to guest on Future Foundations. Guest episodes are selective, and the most compelling applications centre on a specific story, perspective, or experience that would genuinely serve the audience.\n\nI will be in touch within 3–5 business days.`,
    closing: 'Thank you again for getting in touch.',
  },
  writing: {
    colour: '#263d33',
    eyebrow: 'Writing & Media',
    heading: 'Thank you for your media enquiry',
    intro: (name) => `Dear ${name},\n\nThank you for your writing and media enquiry. It is good to hear from you.`,
    body: `Whether you are working on an interview, feature, guest essay, or press piece related to Built to Last, I take all media enquiries seriously and respond within 3–5 business days.\n\nIf this is time-sensitive, please do note that in a follow-up and I will do my best to accommodate.`,
    closing: 'I look forward to connecting.',
  },
  partnership: {
    colour: '#b08d57',
    eyebrow: 'Partnership',
    heading: 'Thank you for your partnership proposal',
    intro: (name) => `Dear ${name},\n\nThank you for submitting a partnership proposal. I appreciate you taking the time to outline the opportunity.`,
    body: `Partnerships are considered carefully — I only feature and align with work that genuinely reflects the Future Foundations philosophy around intentional building, systems thinking, and long-term value. I review all proposals and respond within 5–7 business days.\n\nIf there is a strong fit, I will reach out to explore the details further.`,
    closing: 'Thank you for your interest in working together.',
  },
  general: {
    colour: '#263d33',
    eyebrow: 'General Enquiry',
    heading: 'Thank you for getting in touch',
    intro: (name) => `Dear ${name},\n\nThank you for your message. It is appreciated.`,
    body: `I read every message personally and respond to general enquiries within 3–5 business days. Whether you have a question about the podcast, a reaction to an essay, or simply want to start a conversation — I will get back to you.`,
    closing: 'Thank you again for reaching out.',
  },
};

function buildAutoReply(name, type) {
  const t = TEMPLATES[type] || TEMPLATES.general;
  const introText = t.intro(name);
  const paragraphs = [introText, t.body].map(p =>
    p.split('\n\n').map(line => `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">${line.replace(/\n/g,'<br>')}</p>`).join('')
  ).join('');

  return buildEmailHtml({
    colour: t.colour,
    eyebrow: t.eyebrow,
    heading: t.heading,
    content: paragraphs,
    closing: t.closing,
  });
}

function buildCustomReply(name, replyBody) {
  const content = replyBody.split('\n\n')
    .map(p => `<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.7;">${p.replace(/\n/g,'<br>')}</p>`)
    .join('');

  return buildEmailHtml({
    colour: '#263d33',
    eyebrow: 'Message from Phelim Ekwebe',
    heading: `Hi ${name},`,
    content,
    closing: null,
  });
}

function buildEmailHtml({ colour, eyebrow, heading, content, closing }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Phelim Ekwebe</title>
</head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:${colour};padding:32px 40px;">
        <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,246,241,.5);">${eyebrow}</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f8f6f1;font-weight:400;line-height:1.2;">${heading}</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px 40px;">
        ${content}
        ${closing ? `<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:15px;color:#263d33;font-style:italic;">${closing}</p>` : ''}
      </td></tr>

      <!-- Signature -->
      <tr><td style="background:#ffffff;border-top:1px solid #f0ede6;padding:24px 40px;">
        <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:16px;color:#0d0d0b;font-weight:500;">Phelim Ekwebe</p>
        <p style="margin:0;font-size:12px;color:#888;">Life Strategist · Systems Thinker · Author</p>
        <p style="margin:6px 0 0;font-size:12px;color:#888;"><a href="https://phelim.me" style="color:#263d33;text-decoration:none;">phelim.me</a> &nbsp;·&nbsp; <a href="https://phelim.me/podcast.html" style="color:#263d33;text-decoration:none;">Future Foundations Podcast</a></p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
          You received this because you submitted an enquiry at <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>
          &copy; 2025 Phelim Ekwebe. All rights reserved.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY not set' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { to, name, subject, type, replyBody, mode } = body;

  if (!to || !name) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: to, name' }) };
  }

  const html = mode === 'custom'
    ? buildCustomReply(name, replyBody || '')
    : buildAutoReply(name, type || 'general');

  const emailSubject = subject || (mode === 'custom'
    ? `Re: Your enquiry — Phelim Ekwebe`
    : `Thank you for your ${type || 'general'} enquiry — Phelim Ekwebe`);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Phelim Ekwebe <hello@phelim.me>',
        to: [to],
        subject: emailSubject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, id: data.id }) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
