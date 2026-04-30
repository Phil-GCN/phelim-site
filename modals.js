/* phelim.me — modals, checkout, forms, countdown */

// ─── MODAL DOM INJECTION ───
// Both modal overlays are created here so they don't need to be duplicated
// across every page's HTML. The script runs at bottom-of-body, so document.body exists.
(function injectModals() {
  if (document.getElementById('modal')) return; // already present (shouldn't happen)
  const frag = document.createDocumentFragment();

  // ── General modal ──
  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'modal';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.setAttribute('aria-labelledby', 'm-title');
  m.onclick = closeModalOuter;
  m.innerHTML = `
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal()" aria-label="Close dialog">×</button>
    <div class="modal-eyebrow" id="m-eyebrow">Get in touch</div>
    <div class="modal-title" id="m-title">Work With Phelim</div>
    <div id="m-form-body"></div>
  </div>`;
  frag.appendChild(m);

  // ── Checkout modal ──
  const c = document.createElement('div');
  c.className = 'modal-overlay';
  c.id = 'checkout-modal';
  c.setAttribute('role', 'dialog');
  c.setAttribute('aria-modal', 'true');
  c.setAttribute('aria-labelledby', 'co-title');
  c.onclick = closeCheckoutOuter;
  c.innerHTML = `
  <div class="checkout-box">
    <div class="checkout-head">
      <button class="checkout-close" onclick="closeCheckout()" aria-label="Close checkout">×</button>
      <div class="checkout-eyebrow-lbl" id="co-eyebrow">Pre-order</div>
      <div class="checkout-title" id="co-title">Built to Last</div>
      <div class="checkout-price" id="co-price">€ 24.99</div>
    </div>
    <div class="checkout-body">
      <div class="checkout-item-row">
        <div class="checkout-cover" id="co-cover" style="background:var(--forest);"><span id="co-cover-text">Built to Last</span></div>
        <div class="checkout-item-info">
          <div class="checkout-item-name" id="co-item-name">Built to Last</div>
          <div class="checkout-item-type" id="co-item-type">Pre-order · Hardcover</div>
        </div>
        <div class="checkout-item-price" id="co-item-price">€ 24.99</div>
      </div>
      <div id="checkout-form-wrap">
        <div class="checkout-note"><p id="co-note-text"><strong>Pre-order guarantee:</strong> You will be charged now and your item is delivered as soon as it is available. Cancel anytime before fulfilment for a full refund.</p></div>
        <div class="checkout-divider">Your details</div>
        <form class="form" id="checkout-form" onsubmit="handleCheckout(event)">
          <div class="frow">
            <div class="fg"><label class="flabel">First name</label><input class="finput" type="text" placeholder="First name" required></div>
            <div class="fg"><label class="flabel">Last name</label><input class="finput" type="text" placeholder="Last name" required></div>
          </div>
          <div class="fg"><label class="flabel">Email</label><input class="finput" type="email" placeholder="your@email.com" required></div>
          <div class="fg"><label class="flabel">Format / Edition</label>
            <select class="fselect" id="co-format" onchange="updateCoPrice()"></select>
          </div>
          <div class="checkout-divider">Payment</div>
          <div class="checkout-methods">
            <div class="pay-method selected" data-type="card" onclick="selectPayMethod(this,'card')">
              <div class="pay-method-icon">💳</div><div class="pay-method-label">Card</div>
            </div>
            <div class="pay-method" data-type="bank" onclick="selectPayMethod(this,'bank')">
              <div class="pay-method-icon">🏦</div><div class="pay-method-label">Bank transfer</div>
            </div>
          </div>
          <div id="card-fields">
            <div id="stripe-card-element" style="padding:11px 14px;border:1px solid var(--ink12);background:#fff;border-radius:2px;min-height:42px;"></div>
            <div id="stripe-card-error" style="color:#c0392b;font-size:.78rem;margin-top:5px;min-height:16px;"></div>
          </div>
          <div id="bank-fields" style="display:none;background:var(--forest-faint);border:1px solid rgba(38,61,51,.15);padding:15px 17px;margin-bottom:4px;">
            <p style="font-size:.82rem;color:var(--ink60);margin-bottom:7px;">Bank transfer details will be sent to your email once you place the order.</p>
            <p style="font-size:.78rem;color:var(--ink30);margin:0;font-style:italic;">Orders are held for 5 business days pending payment.</p>
          </div>
          <button type="submit" class="btn btn-dark" style="width:100%;justify-content:center;padding:13px;margin-top:14px;">Complete Pre-order</button>
          <div class="stripe-badge">🔒 Payments processed securely via Stripe</div>
        </form>
      </div>
      <div id="checkout-success" style="display:none;padding:36px 24px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:14px;color:var(--forest);">✓</div>
        <div id="co-success-title" style="font-family:Georgia,serif;font-size:1.35rem;color:#263d33;margin-bottom:10px;"></div>
        <div id="co-success-detail" style="font-size:.88rem;color:#555;line-height:1.7;margin-bottom:8px;"></div>
        <div id="co-success-order" style="font-size:.76rem;color:#888;margin-bottom:24px;"></div>
        <button onclick="closeCheckout()" style="font-size:.8rem;color:#263d33;background:none;border:1px solid #263d33;padding:9px 22px;cursor:pointer;">Close</button>
      </div>
    </div>
  </div>`;
  frag.appendChild(c);

  document.body.appendChild(frag);

  // Escape key closes whichever modal is open
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('modal')?.classList.contains('open')) closeModal();
    if (document.getElementById('checkout-modal')?.classList.contains('open')) closeCheckout();
  });
})();

