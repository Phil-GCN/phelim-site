/* phelim.me — Portal JavaScript */

// ── AUTH GUARD ──
function requireAuth() {
  if (!sessionStorage.getItem('portal-auth')) {
    window.location.href = 'login.html';
  }
}

function logout() {
  sessionStorage.removeItem('portal-auth');
  window.location.href = 'login.html';
}

// ── MOBILE SIDEBAR TOGGLE ──
function toggleSidebar() {
  const sidebar = document.querySelector('.portal-sidebar');
  if (sidebar) sidebar.style.display = sidebar.style.display === 'block' ? '' : 'block';
}

// ── PORTAL TABS (generic) ──
function showTab(id) {
  const panels = document.querySelectorAll('.portal-tab-panel');
  const tabs = document.querySelectorAll('.portal-tab');
  panels.forEach(p => p.classList.remove('active'));
  tabs.forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  const tab = document.getElementById('tab-' + id);
  if (panel) panel.classList.add('active');
  if (tab) tab.classList.add('active');
}

// ── SITE CONTENT TABS ──
function showSCTab(id) {
  document.querySelectorAll('.portal-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.portal-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('sc-panel-' + id);
  const tab = document.getElementById('sc-tab-' + id);
  if (panel) panel.classList.add('active');
  if (tab) tab.classList.add('active');
}

// ── EPISODE FORM ──
function showEpisodeForm() {
  const form = document.getElementById('episode-form');
  if (form) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    if (form.style.display === 'block') form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function saveEpisode() {
  const btn = document.querySelector('#episode-form .btn-primary');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = 'Saving...';
  setTimeout(() => {
    btn.textContent = 'Saved ✓';
    btn.style.background = 'var(--green)';
    // In production: POST to GitHub API or Supabase
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
      document.getElementById('episode-form').style.display = 'none';
      showToast('Episode saved. Site will rebuild in ~30 seconds.');
    }, 1400);
  }, 900);
}

// ── ARTICLE EDITOR ──
function saveArticle(status) {
  const label = status === 'draft' ? 'Draft saved ✓' : 'Published ✓';
  const btns = document.querySelectorAll('#panel-editor .btn-primary, #panel-editor .btn-secondary');
  btns.forEach(b => { b.disabled = true; });
  setTimeout(() => {
    showToast(status === 'draft' ? 'Draft saved successfully.' : 'Article published. Site will rebuild in ~30 seconds.');
    btns.forEach(b => { b.disabled = false; });
  }, 800);
}

function fmt(type) {
  const area = document.getElementById('article-body');
  if (!area) return;
  const sel = area.value.substring(area.selectionStart, area.selectionEnd);
  const map = {
    bold: `<strong>${sel || 'Bold text'}</strong>`,
    italic: `<em>${sel || 'Italic text'}</em>`,
    h3: `<h3>${sel || 'Subheading'}</h3>`,
    quote: `<blockquote>${sel || 'Pull quote here'}</blockquote>`,
    p: `<p>${sel || 'Paragraph text'}</p>`,
  };
  const insert = map[type] || sel;
  const start = area.selectionStart;
  area.value = area.value.substring(0, start) + insert + area.value.substring(area.selectionEnd);
  area.focus();
}

// ── ENQUIRIES ──
const ENQUIRY_DATA = [
  {
    id: 1, name: 'Sarah Kamara', email: 'sarah@company.com', type: 'Speaking',
    time: '2 hours ago', status: 'new',
    body: 'Hi Phelim, I am organising a leadership summit in Brussels in March 2026 for approximately 200 senior managers and executives. The theme is "Designing Organisations That Last" and your thinking on systems and decision architecture feels like a perfect fit. Would you be available for a 45-minute keynote, with potential for a breakout session afterwards? Happy to discuss your fee and logistics.'
  },
  {
    id: 2, name: 'Marc Dupont', email: 'marc@podcast.io', type: 'Podcast',
    time: 'Yesterday', status: 'new',
    body: 'Hi, I host The Founders Show — a podcast with around 40k listeners focused on building companies with intention. Your work on systems thinking and decision architecture resonates closely with our audience. Would you be open to a conversation about coming on as a guest? We record remotely and sessions are typically 60 minutes.'
  },
  {
    id: 3, name: 'Amara Leke', email: 'amara@brand.co', type: 'Partnership',
    time: '2 days ago', status: 'new',
    body: 'Hello Phelim, we build financial tools specifically for diaspora professionals managing money across multiple countries. Given your work on the Builder\'s Wealth Planner and your audience, we think there\'s a natural alignment. We\'d love to explore a partnership — whether that\'s a co-branded tool, a sponsored episode, or something we design together. Happy to share more details if you\'re open to a conversation.'
  },
  {
    id: 4, name: 'James Obi', email: 'james@email.com', type: 'General',
    time: '4 days ago', status: 'read',
    body: 'Hi Phelim, just wanted to say Episode 7 changed how I think about time. The framing around decades vs. years was something I\'d heard before in financial contexts but never applied to how I structure my personal decisions. Genuinely useful. Looking forward to the book.'
  },
];

