// Vercel Serverless Function: order-actions
// Handles portal-initiated order management actions.
//
// POST /api/order-actions
// Body: { action, orderId?, refund?, refundAmount?, amount? }
//
// Actions:
//   resend         — resend confirmation email (blocked if cancelled)
//   cancel         — cancel order + email both parties; optional Stripe refund
//                    body.refund=true + body.refundAmount (euros, omit for full)
//   refund         — issue Stripe refund without cancelling; body.amount in euros
//   stripe-balance — return Stripe available + pending balance (no orderId needed)
//   stripe-payout  — initiate a Stripe payout; body.amount in euros (omit for full available)
//
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
// For refunds/payouts: STRIPE_SECRET_KEY

const SENDER = process.env.SENDER_EMAIL || 'hello@phelim.me';

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function getOrder(supUrl, supKey, orderId) {
  const r = await fetch(
    `${supUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`,
    { headers: { apikey: supKey, Authorization: `Bearer ${supKey}` } }
  );
  const rows = await r.json();
  if (!r.ok || !rows.length) return null;
  return rows[0];
}

async function patchOrder(supUrl, supKey, orderId, data) {
  const r = await fetch(`${supUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { apikey: supKey, Authorization: `Bearer ${supKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`DB patch failed: ${r.status}`);
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

// ── Stripe helper ─────────────────────────────────────────────────────────────

async function issueStripeRefund(stripeKey, paymentIntentId, amountCents) {
  const auth = 'Basic ' + Buffer.from(stripeKey + ':').toString('base64');
  const body = new URLSearchParams({ payment_intent: paymentIntentId });
  if (amountCents) body.set('amount', String(amountCents));
  const r = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'Stripe refund failed');
  return data;
}

async function getStripeBalance(stripeKey) {
  const auth = 'Basic ' + Buffer.from(stripeKey + ':').toString('base64');
  const r = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: auth } });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'Stripe balance fetch failed');
  // Sum EUR available and pending (handle multi-currency)
  const sum = (arr) => (arr || []).filter(x => x.currency === 'eur').reduce((t, x) => t + x.amount, 0);
  return { available: sum(data.available), pending: sum(data.pending) };
}

async function initiateStripePayout(stripeKey, amountCents) {
  const auth = 'Basic ' + Buffer.from(stripeKey + ':').toString('base64');
  const body = new URLSearchParams({ currency: 'eur', method: 'standard' });
  if (amountCents) body.set('amount', String(amountCents));
  const r = await fetch('https://api.stripe.com/v1/payouts', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'Stripe payout failed');
  return data;
}

// ── Email helpers ─────────────────────────────────────────────────────────────

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

function buildDownloadBlock(orderId, variant) {
  const v = (variant || '').toLowerCase();
  const isBundle    = v === 'complete bundle';
  const isEbook     = v === 'ebook'     || isBundle;
  const isAudiobook = v === 'audiobook' || isBundle;
  if (!isEbook && !isAudiobook) return '';
  const base = 'https://phelim.me';
  const ebookBtn = isEbook
    ? `<a href="${base}/api/download?orderId=${encodeURIComponent(orderId)}&type=ebook"
         style="display:inline-block;background:#263d33;color:#f8f6f1;text-decoration:none;padding:12px 26px;font-size:13px;letter-spacing:.04em;margin-right:10px;margin-bottom:8px;">
        ↓ Download eBook (PDF)
       </a>` : '';
  const audioBtn = isAudiobook
    ? `<a href="${base}/api/download?orderId=${encodeURIComponent(orderId)}&type=audiobook"
         style="display:inline-block;background:#263d33;color:#f8f6f1;text-decoration:none;padding:12px 26px;font-size:13px;letter-spacing:.04em;margin-bottom:8px;">
        ↓ Download Audiobook
       </a>` : '';
  return `
    <div style="background:#f7f5f0;border:1px solid #e8e4dd;border-left:3px solid #263d33;padding:20px 22px;margin:20px 0;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#263d33;letter-spacing:.03em;text-transform:uppercase;">Your download is ready</p>
      <p style="margin:0 0 16px;font-size:13px;color:#555;line-height:1.6;">Click below to download your file. Keep this email — the link is tied to your order and works any time.</p>
      <div>${ebookBtn}${audioBtn}</div>
      <p style="margin:12px 0 0;font-size:11px;color:#999;line-height:1.5;">If a button doesn't work, copy and paste the link into your browser.</p>
    </div>`;
}

// ── Confirmation email (same as create-order) ─────────────────────────────────

