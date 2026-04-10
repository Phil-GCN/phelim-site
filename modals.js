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
  }
};
function openModal(ctx){
  const c=MODAL_FORMS[ctx]||MODAL_FORMS.general;
  document.getElementById('m-eyebrow').textContent=c.eyebrow;
  document.getElementById('m-title').textContent=c.title;
  document.getElementById('m-form-body').innerHTML=c.html;
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeModal(){document.getElementById('modal').classList.remove('open');document.body.style.overflow='';}
function closeModalOuter(e){if(e.target===document.getElementById('modal'))closeModal();}
function handleModalSubmit(btn){
  const orig=btn.textContent;
  btn.textContent='Sent ✓';btn.style.background='var(--forest)';
  setTimeout(()=>{closeModal();btn.textContent=orig;btn.style.background='';},2200);
}

// ═══ CHECKOUT ═══
window.BOOKS_DATA={
  btl:{title:'Built to Last',subtitle:'The Modern Guide to Wealth, Freedom, and Legacy',price:'24.99',color:'var(--forest)'},
  bs:{title:'Beyond Survival',subtitle:"The Immigrant's Guide to Generational Wealth",price:'22.99',color:'#1a2d24'}
};
function openCheckout(id){
  const b=window.BOOKS_DATA[id]||window.BOOKS_DATA.btl;
  document.getElementById('co-title').textContent=b.title;
  document.getElementById('co-price').textContent='€ '+b.price;
  document.getElementById('co-cover').style.background=b.color;
  document.getElementById('co-cover-text').textContent=b.title;
  document.getElementById('co-item-name').textContent=b.title;
  document.getElementById('co-item-type').textContent=b.subtitle+' · Pre-order';
  document.getElementById('co-item-price').textContent='€ '+b.price;
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
function handleCheckout(e){
  e.preventDefault();
  const btn=e.target.querySelector('button[type="submit"]');
  btn.textContent='Processing...';btn.disabled=true;
  setTimeout(()=>{
    btn.textContent='Order placed ✓';btn.style.background='var(--forest)';
    setTimeout(()=>{closeCheckout();btn.textContent='Complete Pre-order';btn.style.background='';btn.disabled=false;},2400);
  },1600);
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
  confirm.style.cssText = 'padding:32px 24px;background:#f0f5f2;border:1px solid rgba(38,61,51,.18);text-align:center;';
  confirm.innerHTML = `
    <div style="font-family:Georgia,serif;font-size:1.25rem;color:#263d33;margin-bottom:10px;">Message sent.</div>
    <p style="font-size:.9rem;color:#555;margin:0 0 18px;line-height:1.65;">Thank you${name ? ', ' + name.split(' ')[0] : ''}. A confirmation has been sent to ${email || 'your email'}.</p>
    <button type="button" onclick="document.getElementById('${confirmId}').remove();document.querySelector('[name=${formName}]').style.display=''" style="font-size:.8rem;color:#263d33;background:none;border:1px solid #263d33;padding:7px 18px;cursor:pointer;">Send another message</button>`;
  form.style.display = 'none';

  btn.textContent = orig;
  btn.style.background = '';
  btn.disabled = false;
  return false;
}

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
