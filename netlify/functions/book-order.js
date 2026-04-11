// Netlify Function: book-order
// Handles book pre-orders and purchases:
//   1. Saves order to Supabase `book_orders` table (see migration below)
//   2. Sends branded order confirmation to buyer (with order number + cancel CTA)
//   3. Sends owner notification
//
// POST body: { firstName, lastName, email, bookId, bookTitle, format, price, paymentMethod, orderType }
// orderType: 'preorder' | 'purchase'
//
// Supabase migration (run once in SQL Editor):
// create table if not exists book_orders (
//   id           text primary key,
//   book_id      text,
//   book_title   text,
//   format       text,
//   price        text,
//   first_name   text,
//   last_name    text,
//   email        text,
//   payment_method text,
//   order_type   text default 'preorder',
//   status       text default 'pending',
//   created_at   timestamptz default now()
// );
// alter table book_orders enable row level security;
// -- No public read — portal only via service key
//
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
// Optional: NOTIFY_EMAIL (defaults to hello@phelim.me)

async function getSignature(supabaseUrl, supabaseKey) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/site_content?select=*`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  } catch { return null; }
}

function buildSignatureHtml(sc) {
  const name  = sc?.emailSigName  || 'Phelim Ekwebe';
  const title = sc?.emailSigTitle || 'Life Strategist · Systems Thinker · Author';
  return `
    <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:16px;color:#0d0d0b;font-weight:500;">${name}</p>
    <p style="margin:0;font-size:12px;color:#888;">${title}</p>
    <p style="margin:6px 0 0;font-size:12px;color:#888;">
      <a href="https://phelim.me" style="color:#263d33;text-decoration:none;">phelim.me</a>
      &nbsp;·&nbsp;
      <a href="https://phelim.me/podcast.html" style="color:#263d33;text-decoration:none;">Future Foundations Podcast</a>
    </p>`;
}

function buildEmailHtml({ colour, eyebrow, heading, content, closing, signatureHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phelim Ekwebe</title></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:${colour};padding:32px 40px;">
        <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,246,241,.5);">${eyebrow}</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f8f6f1;font-weight:400;line-height:1.2;">${heading}</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px;">
        ${content}
        ${closing ? `<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:15px;color:#263d33;font-style:italic;">${closing}</p>` : ''}
      </td></tr>
      <tr><td style="background:#ffffff;border-top:1px solid #f0ede6;padding:24px 40px;">
        ${signatureHtml}
      </td></tr>
      <tr><td style="padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
          You received this because you placed an order at <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>
          &copy; ${new Date().getFullYear()} Phelim Ekwebe. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildOrderConfirmation({ firstName, bookTitle, format, price, orderId, orderType, paymentMethod, signatureHtml }) {
  const isPreorder = orderType !== 'purchase';
  const eyebrow    = isPreorder ? 'Pre-order Confirmed' : 'Order Confirmed';
  const heading    = isPreorder
    ? `Your pre-order for ${bookTitle} is confirmed`
    : `Your order for ${bookTitle} is confirmed`;

  const deliveryNote = isPreorder
    ? `<p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Your copy will be dispatched as soon as the book is published and available. You will receive a shipping confirmation at that time.</p>`
    : `<p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Your order is being processed. You will receive a delivery or download confirmation shortly.</p>`;

  const bankNote = paymentMethod === 'bank'
    ? `<div style="background:#f7f5f0;border:1px solid #e8e4dd;padding:14px 18px;margin:18px 0;font-size:13px;color:#555;line-height:1.7;">
        <strong>Bank transfer:</strong> Please transfer € ${price} within 5 business days to hold your order. Bank details will follow in a separate email. Orders not paid within 5 business days may be cancelled.
       </div>`
    : '';

  const cancelUrl = `https://phelim.me/portal/contacts.html`; // in future: deep-link to order cancel
  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.7;">Dear ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Thank you for your ${isPreorder ? 'pre-order' : 'purchase'}. Here are your order details:</p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:20px;">
      <tr style="background:#f7f5f0;">
        <td style="padding:10px 14px;font-size:13px;color:#888;width:140px;">Order number</td>
        <td style="padding:10px 14px;font-size:14px;color:#1a1a1a;font-weight:600;">${orderId}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:#888;">Book</td>
        <td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${bookTitle}</td>
      </tr>
      <tr style="background:#f7f5f0;">
        <td style="padding:10px 14px;font-size:13px;color:#888;">Format</td>
        <td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${format}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:#888;">Amount</td>
        <td style="padding:10px 14px;font-size:14px;color:#1a1a1a;font-weight:600;">€ ${price}</td>
      </tr>
      <tr style="background:#f7f5f0;">
        <td style="padding:10px 14px;font-size:13px;color:#888;">Payment</td>
        <td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${paymentMethod === 'bank' ? 'Bank transfer' : 'Card'}</td>
      </tr>
    </table>

    ${deliveryNote}
    ${bankNote}

    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">
      If you have any questions about your order, simply reply to this email and we will be happy to help.
    </p>

    <div style="border-top:1px solid #f0ede6;padding-top:20px;margin-top:24px;">
      <p style="margin:0 0 10px;font-size:13px;color:#888;">Need to cancel?</p>
      <p style="margin:0 0 14px;font-size:13px;color:#555;line-height:1.6;">
        ${isPreorder
          ? 'Pre-orders can be cancelled at any time before dispatch for a full refund. Simply reply to this email with your order number and the reason for cancellation.'
          : 'If you would like to request a return or refund, please reply to this email within 14 days of purchase with your order number.'
        }
      </p>
      <a href="mailto:hello@phelim.me?subject=Cancel order ${orderId}" style="display:inline-block;background:transparent;color:#263d33;text-decoration:none;padding:10px 22px;font-size:13px;border:1px solid #263d33;letter-spacing:.02em;">Request Cancellation →</a>
    </div>

    <div style="border-top:1px solid #f0ede6;padding-top:20px;margin-top:20px;">
      <p style="margin:0 0 10px;font-size:13px;color:#888;">While you wait — explore more from Phelim</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="https://phelim.me/podcast.html" style="display:inline-block;background:#263d33;color:#f8f6f1;text-decoration:none;padding:9px 18px;font-size:13px;letter-spacing:.02em;">Listen: Future Foundations Podcast →</a>
        <a href="https://phelim.me/engagements.html" style="display:inline-block;background:transparent;color:#263d33;text-decoration:none;padding:9px 18px;font-size:13px;border:1px solid #263d33;letter-spacing:.02em;">Read the Essays →</a>
      </div>
    </div>`;

  return buildEmailHtml({
    colour: '#263d33', eyebrow, heading, content,
    closing: 'Thank you for being part of what we are building.',
    signatureHtml,
  });
}

function buildOwnerNotification({ firstName, lastName, email, bookTitle, format, price, orderId, orderType, paymentMethod, signatureHtml }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.7;">
      New <strong>${orderType === 'purchase' ? 'purchase' : 'pre-order'}</strong> for <strong>${bookTitle}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:20px;">
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;width:140px;">Order number</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;font-weight:600;">${orderId}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">Customer</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${firstName} ${lastName} &lt;<a href="mailto:${email}" style="color:#263d33;">${email}</a>&gt;</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;">Book</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${bookTitle}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">Format</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${format}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;">Amount</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;font-weight:600;">€ ${price}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">Payment</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${paymentMethod === 'bank' ? 'Bank transfer (awaiting payment)' : 'Card'}</td></tr>
    </table>
    <a href="mailto:${email}?subject=Re: Your order ${orderId}" style="display:inline-block;background:#263d33;color:#f8f6f1;text-decoration:none;padding:10px 22px;font-size:13px;letter-spacing:.02em;">Reply to customer →</a>`;

  return buildEmailHtml({
    colour: '#1a2d24',
    eyebrow: `New ${orderType === 'purchase' ? 'Purchase' : 'Pre-order'}`,
    heading: `${firstName} ${lastName} ordered ${bookTitle}`,
    content,
    closing: null,
    signatureHtml,
  });
}