function buildConfirmationEmail({ firstName, itemTitle, variant, price, orderId, orderType, paymentMethod, sigHtml }) {
  const isPreorder = orderType !== 'purchase';
  const bankNote = paymentMethod === 'bank'
    ? `<div style="background:#f7f5f0;border:1px solid #e8e4dd;padding:14px 18px;margin:18px 0;font-size:13px;color:#555;line-height:1.7;">
        <strong>Bank transfer:</strong> Please transfer € ${price} within 5 business days to hold your order. Bank details will follow in a separate email.
       </div>` : '';
  const downloadBlock = !isPreorder ? buildDownloadBlock(orderId, variant) : '';
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
    ${bankNote}${downloadBlock}
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Questions? Simply reply to this email.</p>
    <div style="border-top:1px solid #f0ede6;padding-top:20px;margin-top:24px;">
      <a href="mailto:${SENDER}?subject=Cancel%20order%20${orderId}"
         style="display:inline-block;background:transparent;color:#263d33;text-decoration:none;padding:10px 22px;font-size:13px;border:1px solid #263d33;letter-spacing:.02em;">
        Request Cancellation →
      </a>
    </div>`;
  return buildEmailWrapper({ colour: '#263d33', eyebrow: isPreorder ? 'Order Confirmed — Pre-order' : 'Order Confirmed', heading: `Your ${isPreorder ? 'pre-order' : 'order'} for ${itemTitle} is confirmed`, content, closing: 'Thank you for being part of what we are building.', sigHtml });
}

// ── Cancellation emails ───────────────────────────────────────────────────────

function buildCancellationCustomer({ firstName, itemTitle, variant, price, orderId, refundIssued, refundAmount, sigHtml }) {
  const refundNote = refundIssued
    ? `<div style="background:#f0f7f4;border:1px solid #c8e0d6;border-left:3px solid #263d33;padding:16px 20px;margin:18px 0;font-size:13px;color:#333;line-height:1.7;">
        <strong>Refund issued:</strong> A refund of <strong>€ ${refundAmount}</strong> has been processed to your original payment method. Please allow 5–10 business days for it to appear on your statement.
       </div>`
    : `<p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">If you paid by bank transfer and a refund is owed, we will be in touch separately to arrange it.</p>`;

  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.7;">Dear ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Your order has been cancelled as requested. Here is a summary:</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:20px;">
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;width:140px;">Order number</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;font-weight:600;">${orderId}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#888;">Item</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${itemTitle}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;">Format</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${variant}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#888;">Amount</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">€ ${price}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;">Status</td><td style="padding:10px 14px;font-size:14px;color:#c0392b;font-weight:600;">Cancelled</td></tr>
    </table>
    ${refundNote}
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Questions? Reply to this email and we will help.</p>`;
  return buildEmailWrapper({ colour: '#8b2e2e', eyebrow: 'Order Cancelled', heading: `Your order for ${itemTitle} has been cancelled`, content, closing: null, sigHtml });
}

function buildCancellationAdmin({ firstName, lastName, email, itemTitle, variant, price, orderId, refundIssued, refundAmount, sigHtml }) {
  const refundNote = refundIssued
    ? `<p style="margin:0 0 10px;font-size:13px;color:#555;">Stripe refund of <strong>€ ${refundAmount}</strong> was issued automatically.</p>`
    : `<p style="margin:0 0 10px;font-size:13px;color:#888;">No automatic refund issued.</p>`;
  const content = `
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Order <strong>${orderId}</strong> has been cancelled.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:16px;">
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;width:140px;">Customer</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${firstName} ${lastName} &lt;<a href="mailto:${email}" style="color:#263d33;">${email}</a>&gt;</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;">Item</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">${itemTitle} — ${variant}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:8px 12px;font-size:13px;color:#888;">Amount</td><td style="padding:8px 12px;font-size:14px;color:#1a1a1a;">€ ${price}</td></tr>
    </table>
    ${refundNote}`;
  return buildEmailWrapper({ colour: '#8b2e2e', eyebrow: 'Order Cancelled', heading: `${firstName} ${lastName} — order cancelled`, content, closing: null, sigHtml });
}

// ── Refund notification email ─────────────────────────────────────────────────

function buildRefundCustomer({ firstName, itemTitle, variant, price, orderId, refundAmount, sigHtml }) {
  const content = `
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.7;">Dear ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">A refund has been issued for your order. Here are the details:</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e8e4dd;margin-bottom:20px;">
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;width:140px;">Order number</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;font-weight:600;">${orderId}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#888;">Item</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">${itemTitle} — ${variant}</td></tr>
      <tr style="background:#f7f5f0;"><td style="padding:10px 14px;font-size:13px;color:#888;">Refund amount</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;font-weight:600;">€ ${refundAmount}</td></tr>
      <tr><td style="padding:10px 14px;font-size:13px;color:#888;">Original charge</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;">€ ${price}</td></tr>
    </table>
    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.7;">Refunds typically appear on your statement within 5–10 business days. Questions? Reply to this email.</p>`;
  return buildEmailWrapper({ colour: '#263d33', eyebrow: 'Refund Issued', heading: `Refund of € ${refundAmount} for ${itemTitle}`, content, closing: null, sigHtml });
}