// ─── CONTACT TAB SWITCHING (shared utility) ───
function switchEnqTab(id) {
  document.querySelectorAll('.enq-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.enq-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('enq-btn-' + id)?.classList.add('active');
  document.getElementById('enq-' + id)?.classList.add('active');
}

// ═══ MODAL — forms identical to Contact page ═══
const MODAL_FORMS={
  speaking:{
    eyebrow:'Speaking & Events',title:'Book a Talk',
    html:`<div class="form"><div class="frow"><div class="fg"><label class="flabel">Name</label><input class="finput" type="text" placeholder="Full name"></div><div class="fg"><label class="flabel">Email</label><input class="finput" type="email" placeholder="you@org.com"></div></div><div class="fg"><label class="flabel">Organisation</label><input class="finput" type="text" placeholder="Company or institution"></div><div class="fg"><label class="flabel">Event format</label><select class="fselect"><option>Keynote</option><option>Workshop</option><option>Panel / Fireside</option><option>Virtual</option><option>Other</option></select></div><div class="frow"><div class="fg"><label class="flabel">Expected audience</label><input class="finput" type="text" placeholder="e.g. 200 people"></div><div class="fg"><label class="flabel">Approximate date</label><input class="finput" type="text" placeholder="Month / Year"></div></div><div class="fg"><label class="flabel">Tell me about the event</label><textarea class="ftextarea" placeholder="Theme, audience, what you hope they walk away with..."></textarea></div><button type="button" class="btn btn-dark" style="width:100%;justify-content:center;" onclick="handleModalSubmit(this)">Send Booking Enquiry</button></div>`
  },
  podcast:{
    eyebrow:'Podcast Enquiry',title:'Collaborate with Future Foundations',
    html:`<div class="form"><div class="frow"><div class="fg"><label class="flabel">Name</label><input class="finput" type="text" placeholder="Full name"></div><div class="fg"><label class="flabel">Email</label><input class="finput" type="email" placeholder="your@email.com"></div></div><div class="fg"><label class="flabel">Type of collaboration</label><select class="fselect"><option>I want to invite Phelim onto my show</option><option>I want to be a guest on Future Foundations</option><option>Cross-show collaboration</option><option>Other podcast enquiry</option></select></div><div class="fg"><label class="flabel">Your show / background</label><input class="finput" type="text" placeholder="Show name, audience, platform..."></div><div class="fg"><label class="flabel">What makes your story worth telling?</label><textarea class="ftextarea" placeholder="Tell me what you've built, experienced, or overcome..."></textarea></div><button type="button" class="btn btn-dark" style="width:100%;justify-content:center;" onclick="handleModalSubmit(this)">Submit Application</button></div>`
  },
  writing:{
    eyebrow:'Writing & Media',title:'Pitch a Collaboration',
    html:`<div class="form"><div class="frow"><div class="fg"><label class="flabel">Name</label><input class="finput" type="text" placeholder="Full name"></div><div class="fg"><label class="flabel">Email</label><input class="finput" type="email" placeholder="your@email.com"></div></div><div class="fg"><label class="flabel">Publication or outlet</label><input class="finput" type="text" placeholder="Where would this appear?"></div><div class="fg"><label class="flabel">Type of collaboration</label><select class="fselect"><option>Interview / Feature</option><option>Guest essay</option><option>Book / press enquiry</option><option>Writing collaboration</option><option>Other</option></select></div><div class="fg"><label class="flabel">Tell me more</label><textarea class="ftextarea" placeholder="Concept, timeline, and audience?"></textarea></div><button type="button" class="btn btn-dark" style="width:100%;justify-content:center;" onclick="handleModalSubmit(this)">Send Enquiry</button></div>`
  },
  partnership:{
    eyebrow:'Partnership',title:'Enquire About Partnership',
    html:`<div class="form"><div class="frow"><div class="fg"><label class="flabel">Name</label><input class="finput" type="text" placeholder="Full name"></div><div class="fg"><label class="flabel">Email</label><input class="finput" type="email" placeholder="your@company.com"></div></div><div class="fg"><label class="flabel">Company / Organisation</label><input class="finput" type="text" placeholder="Who you represent"></div><div class="fg"><label class="flabel">Partnership type</label><select class="fselect"><option>Brand partnership / sponsorship</option><option>Product endorsement</option><option>Co-created resource</option><option>Event partnership</option><option>Other</option></select></div><div class="fg"><label class="flabel">Describe the opportunity</label><textarea class="ftextarea" placeholder="What are you proposing, and why does it align with Future Foundations?"></textarea></div><button type="button" class="btn btn-dark" style="width:100%;justify-content:center;" onclick="handleModalSubmit(this)">Submit Proposal</button></div>`
  },
  general:{
    eyebrow:'Get in touch',title:'Work With Phelim',
    html:`<div class="form"><div class="frow"><div class="fg"><label class="flabel">Name</label><input class="finput" type="text" placeholder="Full name"></div><div class="fg"><label class="flabel">Email</label><input class="finput" type="email" placeholder="your@email.com"></div></div><div class="fg"><label class="flabel">Message</label><textarea class="ftextarea" style="min-height:110px;" placeholder="Tell me what's on your mind..."></textarea></div><button type="button" class="btn btn-dark" style="width:100%;justify-content:center;" onclick="handleModalSubmit(this)">Send Message</button></div>`
  },
  waitlist:{
    eyebrow:'Launch Notification',title:'Be the first to know',
    html:`<div class="form"><p id="waitlist-desc" style="font-size:.88rem;color:#555;margin:0 0 18px;line-height:1.65;">Sign up below and you'll be notified as soon as this launches — along with any early-access offers.</p><div class="frow"><div class="fg"><label class="flabel">Name</label><input class="finput" type="text" placeholder="Full name"></div><div class="fg"><label class="flabel">Email</label><input class="finput" type="email" placeholder="your@email.com"></div></div><button type="button" class="btn btn-dark" style="width:100%;justify-content:center;margin-top:6px;" onclick="handleModalSubmit(this)">Notify Me at Launch</button></div>`
  }
};
// Encapsulated modal state — avoids polluting window with multiple vars
window._modal = { type: 'general', itemKey: null, itemTitle: null };

// openModal(ctx, itemKey, itemTitle)
// itemKey/itemTitle only used for waitlist to identify which item
function openModal(ctx, itemKey, itemTitle){
  const c=MODAL_FORMS[ctx]||MODAL_FORMS.general;
  window._modal.type      = ctx || 'general';
  window._modal.itemKey   = itemKey   || null;
  window._modal.itemTitle = itemTitle || null;
  document.getElementById('m-eyebrow').textContent=c.eyebrow;
  document.getElementById('m-title').textContent=c.title;
  document.getElementById('m-form-body').innerHTML=c.html;
  // Personalise waitlist description with item title
  if (ctx === 'waitlist' && itemTitle) {
    const desc = document.getElementById('waitlist-desc');
    if (desc) desc.textContent = `Sign up to be notified when "${itemTitle}" launches — along with any early-access offers.`;
  }
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow='hidden';
  // Move focus into modal for keyboard/screen-reader users
  setTimeout(()=>{const f=document.querySelector('#m-form-body input,#m-form-body textarea,#m-form-body select');if(f)f.focus();},50);
}
function closeModal(){
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow='';
  // Reset any button left in disabled/loading state if user closes mid-submit
  const btn=document.querySelector('#modal button[disabled]');
  if(btn){btn.disabled=false;btn.style.background='';if(btn.dataset.orig)btn.textContent=btn.dataset.orig;}
}
function closeModalOuter(e){if(e.target===document.getElementById('modal'))closeModal();}
function handleModalSubmit(btn){
  const formDiv = btn.closest('.form');
  if (!formDiv) return;

  // Collect name (first text input) and email
  const nameIn  = formDiv.querySelector('input[type="text"]');
  const emailIn = formDiv.querySelector('input[type="email"]');
  const name    = nameIn?.value?.trim()  || '';
  const email   = emailIn?.value?.trim() || '';

  // Validate required fields
  let valid = true;
  [nameIn, emailIn].forEach(el => { if (el) el.style.borderColor = ''; });
  if (!name)  { if (nameIn)  { nameIn.style.borderColor  = '#c0392b'; nameIn.focus();  } valid = false; }
  if (!email) { if (emailIn) { emailIn.style.borderColor = '#c0392b'; if (name) emailIn.focus(); } valid = false; }
  if (!valid) return;

  // Collect all field values for the notification
  const fields = {};
  formDiv.querySelectorAll('input, select, textarea').forEach(inp => {
    const key = inp.placeholder || inp.type || 'field';
    const val = inp.tagName === 'SELECT' ? (inp.options[inp.selectedIndex]?.text || '') : (inp.value || '');
    if (val.trim() && key !== 'text' && key !== 'email') fields[key] = val.trim();
  });

  const orig    = btn.textContent;
  const mType   = window._modal.type      || 'general';
  const itemKey = window._modal.itemKey   || null;
  const itemTitle = window._modal.itemTitle || null;

  btn.dataset.orig = orig;
  btn.textContent = 'Sending…'; btn.disabled = true;

  // For waitlist, check dedup server-side; await response before showing confirm
  if (mType === 'waitlist') {
    fetch('/api/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, type: 'waitlist', fields, item_key: itemKey, item_title: itemTitle }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.duplicate) {
        btn.textContent = orig; btn.disabled = false;
        const formDiv2 = btn.closest('.form');
        let msg = formDiv2.querySelector('.waitlist-dup-msg');
        if (!msg) { msg = document.createElement('p'); msg.className = 'waitlist-dup-msg'; msg.style.cssText = 'font-size:.83rem;color:#c0392b;margin:10px 0 0;text-align:center;'; formDiv2.appendChild(msg); }
        msg.textContent = `${email} is already on the waitlist${itemTitle ? ' for ' + itemTitle : ''}. We'll notify you when it launches.`;
      } else {
        btn.textContent = 'You\'re on the list ✓'; btn.style.background = 'var(--forest)';
        setTimeout(() => { closeModal(); btn.textContent = orig; btn.style.background = ''; btn.disabled = false; }, 2200);
      }
    })
    .catch(() => {
      // Show success anyway so user isn't left hanging
      btn.textContent = 'You\'re on the list ✓'; btn.style.background = 'var(--forest)';
      setTimeout(() => { closeModal(); btn.textContent = orig; btn.style.background = ''; btn.disabled = false; }, 2200);
    });
    return;
  }

  // Non-waitlist: fire and forget
  fetch('/api/submit-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, type: mType, fields }),
  }).catch(() => {});

  btn.textContent = 'Sent ✓'; btn.style.background = 'var(--forest)';
  setTimeout(() => { closeModal(); btn.textContent = orig; btn.style.background = ''; btn.disabled = false; }, 2200);
}

