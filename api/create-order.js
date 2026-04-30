// Vercel Serverless Function: create-order
// Generic order handler for any sellable item in the catalog.
//
// POST /api/create-order
// Body: { firstName, lastName, email, itemId, itemTitle, variant,
//         paymentMethod, orderType, paymentIntentId? }
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, STRIPE_SECRET_KEY
// Optional: NOTIFY_EMAIL, SENDER_EMAIL

const CATALOG = {
  btl: { title: 'Built to Last',   type: 'book', variants: { Hardcover: '24.99', Paperback: '14.99', eBook: '9.99' } },
  bs:  { title: 'Beyond Survival', type: 'book', variants: { Hardcover: '22.99', Paperback: '12.99', eBook: '8.99' } },
};

const SENDER = process.env.SENDER_EMAIL || 'hello@phelim.me';

async function verifyPaymentIntent(paymentIntentId, stripeKey) {
  if (!/^pi_[a-zA-Z0-9_]+$/.test(paymentIntentId)) {
    return { ok: false, error: 'Invalid paymentIntentId format' };
  }
  const auth  = 'Basic ' + Buffer.from(stripeKey + ':').toString('base64');
  const piRes = await fetch(
    `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
    { headers: { Authorization: auth } }
  );
  const pi = await piRes.json();
  if (!piRes.ok) return { ok: false, error: pi.error?.message || 'Stripe verification failed' };
  if (pi.status !== 'succeeded') return { ok: false, error: `Payment not completed (status: ${pi.status})` };
  return { ok: true, verifiedPrice: (pi.amount / 100).toFixed(2) };
}

async function getSiteContent(supUrl, supKey) {
  try {
    const r = await fetch(`${supUrl}/rest/v1/site_content?select=*`, {
      headers: { apikey: supKey, Authorization: `Bearer ${supKey}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return Object.fromEntries(rows.map(row => [row.key, row.value]));
  } catch { return null; }
}