// ── Send email ────────────────────────────────────────────────────────────────

async function sendEmail(apiKey, { from, to, replyTo, subject, html }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], reply_to: replyTo, subject, html }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

// ── Main handler ──────────────────────────────────────────────────────────────

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

  const body   = req.body || {};
  const action = (typeof body.action === 'string' ? body.action : '').trim();

  const VALID_ACTIONS = ['resend', 'cancel', 'refund', 'stripe-balance', 'stripe-payout'];
  if (!VALID_ACTIONS.includes(action)) { respond(res, 400, { error: 'Invalid action' }); return; }

  // ── STRIPE BALANCE ───────────────────────────────────────────────────────────
  if (action === 'stripe-balance') {
    if (!STRIPE_KEY) { respond(res, 500, { error: 'STRIPE_SECRET_KEY not set' }); return; }
    try {
      const bal = await getStripeBalance(STRIPE_KEY);
      respond(res, 200, { available: bal.available, pending: bal.pending, availableRaw: bal.available });
    } catch(e) { respond(res, 500, { error: e.message }); }
    return;
  }

  // ── STRIPE PAYOUT ────────────────────────────────────────────────────────────
  if (action === 'stripe-payout') {
    if (!STRIPE_KEY) { respond(res, 500, { error: 'STRIPE_SECRET_KEY not set' }); return; }
    const requestedEur = body.amount ? parseFloat(body.amount) : null;
    if (requestedEur !== null && (isNaN(requestedEur) || requestedEur <= 0)) {
      respond(res, 400, { error: 'Invalid payout amount' }); return;
    }
    const amountCents = requestedEur ? Math.round(requestedEur * 100) : null;
    try {
      const payout = await initiateStripePayout(STRIPE_KEY, amountCents);
      respond(res, 200, { success: true, payoutId: payout.id, amount: (payout.amount / 100).toFixed(2) });
    } catch(e) { respond(res, 500, { error: e.message }); }
    return;
  }

  if (!RESEND_KEY) { respond(res, 500, { error: 'RESEND_API_KEY not set' }); return; }
  if (!SUP_URL || !SUP_KEY) { respond(res, 500, { error: 'Supabase env vars not set' }); return; }

  const orderId = (typeof body.orderId === 'string' ? body.orderId : '').replace(/[^\w\-]/g, '').slice(0, 50);
  if (!orderId) { respond(res, 400, { error: 'orderId is required' }); return; }

  const order = await getOrder(SUP_URL, SUP_KEY, orderId);
  if (!order) { respond(res, 404, { error: `Order "${orderId}" not found` }); return; }

  const sc      = await getSiteContent(SUP_URL, SUP_KEY);
  const sigHtml = buildSignature(sc);

  const firstName = order.first_name     || 'Customer';
  const lastName  = order.last_name      || '';
  const email     = order.email          || '';
  const itemTitle = order.item_title     || 'your order';
  const variant   = order.variant        || '';
  const price     = order.price != null  ? parseFloat(order.price).toFixed(2) : '0.00';
  const orderType = order.order_type     || 'purchase';
  const pm        = order.payment_method || 'card';

  // ── RESEND ──────────────────────────────────────────────────────────────────
  if (action === 'resend') {
    if (order.status === 'cancelled') {
      respond(res, 400, { error: 'Cannot resend confirmation for a cancelled order.' });
      return;
    }
    const html = buildConfirmationEmail({ firstName, itemTitle, variant, price, orderId: order.id, orderType, paymentMethod: pm, sigHtml });
    try {
      await sendEmail(RESEND_KEY, {
        from:    `Phelim Ekwebe <${SENDER}>`,
        to:      email,
        replyTo: NOTIFY,
        subject: `Order confirmation (resent): ${itemTitle} — ${order.id}`,
        html,
      });
      respond(res, 200, { success: true });
    } catch(e) {
      respond(res, 500, { error: 'Email send failed: ' + e.message });
    }
    return;
  }

  // ── CANCEL ──────────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    if (order.status === 'cancelled') {
      respond(res, 400, { error: 'Order is already cancelled.' });
      return;
    }

    // body.refund=true triggers a refund; body.refundAmount (EUR) sets partial amount
    const issueRefund    = body.refund === true && pm === 'card' && order.payment_intent_id && STRIPE_KEY;
    const requestedEur   = body.refundAmount ? parseFloat(body.refundAmount) : null;
    let   refundIssued   = false;
    let   refundAmount   = requestedEur ? requestedEur.toFixed(2) : price;

    if (issueRefund) {
      try {
        const amountCents = requestedEur ? Math.round(requestedEur * 100) : Math.round(parseFloat(price) * 100);
        await issueStripeRefund(STRIPE_KEY, order.payment_intent_id, amountCents);
        refundIssued = true;
      } catch(e) {
        respond(res, 500, { error: 'Stripe refund failed: ' + e.message + '. Order not cancelled.' });
        return;
      }
    }

    // Update DB status
    try {
      const cancelPatch = { status: 'cancelled', refund_issued: refundIssued };
      if (refundIssued) cancelPatch.refund_amount = parseFloat(refundAmount);
      await patchOrder(SUP_URL, SUP_KEY, orderId, cancelPatch);
    } catch(e) {
      respond(res, 500, { error: 'DB update failed: ' + e.message });
      return;
    }

    // Send emails (best effort)
    const errors = [];
    try {
      await sendEmail(RESEND_KEY, {
        from:    `Phelim Ekwebe <${SENDER}>`,
        to:      email,
        replyTo: NOTIFY,
        subject: `Your order ${order.id} has been cancelled`,
        html:    buildCancellationCustomer({ firstName, itemTitle, variant, price, orderId: order.id, refundIssued, refundAmount, sigHtml }),
      });
    } catch(e) { errors.push('customer: ' + e.message); }

    try {
      await sendEmail(RESEND_KEY, {
        from:    `phelim.me <${SENDER}>`,
        to:      NOTIFY,
        replyTo: email,
        subject: `Order cancelled: ${itemTitle} — ${firstName} ${lastName} [${order.id}]`,
        html:    buildCancellationAdmin({ firstName, lastName, email, itemTitle, variant, price, orderId: order.id, refundIssued, refundAmount, sigHtml }),
      });
    } catch(e) { errors.push('admin: ' + e.message); }

    respond(res, 200, { success: true, refundIssued, emailErrors: errors.length ? errors : undefined });
    return;
  }

  // ── REFUND (standalone, without cancelling) ──────────────────────────────────
  if (action === 'refund') {
    if (pm !== 'card' || !order.payment_intent_id) {
      respond(res, 400, { error: 'Refund only available for card orders with a payment intent.' });
      return;
    }
    if (!STRIPE_KEY) { respond(res, 500, { error: 'STRIPE_SECRET_KEY not set' }); return; }

    // Optional partial amount in body.amount (euros), else full refund
    const requestedAmount = body.amount ? parseFloat(body.amount) : null;
    if (requestedAmount !== null && (isNaN(requestedAmount) || requestedAmount <= 0)) {
      respond(res, 400, { error: 'Invalid refund amount' });
      return;
    }
    const refundAmount  = requestedAmount ? requestedAmount.toFixed(2) : price;
    const amountCents   = requestedAmount ? Math.round(requestedAmount * 100) : Math.round(parseFloat(price) * 100);

    try {
      await issueStripeRefund(STRIPE_KEY, order.payment_intent_id, amountCents);
    } catch(e) {
      respond(res, 500, { error: 'Stripe refund failed: ' + e.message });
      return;
    }

    // Record refund in DB
    try { await patchOrder(SUP_URL, SUP_KEY, orderId, { refund_issued: true, refund_amount: parseFloat(refundAmount) }); } catch(_) {}

    // Notify customer
    try {
      await sendEmail(RESEND_KEY, {
        from:    `Phelim Ekwebe <${SENDER}>`,
        to:      email,
        replyTo: NOTIFY,
        subject: `Refund issued for order ${order.id}`,
        html:    buildRefundCustomer({ firstName, itemTitle, variant, price, orderId: order.id, refundAmount, sigHtml }),
      });
    } catch(_) {}

    respond(res, 200, { success: true, refundAmount });
    return;
  }
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