// ═══ CHECKOUT ═══
// CHECKOUT_CATALOG is the client-side item registry.
// Keep variants in sync with the CATALOG in create-payment-intent.js and create-order.js.
// To add a new sellable item: add an entry here AND in both server functions.
window.CHECKOUT_CATALOG = {
  btl: {
    title:    'Built to Last',
    subtitle: 'The Modern Guide to Wealth, Freedom, and Legacy',
    color:    'var(--forest)',
    type:     'book',
    variants: { Hardcover: '24.99', Paperback: '14.99', eBook: '9.99' },
  },
  bs: {
    title:    'Beyond Survival',
    subtitle: "The Immigrant's Guide to Generational Wealth",
    color:    '#1a2d24',
    type:     'book',
    variants: { Hardcover: '22.99', Paperback: '12.99', eBook: '8.99' },
  },
  // Add future sellable items here, e.g. toolkits, courses, etc.
};
// Backward-compat alias — existing page scripts call openCheckout() with 'btl'/'bs'
window.BOOKS_DATA = window.CHECKOUT_CATALOG;

// ── Stripe state ──
let _stripe = null, _stripeCard = null, _currentItemId = null;

function openCheckout(id) {
  const item = window.CHECKOUT_CATALOG[id] || window.CHECKOUT_CATALOG.btl;
  _currentItemId = id;

  const isLive    = item.mode === 'live';
  const stock     = item.stockStatus || (isLive ? 'in_stock' : 'preorder');
  const eyebrow   = isLive && stock === 'in_stock'     ? 'Buy Now'
                  : isLive && stock === 'out_of_stock'  ? 'Out of Stock — Join Waitlist'
                  : 'Pre-order';
  const submitTxt = isLive && stock === 'in_stock'     ? 'Complete Purchase'
                  : isLive && stock === 'out_of_stock'  ? 'Join Waitlist'
                  : 'Complete Pre-order';

  // Populate header
  document.getElementById('co-title').textContent            = item.title;
  document.getElementById('co-eyebrow').textContent          = eyebrow;
  document.getElementById('co-cover').style.background       = item.color || 'var(--forest)';
  document.getElementById('co-cover-text').textContent       = item.title;
  document.getElementById('co-item-name').textContent        = item.title;

  // Populate variant select dynamically from catalog entry
  const sel = document.getElementById('co-format');
  if (sel) {
    sel.innerHTML = Object.entries(item.variants)
      .map(([name, price]) => `<option value="${name}">${name} — € ${price}</option>`)
      .join('');
    sel.selectedIndex = 0;
  }
  updateCoPrice();

  // Update checkout note based on item type / mode
  const noteEl = document.getElementById('co-note-text');
  if (noteEl) {
    if (isLive && stock === 'in_stock') {
      noteEl.innerHTML = '<strong>Secure purchase:</strong> Your order is processed immediately after payment is confirmed.';
    } else {
      const deliverable = item.type === 'book' ? 'copy ships' : 'item is delivered';
      noteEl.innerHTML = `<strong>Pre-order guarantee:</strong> You will be charged now and your ${deliverable} as soon as it is available. Cancel anytime before fulfilment for a full refund.`;
    }
  }

  // Update submit button
  const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = submitTxt;

  // Reset to card payment method
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
  const cardMethod = document.querySelector('.pay-method[data-type="card"]');
  if (cardMethod) cardMethod.classList.add('selected');
  const cf = document.getElementById('card-fields');
  const bf = document.getElementById('bank-fields');
  if (cf) cf.style.display = 'block';
  if (bf) bf.style.display = 'none';

  // Clear previous Stripe card input and errors
  if (_stripeCard) _stripeCard.clear();
  const errEl = document.getElementById('stripe-card-error');
  if (errEl) errEl.textContent = '';

  // Restore form view (hide success screen if previously shown)
  const wrap    = document.getElementById('checkout-form-wrap');
  const success = document.getElementById('checkout-success');
  if (wrap)    wrap.style.display    = '';
  if (success) success.style.display = 'none';

  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Initialise Stripe lazily (idempotent — only runs once per page load)
  _initStripe();
}

