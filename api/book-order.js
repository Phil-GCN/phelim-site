// Vercel Serverless Function: book-order
// Legacy book order handler (pre-Stripe). Kept for backward compat.
// New orders should use /api/create-order with Stripe.
// POST /api/book-order
// Requires: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

const SENDER = process.env.SENDER_EMAIL || 'hello@phelim.me';

const KNOWN_BOOKS = {
  btl: { title: 'Built to Last',   formats: { Hardcover: '24.99', Paperback: '14.99', eBook: '9.99' } },
  bs:  { title: 'Beyond Survival', formats: { Hardcover: '22.99', Paperback: '12.99', eBook: '8.99' } },
};

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
  const NOTIFY     = process.env.NOTIFY_EMAIL || 'hello@phelim.me';

  if (!RESEND_KEY) { respond(res, 500, { error: 'RESEND_API_KEY not set' }); return; }

  const body     = req.body || {};
  const sanitize = s => (typeof s === 'string' ? s.replace(/[\r\n]/g, ' ').trim().slice(0, 300) : '');
  const isEmail  = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const firstName     = sanitize(body.firstName);
  const lastName      = sanitize(body.lastName || '');
  const email         = sanitize(body.email);
  const bookId        = sanitize(body.bookId);
  const bookTitle     = sanitize(body.bookTitle);
  const format        = sanitize(body.format);
  const paymentMethod = sanitize(body.paymentMethod || 'card');
  const orderType     = sanitize(body.orderType || 'preorder');

  if (!firstName || !email || !bookTitle) { respond(res, 400, { error: 'firstName, email, bookTitle required' }); return; }
  if (!isEmail(email)) { respond(res, 400, { error: 'Invalid email address' }); return; }

  let validatedPrice = null;
  if (bookId && KNOWN_BOOKS[bookId]) {
    const normFormat  = (format || '').split(' — ')[0].trim();
    const bookFormats = KNOWN_BOOKS[bookId].formats;
    if (!bookFormats[normFormat]) { respond(res, 400, { error: `Invalid format "${normFormat}" for this book.` }); return; }
    validatedPrice = bookFormats[normFormat];
  }
  if (!['card','bank'].includes(paymentMethod || 'card')) { respond(res, 400, { error: 'Invalid payment method.' }); return; }

  const finalPrice = validatedPrice || (body.price ? String(body.price).replace(/[^0-9.]/g, '') : '0');
  const orderId    = 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  if (SUP_URL && SUP_KEY) {
    try {
      await fetch(`${SUP_URL}/rest/v1/book_orders`, {
        method: 'POST',
        headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify([{
          id: orderId, book_id: bookId || bookTitle.toLowerCase().replace(/\s+/g,'-'),
          book_title: bookTitle, format: format || 'Hardcover', price: finalPrice,
          first_name: firstName, last_name: lastName, email,
          payment_method: paymentMethod, order_type: orderType || 'preorder', status: 'pending',
          created_at: new Date().toISOString(),
        }]),
      });
    } catch(e) { console.warn('Order save failed:', e.message); }
  }

  const confirmHtml = `<p>Dear ${firstName}, your ${orderType === 'purchase' ? 'order' : 'pre-order'} for <strong>${bookTitle}</strong> (${format}) has been received. Order number: <strong>${orderId}</strong>. Amount: €${finalPrice}.</p>`;
  const notifyHtml  = `<p>New ${orderType} from ${firstName} ${lastName} &lt;${email}&gt; for ${bookTitle} (${format}). Order: ${orderId}. Payment: ${paymentMethod}. Amount: €${finalPrice}.</p>`;

  const errors = [];
  if (RESEND_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `Phelim Ekwebe <${SENDER}>`, to: [email], reply_to: NOTIFY, subject: `Order confirmed: ${bookTitle} — ${orderId}`, html: confirmHtml }),
      });
    } catch(e) { errors.push(e.message); }
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `phelim.me <${SENDER}>`, to: [NOTIFY], reply_to: email, subject: `New ${orderType}: ${bookTitle} — ${firstName} ${lastName}`, html: notifyHtml }),
      });
    } catch(e) { errors.push(e.message); }
  }

  if (errors.length === 2) { respond(res, 500, { error: errors.join('; ') }); return; }
  respond(res, 200, { success: true, orderId });
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
