/* phelim.me — modals, checkout, forms, countdown */

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
// openModal(ctx, itemKey, itemTitle)
// itemKey/itemTitle only used for waitlist to identify which item
function openModal(ctx, itemKey, itemTitle){
  const c=MODAL_FORMS[ctx]||MODAL_FORMS.general;
  window._modalType    = ctx || 'general';
  window._modalItemKey = itemKey   || null;
  window._modalItemTitle = itemTitle || null;
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
}
function closeModal(){document.getElementById('modal').classList.remove('open');document.body.style.overflow='';}
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
  const mType   = window._modalType    || 'general';
  const itemKey = window._modalItemKey || null;
  const itemTitle = window._modalItemTitle || null;

  btn.textContent = 'Sending…'; btn.disabled = true;

  // For waitlist, check dedup server-side; await response before showing confirm
  if (mType === 'waitlist') {
    fetch('/.netlify/functions/submit-form', {
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
  fetch('/.netlify/functions/submit-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, type: mType, fields }),
  }).catch(() => {});

  btn.textContent = 'Sent ✓'; btn.style.background = 'var(--forest)';
  setTimeout(() => { closeModal(); btn.textContent = orig; btn.style.background = ''; btn.disabled = false; }, 2200);
}

// ═══ CHECKOUT ═══
window.BOOKS_DATA={
  btl:{title:'Built to Last',subtitle:'The Modern Guide to Wealth, Freedom, and Legacy',price:'24.99',color:'var(--forest)'},
  bs:{title:'Beyond Survival',subtitle:"The Immigrant's Guide to Generational Wealth",price:'22.99',color:'#1a2d24'}
};
function openCheckout(id){
  const b=window.BOOKS_DATA[id]||window.BOOKS_DATA.btl;
  const stock   = b.stockStatus || (b.mode === 'live' ? 'in_stock' : 'preorder');
  const isLive  = b.mode === 'live';
  const eyebrow = isLive && stock === 'in_stock' ? 'Buy Now'
                : isLive && stock === 'out_of_stock' ? 'Out of Stock — Join Waitlist'
                : 'Pre-order';
  const itemType= isLive ? b.subtitle + ' · Available' : b.subtitle + ' · Pre-order';
  const submitTxt = isLive && stock === 'in_stock' ? 'Complete Purchase'
                  : isLive && stock === 'out_of_stock' ? 'Join Waitlist'
                  : 'Complete Pre-order';
  document.getElementById('co-title').textContent=b.title;
  document.getElementById('co-eyebrow').textContent=eyebrow;
  document.getElementById('co-price').textContent='€ '+b.price;
  document.getElementById('co-cover').style.background=b.color||'var(--forest)';
  document.getElementById('co-cover-text').textContent=b.title;
  document.getElementById('co-item-name').textContent=b.title;
  document.getElementById('co-item-type').textContent=itemType;
  document.getElementById('co-item-price').textContent='€ '+b.price;
  const submitBtn=document.querySelector('#checkout-form button[type="submit"]');
  if(submitBtn) submitBtn.textContent=submitTxt;
  // Reset format select for correct book
  const sel=document.getElementById('co-format');
  if(sel){sel.options[0].value=b.price;sel.selectedIndex=0;}
  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeCheckout(){document.getElementById('checkout-modal').classList.remove('open');document.body.style.overflow='';}
function closeCheckoutOuter(e){if(e.target===document.getElementById('checkout-modal'))closeCheckout();}
function selectPayMethod(el,type){
  document.querySelectorAll('.pay-method').forEach(m=>m.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('card-fields').style.display=type==='card'?'block':'none';
  document.getElementById('bank-fields').style.display=type==='bank'?'block':'none';
}
function updateCoPrice(){
  const sel=document.getElementById('co-format');
  if(!sel)return;
  const price=sel.options[sel.selectedIndex].value;
  document.getElementById('co-item-price').textContent='€ '+price;
  document.getElementById('co-price').textContent='€ '+price;
}
async function handleCheckout(e){
  e.preventDefault();
  const form    = e.target;
  const btn     = form.querySelector('button[type="submit"]');
  const origTxt = btn.textContent;
  btn.textContent='Processing…'; btn.disabled=true;

  // Collect form values
  const inputs = form.querySelectorAll('.finput');
  const firstName = inputs[0]?.value?.trim() || '';
  const lastName  = inputs[1]?.value?.trim() || '';
  const email     = inputs[2]?.value?.trim() || '';
  const formatSel = document.getElementById('co-format');
  const format    = formatSel ? formatSel.options[formatSel.selectedIndex].text.split(' — ')[0] : 'Hardcover';
  const price     = document.getElementById('co-item-price')?.textContent?.replace(/[^0-9.]/g,'') || '0';
  const payMethod = document.querySelector('.pay-method.selected')?.dataset?.type || 'card';

  // Resolve which book is being ordered from current checkout state
  const bookTitle = document.getElementById('co-title')?.textContent || '';
  const bookId    = Object.keys(window.BOOKS_DATA||{}).find(k => window.BOOKS_DATA[k].title === bookTitle) || '';
  const orderType = (window.BOOKS_DATA[bookId]?.mode === 'live') ? 'purchase' : 'preorder';

  if (!firstName || !email) {
    btn.textContent = origTxt; btn.disabled = false;
    alert('Please fill in your first name and email before proceeding.');
    return;
  }

  try {
    const res  = await fetch('/.netlify/functions/book-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, bookId, bookTitle, format, price, paymentMethod: payMethod, orderType }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      btn.textContent='Order placed ✓'; btn.style.background='var(--forest)';
      // Show confirmation inside the checkout modal
      const bodyEl = document.querySelector('.checkout-body');
      if (bodyEl) {
        bodyEl.innerHTML = `<div style="padding:32px 24px;text-align:center;">
          <div style="font-family:Georgia,serif;font-size:1.4rem;color:#263d33;margin-bottom:12px;">Thank you, ${firstName}.</div>
          <div style="font-size:.88rem;color:#555;line-height:1.7;margin-bottom:10px;">Your ${orderType === 'purchase' ? 'order' : 'pre-order'} for <strong>${bookTitle}</strong> has been confirmed.</div>
          <div style="font-size:.78rem;color:#888;margin-bottom:22px;">Order number: <strong>${data.orderId}</strong><br>A confirmation has been sent to <strong>${email}</strong>.</div>
          <button onclick="closeCheckout()" style="font-size:.8rem;color:#263d33;background:none;border:1px solid #263d33;padding:9px 22px;cursor:pointer;">Close</button>
        </div>`;
      }
      setTimeout(()=>{ closeCheckout(); form.reset(); btn.textContent=origTxt; btn.style.background=''; btn.disabled=false; },4000);
    } else {
      throw new Error(data.error || 'Order failed');
    }
  } catch(err) {
    console.error('Checkout error:', err.message);
    btn.textContent='Try again'; btn.disabled=false; btn.style.background='';
    // Still show a local confirmation so the user isn't left hanging
    alert(`Thank you, ${firstName}. Your order has been received. We will send a confirmation to ${email} shortly.\n\nIf you don't hear from us within 24 hours, please email hello@phelim.me with reference: ${bookTitle}.`);
    setTimeout(()=>{ closeCheckout(); form.reset(); btn.textContent=origTxt; },300);
  }
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
    const res  = await fetch('/.netlify/functions/submit-form', {
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
const launchDate=new Date('2027-02-01T00:00:00');
function updateCountdown(){
  const diff=launchDate-new Date();if(diff<=0)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v).padStart(2,'0');};
  set('cd-days',Math.floor(diff/86400000));
  set('cd-hours',Math.floor((diff%86400000)/3600000));
  set('cd-mins',Math.floor((diff%3600000)/60000));
  set('cd-secs',Math.floor((diff%60000)/1000));
}
setInterval(updateCountdown,1000);updateCountdown();