async function _initStripe() {
  if (_stripe) return; // already initialised
  try {
    // Lazy-load Stripe.js only when checkout is first opened
    if (!window.Stripe) {
      await new Promise((resolve, reject) => {
        if (document.querySelector('script[src*="js.stripe.com"]')) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://js.stripe.com/v3/';
        s.onload  = resolve;
        s.onerror = () => reject(new Error('Stripe.js failed to load'));
        document.head.appendChild(s);
      });
    }
    // Fetch publishable key from server (never hardcoded in source)
    const cfgRes = await fetch('/api/stripe-config');
    if (!cfgRes.ok) throw new Error('Stripe config unavailable');
    const { publishableKey } = await cfgRes.json();
    if (!publishableKey) throw new Error('No publishable key returned');

    _stripe = window.Stripe(publishableKey);
    const elements = _stripe.elements();
    _stripeCard = elements.create('card', {
      style: {
        base: {
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize:   '15px',
          color:      '#0d0d0b',
          '::placeholder': { color: '#aaa' },
        },
        invalid: { color: '#c0392b' },
      },
    });
    _stripeCard.mount('#stripe-card-element');
    _stripeCard.on('change', ev => {
      const errEl = document.getElementById('stripe-card-error');
      if (errEl) errEl.textContent = ev.error ? ev.error.message : '';
    });
  } catch(err) {
    console.warn('Stripe init failed:', err.message);
    const cardFields = document.getElementById('card-fields');
    if (cardFields) {
      cardFields.innerHTML = '<p style="font-size:.82rem;color:#c0392b;padding:8px 0;">Card payment is temporarily unavailable. Please use bank transfer or contact us directly.</p>';
    }
  }
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.remove('open');
  document.body.style.overflow = '';
  // Reset any button left in loading state
  const btn = document.querySelector('#checkout-form button[type="submit"][disabled]');
  if (btn) { btn.disabled = false; if (btn.dataset.orig) btn.textContent = btn.dataset.orig; }
}
function closeCheckoutOuter(e) { if (e.target === document.getElementById('checkout-modal')) closeCheckout(); }