async function sendEmail(apiKey, { from, to, subject, html, replyTo }) {
  const payload = { from, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SUP_URL    = process.env.SUPABASE_URL;
  const SUP_KEY    = process.env.SUPABASE_SERVICE_KEY;
  const NOTIFY     = process.env.NOTIFY_EMAIL || 'hello@phelim.me';

  if (!RESEND_KEY) return json(500, { error: 'RESEND_API_KEY not set' });

  let body;
  try { body = JSON.parse(event.body); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { firstName, lastName, email, bookId, bookTitle, format, price, paymentMethod, orderType } = body;
  if (!firstName || !email || !bookTitle) return json(400, { error: 'firstName, email, bookTitle required' });

  const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const sc      = (SUP_URL && SUP_KEY) ? await getSignature(SUP_URL, SUP_KEY) : null;
  const sigHtml = buildSignatureHtml(sc);

  // 1. Save order to Supabase (best-effort)
  if (SUP_URL && SUP_KEY) {
    try {
      await fetch(`${SUP_URL}/rest/v1/book_orders`, {
        method: 'POST',
        headers: {
          apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify([{
          id: orderId, book_id: bookId || bookTitle.toLowerCase().replace(/\s+/g,'-'),
          book_title: bookTitle, format: format || 'Hardcover', price: price || '0',
          first_name: firstName, last_name: lastName || '', email,
          payment_method: paymentMethod || 'card',
          order_type: orderType || 'preorder', status: 'pending',
          created_at: new Date().toISOString(),
        }]),
      });
    } catch(e) { console.warn('Order save failed:', e.message); }
  }

  const errors = [];

  // 2. Send confirmation to buyer
  try {
    await sendEmail(RESEND_KEY, {
      from: 'Phelim Ekwebe <hello@phelim.me>',
      to: email,
      replyTo: NOTIFY,
      subject: `Order confirmed: ${bookTitle} — ${orderId}`,
      html: buildOrderConfirmation({ firstName, bookTitle, format, price, orderId, orderType: orderType||'preorder', paymentMethod, signatureHtml: sigHtml }),
    });
  } catch(e) {
    errors.push('confirmation: ' + e.message);
    console.error('Confirmation email failed:', e.message);
  }

  // 3. Send owner notification
  try {
    await sendEmail(RESEND_KEY, {
      from: 'phelim.me <hello@phelim.me>',
      to: NOTIFY,
      replyTo: email,
      subject: `New ${orderType||'pre-order'}: ${bookTitle} — ${firstName} ${lastName||''}`,
      html: buildOwnerNotification({ firstName, lastName: lastName||'', email, bookTitle, format, price, orderId, orderType: orderType||'preorder', paymentMethod, signatureHtml: sigHtml }),
    });
  } catch(e) {
    errors.push('notification: ' + e.message);
    console.error('Owner notification failed:', e.message);
  }

  if (errors.length === 2) return json(500, { error: errors.join('; ') });
  return json(200, { success: true, orderId });
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