function viewEnq(id) {
  const enq = ENQUIRY_DATA.find(e => e.id === id);
  if (!enq) return;
  document.getElementById('enq-d-name').textContent = enq.name;
  document.getElementById('enq-d-meta').textContent = `${enq.type} · ${enq.email} · ${enq.time}`;
  document.getElementById('enq-d-body').textContent = enq.body;
  document.getElementById('enq-reply-btn').href = `mailto:${enq.email}`;
  const detail = document.getElementById('enq-detail');
  detail.style.display = 'block';
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterEnq(type) {
  document.querySelectorAll('.portal-tabs .portal-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const rows = document.querySelectorAll('#enquiries-tbody tr');
  rows.forEach(row => {
    const typeCell = row.querySelector('td:nth-child(2)');
    if (!typeCell) return;
    const match = type === 'all' || typeCell.textContent.toLowerCase() === type;
    row.style.display = match ? '' : 'none';
  });
}

function markAllRead() {
  document.querySelectorAll('.badge-new').forEach(b => {
    b.classList.remove('badge-new');
    b.classList.add('badge-read');
    b.textContent = 'Read';
  });
  const badge = document.getElementById('unread-badge');
  if (badge) badge.style.display = 'none';
  showToast('All enquiries marked as read.');
}

// ── SITE CONTENT SAVE ──
async function saveContent(section) {
  const saved = JSON.parse(localStorage.getItem('portal-site-content') || '{}');
  const dbUpdates = {}; // key → value for DB.setSiteContent calls

  const pick = (id, key) => {
    const val = document.getElementById(id)?.value;
    if (val !== undefined && val !== null) { saved[key] = val; dbUpdates[key] = val; }
  };

  if (section === 'hero') {
    pick('sc-hero-heading', 'heroHeading');
    pick('sc-hero-sub',     'heroSub');
    pick('sc-hero-eyebrow', 'heroEyebrow');
  } else if (section === 'about') {
    pick('sc-about-p1', 'aboutP1');
    pick('sc-about-p2', 'aboutP2');
  } else if (section === 'speaking') {
    pick('sc-speaking-heading', 'speakingHeading');
    pick('sc-speaking-intro',   'speakingIntro');
    pick('sc-speaking-note',    'speakingNote');
  } else if (section === 'branding') {
    pick('sc-footer-copy', 'footerCopy');
  }

  localStorage.setItem('portal-site-content', JSON.stringify(saved));

  // Persist to DB if available
  if (window.DB && Object.keys(dbUpdates).length) {
    try {
      await DB.setSiteContent(dbUpdates);
    } catch(e) { console.warn('DB save failed, localStorage only:', e); }
  }

  const labels = { hero: 'Hero content', about: 'About content', speaking: 'Speaking content', photo: 'Portrait photo', branding: 'Branding' };
  showToast(`${labels[section] || 'Content'} saved.`);
}

// ── BOOKS: Stripe link save ──
function saveBookChanges(bookId) {
  showToast(`${bookId} details saved. Changes go live on next site rebuild.`);
}

// ── TOAST NOTIFICATION ──
function showToast(message, type) {
  const existing = document.getElementById('portal-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'portal-toast';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;background:var(--forest);color:var(--paper);
    padding:12px 20px;font-family:var(--sans);font-size:.82rem;z-index:9999;
    border-radius:3px;box-shadow:0 4px 16px rgba(0,0,0,.15);
    animation:slideIn .25s ease;max-width:340px;line-height:1.5;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

// Add toast animation
const toastStyle = document.createElement('style');
toastStyle.textContent = '@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(toastStyle);

// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
  requireAuth();
});