function selectPayMethod(el, type) {
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('card-fields').style.display = type === 'card' ? 'block' : 'none';
  document.getElementById('bank-fields').style.display = type === 'bank' ? 'block' : 'none';
}

function updateCoPrice() {
  const sel  = document.getElementById('co-format');
  if (!sel) return;
  const variant = sel.value;
  const item    = window.CHECKOUT_CATALOG[_currentItemId];
  const price   = item?.variants[variant] || '0';
  const isLive  = item?.mode === 'live';
  document.getElementById('co-item-price').textContent = '€ ' + price;
  document.getElementById('co-price').textContent      = '€ ' + price;
  document.getElementById('co-item-type').textContent  = (isLive ? '' : 'Pre-order · ') + variant;
}

async function handleCheckout(e) {
  e.preventDefault();
  const form    = e.target;
  const btn     = form.querySelector('button[type="submit"]');
  const origTxt = btn.textContent;
  btn.dataset.orig = origTxt;
  btn.textContent  = 'Processing…';
  btn.disabled     = true;

  // Collect form fields
  const inputs    = form.querySelectorAll('.finput');
  const firstName = inputs[0]?.value?.trim() || '';
  const lastName  = inputs[1]?.value?.trim() || '';
  const email     = inputs[2]?.value?.trim() || '';
  const sel       = document.getElementById('co-format');
  const variant   = sel ? sel.value : (Object.keys(window.CHECKOUT_CATALOG[_currentItemId]?.variants || {})[0] || 'Standard');
  const payMethod = document.querySelector('.pay-method.selected')?.dataset?.type || 'card';

  const itemId    = _currentItemId || '';
  const item      = window.CHECKOUT_CATALOG[itemId] || {};
  const itemTitle = item.title || document.getElementById('co-title')?.textContent || '';
  const orderType = item.mode === 'live' ? 'purchase' : 'preorder';

  if (!firstName || !email) {
    btn.textContent = origTxt; btn.disabled = false;
    alert('Please fill in your first name and email address.');
    return;
  }

  try {
    if (payMethod === 'card') {
      // ── Card payment ──────────────────────────────────────────────────────
      if (!_stripe || !_stripeCard) {
        throw new Error('Payment system not ready — please use bank transfer or try again shortly.');
      }

      // 1. Create PaymentIntent server-side (price validated against catalog)
      const piRes  = await fetch('/api/create-payment-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ itemId, variant }),
      });
      const piData = await piRes.json();
      if (!piRes.ok) throw new Error(piData.error || 'Payment setup failed');

      // 2. Confirm card payment with Stripe (stays in-modal — no redirect)
      const { paymentIntent, error } = await _stripe.confirmCardPayment(piData.clientSecret, {
        payment_method: {
          card:             _stripeCard,
          billing_details:  { name: `${firstName} ${lastName}`.trim(), email },
        },
      });
      if (error) {
        const errEl = document.getElementById('stripe-card-error');
        if (errEl) errEl.textContent = error.message;
        btn.textContent = origTxt; btn.disabled = false;
        return; // user stays on form to correct card details
      }
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment did not complete. Please try again.');
      }

      // 3. Record order (server re-verifies the PaymentIntent before saving)
      const orderRes  = await fetch('/api/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ firstName, lastName, email, itemId, itemTitle, variant, paymentMethod: 'card', orderType, paymentIntentId: paymentIntent.id }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Order could not be saved');

      _showCheckoutSuccess(firstName, itemTitle, orderData.orderId, email, orderType);

    } else {
      // ── Bank transfer ─────────────────────────────────────────────────────
      const orderRes  = await fetch('/api/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ firstName, lastName, email, itemId, itemTitle, variant, paymentMethod: 'bank', orderType }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Order failed');

      _showCheckoutSuccess(firstName, itemTitle, orderData.orderId, email, orderType);
    }
  } catch(err) {
    console.error('Checkout error:', err.message);
    btn.textContent = origTxt; btn.disabled = false;
    // Show error in form — do not pretend success
    const errEl = document.getElementById('stripe-card-error');
    if (errEl) {
      errEl.textContent = err.message || 'Something went wrong. Please try again or contact us.';
      errEl.style.display = 'block';
    } else {
      alert(err.message || 'Something went wrong. Please try again or contact us directly.');
    }
  }
}