function buildSignature(sc) {
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

function buildEmailWrapper({ colour, eyebrow, heading, content, closing, sigHtml }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:${colour};padding:32px 40px;">
        <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,246,241,.5);">${eyebrow}</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f8f6f1;font-weight:400;line-height:1.2;">${heading}</p>
      </td></tr>
      <tr><td style="background:#fff;padding:36px 40px;">
        ${content}
        ${closing ? `<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:15px;color:#263d33;font-style:italic;">${closing}</p>` : ''}
      </td></tr>
      <tr><td style="background:#fff;border-top:1px solid #f0ede6;padding:24px 40px;">${sigHtml}</td></tr>
      <tr><td style="padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
          You received this because you placed an order at
          <a href="https://phelim.me" style="color:#263d33;">phelim.me</a>.<br>
          &copy; ${new Date().getFullYear()} Phelim Ekwebe. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function buildConfirmationEmail({ firstName, itemTitle, itemType, variant, price, orderId, orderType, paymentMethod, sigHtml }) {
  const isPreorder = orderType !== 'purchase';
  const eyebrow    = isPreorder ? 'Order Confirmed — Pre-order' : 'Order Confirmed';
  const heading    = `Your ${isPreorder ? 'pre-order' : 'order'} for ${itemTitle} is confirmed`;

  const bankNote = paymentMethod === 'bank'
    ? `<div style="background:#f7f5f0;border:1px solid #e8e4dd;padding:14px 18px;margin:18px 0;font-size:13px;color:#555;line-height:1.7;">
        <strong>Bank transfer:</strong> Please transfer € ${price} within 5 business days to hold your order. Bank details will follow in a separate email.
       </div>`
    : '';

  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.7;">Dear ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Thank you for your ${isPreorder ? 'pre-order' : 'purchase'}. Here are your order details:</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:20px;">
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;width:140px;">Order number</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;font-weight:600;">${orderId}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#888;">Item</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${itemTitle}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;">Format</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${variant}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#888;">Amount</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;font-weight:600;">€ ${price}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;">Payment</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${paymentMethod === 'bank' ? 'Bank transfer' : 'Card'}</td></tr>
    </table>
    ${bankNote}
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Questions? Simply reply to this email.</p>
    <div style="border-top:1px solid #f0ede6;padding-top:20px;margin-top:24px;">
      <a href="mailto:${SENDER}?subject=Cancel%20order%20${orderId}"
         style="display:inline-block;background:transparent;color:#263d33;text-decoration:none;padding:10px 22px;font-size:13px;border:1px solid #263d33;letter-spacing:.02em;">
        Request Cancellation →
      </a>
    </div>`;

  return buildEmailWrapper({ colour: '#263d33', eyebrow, heading, content, closing: 'Thank you for being part of what we are building.', sigHtml });
}

function buildOwnerNotification({ firstName, lastName, email, itemTitle, variant, price, orderId, orderType, paymentMethod, sigHtml }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.7;">
      New <strong>${orderType === 'purchase' ? 'purchase' : 'pre-order'}</strong> for <strong>${itemTitle}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:20px;">
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;width:140px;">Order number</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;font-weight:600;">${orderId}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">Customer</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${firstName} ${lastName} &lt;<a href="mailto:${email}" style="color:#263d33;">${email}</a>&gt;</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;">Item</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${itemTitle}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">Format</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${variant}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;">Amount</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;font-weight:600;">€ ${price}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">Payment</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${paymentMethod === 'bank' ? 'Bank transfer (awaiting)' : 'Card — paid'}</td></tr>
    </table>
    <a href="mailto:${email}?subject=Re:%20Your%20order%20${orderId}"
       style="display:inline-block;background:#263d33;color:#f8f6f1;text-decoration:none;padding:10px 22px;font-size:13px;letter-spacing:.02em;">
      Reply to customer →
    </a>`;

  return buildEmailWrapper({ colour: '#1a2d24', eyebrow: `New ${orderType === 'purchase' ? 'Purchase' : 'Pre-order'}`, heading: `${firstName} ${lastName} ordered ${itemTitle}`, content, closing: null, sigHtml });
}

async function sendEmail(apiKey, { from, to, replyTo, subject, html }) {
  const payload = { from, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) payload.reply_to = replyTo;
  const r = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') { respond(res, 405, { error: 'Method not allowed' }); return; }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SUP_URL    = process.env.SUPABASE_URL;
  const SUP_KEY    = process.env.SUPABASE_SERVICE_KEY;
  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  const NOTIFY     = process.env.NOTIFY_EMAIL || SENDER;

  if (!RESEND_KEY) { respond(res, 500, { error: 'RESEND_API_KEY not set' }); return; }

  const body          = req.body || {};
  const sanitize      = s => (typeof s === 'string' ? s.replace(/[\r\n]/g, ' ').trim().slice(0, 300) : '');
  const isEmail       = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const firstName       = sanitize(body.firstName);
  const lastName        = sanitize(body.lastName  || '');
  const email           = sanitize(body.email);
  const itemId          = sanitize(body.itemId);
  const itemTitle       = sanitize(body.itemTitle);
  const variant         = sanitize(body.variant   || 'Standard');
  const paymentMethod   = sanitize(body.paymentMethod || 'card');
  const orderType       = sanitize(body.orderType || 'preorder');
  const paymentIntentId = sanitize(body.paymentIntentId || '');

  if (!firstName || !email)                        { respond(res, 400, { error: 'firstName and email are required' }); return; }
  if (!isEmail(email))                             { respond(res, 400, { error: 'Invalid email address' }); return; }
  if (!['card','bank'].includes(paymentMethod))    { respond(res, 400, { error: 'Invalid paymentMethod' }); return; }
  if (!['preorder','purchase'].includes(orderType)){ respond(res, 400, { error: 'Invalid orderType' }); return; }

  const catalogItem = CATALOG[itemId];
  if (!catalogItem) { respond(res, 400, { error: `Item "${itemId}" is not in the catalog` }); return; }
  if (!catalogItem.variants[variant]) { respond(res, 400, { error: `Unknown variant "${variant}" for this item` }); return; }

  let finalPrice  = catalogItem.variants[variant];
  const itemType  = catalogItem.type || 'item';
  let orderStatus = 'pending';

  if (paymentMethod === 'card') {
    if (!paymentIntentId) { respond(res, 400, { error: 'paymentIntentId is required for card orders' }); return; }
    if (!STRIPE_KEY)      { respond(res, 500, { error: 'STRIPE_SECRET_KEY not set' }); return; }

    const verify = await verifyPaymentIntent(paymentIntentId, STRIPE_KEY);
    if (!verify.ok) { respond(res, 400, { error: verify.error }); return; }

    finalPrice  = verify.verifiedPrice;
    orderStatus = 'confirmed';
  }

  const resolvedTitle = itemTitle || catalogItem.title;
  const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  if (SUP_URL && SUP_KEY) {
    try {
      await fetch(`${SUP_URL}/rest/v1/orders`, {
        method:  'POST',
        headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body:    JSON.stringify({
          id: orderId, item_id: itemId, item_title: resolvedTitle, item_type: itemType,
          variant, price: parseFloat(finalPrice), payment_method: paymentMethod,
          payment_intent_id: paymentIntentId || null,
          order_type: orderType, first_name: firstName, last_name: lastName,
          email, status: orderStatus,
        }),
      });
    } catch(e) { console.warn('Order DB save failed:', e.message); }
  }

  const sc      = (SUP_URL && SUP_KEY) ? await getSiteContent(SUP_URL, SUP_KEY) : null;
  const sigHtml = buildSignature(sc);
  const errors  = [];

  try {
    await sendEmail(RESEND_KEY, {
      from:    `Phelim Ekwebe <${SENDER}>`,
      to:      email,
      replyTo: NOTIFY,
      subject: `Order confirmed: ${resolvedTitle} — ${orderId}`,
      html:    buildConfirmationEmail({ firstName, itemTitle: resolvedTitle, itemType, variant, price: finalPrice, orderId, orderType, paymentMethod, sigHtml }),
    });
  } catch(e) { errors.push('confirmation: ' + e.message); }

  try {
    await sendEmail(RESEND_KEY, {
      from:    `phelim.me <${SENDER}>`,
      to:      NOTIFY,
      replyTo: email,
      subject: `New ${orderType}: ${resolvedTitle} — ${firstName} ${lastName}`,
      html:    buildOwnerNotification({ firstName, lastName, email, itemTitle: resolvedTitle, variant, price: finalPrice, orderId, orderType, paymentMethod, sigHtml }),
    });
  } catch(e) { errors.push('notification: ' + e.message); }

  if (errors.length === 2) { respond(res, 500, { error: errors.join('; ') }); return; }
  respond(res, 200, { success: true, orderId });
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