function _showCheckoutSuccess(firstName, itemTitle, orderId, email, orderType) {
  document.getElementById('co-success-title').textContent  = `Thank you, ${firstName}.`;
  document.getElementById('co-success-detail').innerHTML   = `Your ${orderType === 'purchase' ? 'order' : 'pre-order'} for <strong>${itemTitle}</strong> has been confirmed.`;
  document.getElementById('co-success-order').innerHTML    = `Order number: <strong>${orderId}</strong><br>A confirmation has been sent to <strong>${email}</strong>.`;

  const wrap    = document.getElementById('checkout-form-wrap');
  const success = document.getElementById('checkout-success');
  if (wrap)    wrap.style.display    = 'none';
  if (success) success.style.display = 'block';

  // Auto-close after 6 seconds
  setTimeout(() => closeCheckout(), 6000);
}

// ═══ FORMS ═══
async function handleSubmit(e, type) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  if (!btn) return false;
  const orig = btn.textContent;
  btn.textContent = 'Sending…';
  btn.disabled = true;

  const data   = new FormData(form);
  const name   = data.get('name')  || '';
  const email  = data.get('email') || '';
  const fields = {};
  data.forEach((v, k) => { fields[k] = v; });

  let templateOverride = null;
  try {
    const saved = JSON.parse(localStorage.getItem('portal-email-templates') || '{}');
    if (saved[type]) templateOverride = saved[type];
  } catch(_) {}

  // Single call to our custom function — saves to DB, sends both emails
  try {
    const res  = await fetch('/api/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, type: type || 'general', fields, templateOverride }),
    });
    const json = await res.json();
    if (!res.ok) console.warn('submit-form error:', json.error);
  } catch(err) {
    console.warn('submit-form failed:', err.message);
  }

  // Show inline branded confirmation (never redirect)
  form.reset();
  const formName  = form.name || type;
  const confirmId = 'form-confirm-' + formName;
  let confirm = document.getElementById(confirmId);
  if (!confirm) {
    confirm = document.createElement('div');
    confirm.id = confirmId;
    form.parentNode.insertBefore(confirm, form.nextSibling);
  }
  // Assign a stable ID to the form so we can reliably restore it
  if (!form.id) form.id = 'contact-form-' + (formName || 'unknown');
  const formId = form.id;
  confirm.style.cssText = 'padding:32px 24px;background:#f0f5f2;border:1px solid rgba(38,61,51,.18);text-align:center;';
  confirm.innerHTML = `
    <div style="font-family:Georgia,serif;font-size:1.25rem;color:#263d33;margin-bottom:10px;">Message sent.</div>
    <p style="font-size:.9rem;color:#555;margin:0 0 18px;line-height:1.65;">Thank you${name ? ', ' + name.split(' ')[0] : ''}. A confirmation has been sent to ${email || 'your email'}.</p>
    <button type="button" onclick="window._restoreContactForm('${confirmId}','${formId}')" style="font-size:.8rem;color:#263d33;background:none;border:1px solid #263d33;padding:7px 18px;cursor:pointer;">Send another message</button>`;
  form.style.display = 'none';

  btn.textContent = orig;
  btn.style.background = '';
  btn.disabled = false;
  return false;
}

// Restore contact form after "Send another message" is clicked
window._restoreContactForm = function(confirmId, formId) {
  const c = document.getElementById(confirmId);
  if (c) c.remove();
  const f = document.getElementById(formId);
  if (f) { f.style.display = ''; f.reset(); }
};

// ═══ COUNTDOWN ═══
function getLaunchDate(){
  // Reads launchDate from site content (set via portal → Site Content); falls back to hardcoded date
  const d=window.SITE_CONTENT?.launchDate||'2027-02-01';
  return new Date(d.includes('T')?d:d+'T00:00:00');
}
function updateCountdown(){
  const diff=getLaunchDate()-new Date();if(diff<=0)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v).padStart(2,'0');};
  set('cd-days',Math.floor(diff/86400000));
  set('cd-hours',Math.floor((diff%86400000)/3600000));
  set('cd-mins',Math.floor((diff%3600000)/60000));
  set('cd-secs',Math.floor((diff%60000)/1000));
}
setInterval(updateCountdown,1000);updateCountdown();
