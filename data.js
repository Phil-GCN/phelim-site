/* phelim.me — content data: articles, episodes, books
 * Fetches live from Supabase via the /api/db serverless function.
 */

// Initialise early so openCheckout() can populate it before data loads
window.BOOKS_DATA = window.BOOKS_DATA || {};

// ═══ SUPABASE FETCH (via server-side proxy) ═══
async function fetchFromDB(table, filter) {
  try {
    let url = `/api/db?table=${table}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
}

// Articles: fetched async, renders when ready
async function loadLiveArticles() {
  const rows = await fetchFromDB('articles', 'status:eq:published');
  if (rows && rows.length) {
    window.ARTICLES = rows;
    // Re-render if the articles list is already on screen
    const list = document.getElementById('articles-list');
    if (list && list.childElementCount > 0) renderArticles(window.ARTICLES, 'all');
  }
}

// Episodes: fetched async, rebuilds carousel when ready
async function loadLiveEpisodes() {
  const rows = await fetchFromDB('episodes');
  if (rows && rows.length) {
    window.EPS = rows.map(r => ({ n: r.number, t: r.title, d: r.description, bg: r.bg_color || '#1a3028', spotify: r.spotify_url, youtube: r.youtube_url }));
    // Rebuild carousel if it's visible
    const carousel = document.getElementById('podcast-carousel');
    if (carousel) buildCarousel();
  }
}

// Site content: apply text fields from Supabase to DOM elements
async function loadSiteContent() {
  const rows = await fetchFromDB('site_content');
  if (!rows || !rows.length) return;
  const sc = Object.fromEntries(rows.map(r => [r.key, r.value]));

  // About page
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.innerHTML = val; };
  const setText = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };

  set('sc-live-about-p1', sc.aboutP1);
  set('sc-live-about-p2', sc.aboutP2);

  // Hero (index.html)
  set('sc-live-hero-heading', sc.heroHeading);
  set('sc-live-hero-sub', sc.heroSub);

  // Speaking
  setText('sc-live-speaking-heading', sc.speakingHeading);
  set('sc-live-speaking-intro', sc.speakingIntro);
  if (sc.speakingNote) { const el = document.getElementById('sc-live-speaking-note'); if (el && sc.speakingNote) el.innerHTML = sc.speakingNote; }

  // Footer (all pages)
  if (sc.footerCopy) {
    document.querySelectorAll('.footer-copy').forEach(el => el.textContent = sc.footerCopy);
  }

  // Portrait photo — replaces silhouette placeholder on About page sidebar
  if (sc.portraitPhoto) {
    const photoSlot = document.querySelector('.spc-photo');
    if (photoSlot) {
      photoSlot.innerHTML = `<img src="${sc.portraitPhoto}" alt="Phelim Ekwebe" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    }
  }
}

// Books: load from Supabase and update checkout modal + all displayed book cards
async function loadLiveBooks() {
  const rows = await fetchFromDB('books');
  // If DB is empty, hide hardcoded books (they are fictitious until DB is populated)
  // If DB has data, show only DB books
  if (!rows) return; // network error — keep hardcoded defaults

  const set     = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null && val !== '') el.textContent = val; };
  const setHTML = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null && val !== '') el.innerHTML = val; };

  // Known hardcoded book IDs
  const knownIds = new Set(['btl', 'bs']);

  // Hide hardcoded books that are no longer in DB
  if (rows.length > 0) {
    const dbIds = new Set(rows.map(b => b.id));
    knownIds.forEach(kid => {
      if (!dbIds.has(kid)) {
        // Remove tab button + panel
        const btn   = document.getElementById(`bt-${kid}`);
        const panel = document.getElementById(`book-${kid}`);
        const resCard = document.querySelector(`#book-live-res-${kid}-title`)?.closest('.bres-card');
        if (btn)     btn.style.display = 'none';
        if (panel)   panel.style.display = 'none';
        if (resCard) resCard.style.display = 'none';
      }
    });
  }

  rows.forEach(b => {
    const id     = b.id;
    const isLive = b.mode === 'live';
    const stockStatus = b.stock_status || 'preorder';
    // Status badge on book card
    const badgeText = stockStatus === 'in_stock' ? 'Available Now'
                    : stockStatus === 'out_of_stock' ? 'Out of Stock'
                    : 'Pre-order';
    const tagText   = isLive ? (stockStatus === 'out_of_stock' ? 'Temporarily unavailable' : 'Available Now') : 'Coming Soon · Pre-order open';
    const ctaText   = isLive && stockStatus === 'in_stock' ? 'Buy Now'
                    : isLive && stockStatus === 'out_of_stock' ? 'Join waitlist'
                    : 'Pre-order Now';

    // Update window.BOOKS_DATA for checkout modal
    if (!window.BOOKS_DATA) window.BOOKS_DATA = {};
    // Build variants from per-format prices; fall back to single price for all formats
    const _formats  = (b.format_options || 'Hardcover').split('·').map(f => f.trim()).filter(Boolean);
    const _priceMap = { Hardcover: b.price_hardcover, Paperback: b.price_paperback, eBook: b.price_ebook, Audiobook: b.price_audiobook };
    const _variants = {};
    _formats.forEach(f => { _variants[f] = _priceMap[f] || b.price || '0'; });

    if (!window.BOOKS_DATA[id]) {
      window.BOOKS_DATA[id] = {
        title: b.title, subtitle: b.subtitle || '', type: 'book',
        price: b.price || '0', variants: _variants,
        color: b.cover_color || 'var(--forest)', mode: b.mode,
        stockStatus,
      };
    } else {
      if (b.title)    window.BOOKS_DATA[id].title    = b.title;
      if (b.subtitle) window.BOOKS_DATA[id].subtitle = b.subtitle;
      if (b.price)    window.BOOKS_DATA[id].price    = b.price;
      window.BOOKS_DATA[id].variants    = _variants;
      window.BOOKS_DATA[id].color       = b.cover_color || window.BOOKS_DATA[id].color || 'var(--forest)';
      window.BOOKS_DATA[id].mode        = b.mode;
      window.BOOKS_DATA[id].stockStatus = stockStatus;
    }

    if (knownIds.has(id)) {
      // ── Update existing hardcoded book elements ──
      set(`book-live-${id}-title`,       b.title);
      set(`book-live-${id}-subtitle`,    b.subtitle);
      setHTML(`book-live-${id}-desc`,    b.long_description || b.description);
      set(`book-live-${id}-cover-title`, b.title);
      set(`book-live-${id}-tag`,         tagText);
      set(`book-live-${id}-badge`,       badgeText);
      if (b.pub_date) set(`book-live-${id}-pubdate`, b.pub_date);
      if (b.author)   set(`book-live-${id}-author`,  b.author);
      // Always set audience & format — show/hide row for BTL audience
      set(`book-live-${id}-audience`, b.audience || '');
      set(`book-live-${id}-format`,   b.format_options || '');
      // Show BTL audience row only if value exists
      if (id === 'btl') {
        const audRow = document.getElementById('book-live-btl-audience-row');
        if (audRow) audRow.style.display = b.audience ? '' : 'none';
      }
      if (b.hook_text) {
        const hookEl = document.getElementById(`book-live-${id}-hook`);
        if (hookEl) hookEl.textContent = b.hook_text;
      }
      // CTA buttons
      const ctaEl    = document.getElementById(`book-live-${id}-cta`);
      const resCtaEl = document.getElementById(`book-live-res-${id}-cta`);
      if (ctaEl)    ctaEl.textContent    = ctaText;
      if (resCtaEl) resCtaEl.textContent = ctaText;

      // Resources page
      set(`book-live-res-${id}-title`,       b.title);
      set(`book-live-res-${id}-cover-title`, b.title);
      setHTML(`book-live-res-${id}-desc`,    b.description);
      set(`book-live-res-${id}-label`,       `${badgeText}${b.pub_date ? ' · ' + b.pub_date : ''}`);

      // Cover image
      if (b.cover_data) {
        [`book-live-${id}-cover`, `book-live-res-${id}-cover`].forEach(covId => {
          const el = document.getElementById(covId);
          if (el) { el.style.backgroundImage = `url(${b.cover_data})`; el.style.backgroundSize = 'cover'; }
        });
      }
    } else {
      // ── Dynamically render new book (not in hardcoded HTML) ──
      _renderDynamicBook(b, id, tagText, badgeText, ctaText);
    }
  });
}

function _renderDynamicBook(b, id, tagText, badgeText, ctaText) {
  const coverBg  = b.cover_data ? `background-image:url(${b.cover_data});background-size:cover;` : 'background:var(--forest);';
  const hookHtml = b.hook_text
    ? `<div style="background:var(--forest-faint);border:1px solid rgba(38,61,51,.15);padding:15px 18px;margin-bottom:16px;"><p style="font-size:.83rem;color:var(--ink60);margin:0;line-height:1.7;font-style:italic;">${b.hook_text}</p></div>`
    : '';
  const descHtml = b.long_description || b.description || '';
  const metaRows = [
    b.author        ? `<div class="book-meta"><strong>Author</strong> <span>${b.author}</span></div>` : '',
    b.pub_date      ? `<div class="book-meta"><strong>Est. publication</strong> <span>${b.pub_date}</span></div>` : '',
    b.audience      ? `<div class="book-meta"><strong>Audience</strong> <span>${b.audience}</span></div>` : '',
    b.format_options? `<div class="book-meta"><strong>Format</strong> <span>${b.format_options}</span></div>` : '',
  ].join('');

  // ── Engagements page ──
  const tabNav = document.querySelector('.book-tabs-nav');
  const dynPanels = document.getElementById('dynamic-book-panels');
  if (tabNav && dynPanels) {
    // Add tab button before "More coming" btn
    const moreBtn = document.getElementById('bt-more');
    if (!document.getElementById(`bt-${id}`)) {
      const btn = document.createElement('button');
      btn.className = 'book-tab-btn';
      btn.id = `bt-${id}`;
      btn.textContent = b.title;
      btn.onclick = function() { switchBookTab(id, this); };
      tabNav.insertBefore(btn, moreBtn || null);
    }
    // Add tab panel
    if (!document.getElementById(`book-${id}`)) {
      const div = document.createElement('div');
      div.id = `book-${id}`;
      div.className = 'book-tab-panel';
      div.innerHTML = `
        <div class="book-cover-wrap">
          <div class="book-cover" style="${coverBg}">
            <div class="book-cover-badge">${badgeText}</div>
            <div class="book-cover-title">${b.title}</div>
            <div class="book-cover-author">${b.author || 'Phelim Ekwebe'}</div>
          </div>
        </div>
        <div class="book-info-panel">
          <div class="book-tag">${tagText}</div>
          <div class="book-main-title">${b.title}</div>
          <div class="book-subtitle">${b.subtitle || ''}</div>
          <p class="book-desc">${descHtml}</p>
          ${hookHtml}
          <div class="book-meta-row">${metaRows}</div>
          <div class="book-ctas">
            <button class="btn btn-dark" onclick="openCheckout('${id}')">${ctaText}</button>
            <button class="btn btn-outline" onclick="openModal('waitlist','${id}','${b.title}')">Get launch notification</button>
          </div>
        </div>`;
      dynPanels.appendChild(div);
    }
  }

  // ── Resources page ──
  const dynCards = document.getElementById('dynamic-book-res-cards');
  if (dynCards && !document.getElementById(`book-live-res-${id}-title`)) {
    const card = document.createElement('div');
    card.className = 'bres-card';
    const coverStyle = b.cover_data ? `background-image:url(${b.cover_data});background-size:cover;` : 'background:var(--forest);';
    card.innerHTML = `
      <div class="bres-cover" style="${coverStyle}"><span>${b.title}</span></div>
      <div>
        <div class="bres-label">${badgeText}${b.pub_date ? ' · ' + b.pub_date : ''}</div>
        <div class="bres-title" id="book-live-res-${id}-title">${b.title}</div>
        <p class="bres-desc">${b.description || ''}</p>
        <button class="btn btn-dark" onclick="openCheckout('${id}')">${ctaText}</button>
      </div>`;
    dynCards.appendChild(card);
  }
}

// ═══ NEWSLETTER SUBSCRIBE (footer) ═══
function renderNewsletterFooter() {
  const slot = document.getElementById('newsletter-footer-slot');
  if (!slot) return;
  slot.innerHTML = `
    <div style="margin:18px 0 10px;padding:18px 20px;background:rgba(38,61,51,.06);border:1px solid rgba(38,61,51,.12);max-width:420px;">
      <div style="font-family:var(--serif);font-size:.95rem;color:var(--ink);margin-bottom:4px;">Stay in the loop</div>
      <div style="font-size:.74rem;color:var(--ink60);margin-bottom:12px;line-height:1.6;">New episodes, essays, and resources — when they land, not before.</div>
      <form id="newsletter-form" onsubmit="handleNewsletterSubscribe(event)" style="display:flex;gap:8px;flex-wrap:wrap;">
        <input name="name"  type="text"  placeholder="Your name"  required style="flex:1;min-width:120px;padding:8px 10px;font-size:.8rem;border:1px solid rgba(38,61,51,.2);background:transparent;font-family:var(--sans);">
        <input name="email" type="email" placeholder="your@email.com" required style="flex:1;min-width:160px;padding:8px 10px;font-size:.8rem;border:1px solid rgba(38,61,51,.2);background:transparent;font-family:var(--sans);">
        <button type="submit" style="padding:8px 16px;background:var(--forest);color:#f8f6f1;border:none;font-size:.78rem;letter-spacing:.04em;cursor:pointer;font-family:var(--sans);">Subscribe</button>
      </form>
      <div id="newsletter-confirm" style="display:none;font-size:.8rem;color:var(--forest);margin-top:8px;"></div>
    </div>`;
}

async function handleNewsletterSubscribe(e) {
  e.preventDefault();
  const form    = e.target;
  const name    = form.name.value.trim();
  const email   = form.email.value.trim();
  const confirm = document.getElementById('newsletter-confirm');
  const btn     = form.querySelector('button[type="submit"]');
  if (!name || !email) return;

  btn.textContent = '…'; btn.disabled = true;

  try {
    const res  = await fetch('/api/subscribe-newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    form.style.display = 'none';
    confirm.style.display = 'block';
    if (data.duplicate) {
      confirm.textContent = `${email} is already subscribed. Thank you.`;
    } else {
      confirm.textContent = `Thank you, ${name.split(' ')[0]}. You're subscribed.`;
    }
  } catch(_) {
    btn.textContent = 'Subscribe'; btn.disabled = false;
    confirm.style.display = 'block';
    confirm.textContent = 'Something went wrong. Please try again.';
    confirm.style.color = '#c0392b';
  }
}

// Kick off background fetches — page renders immediately with defaults, updates silently
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    loadLiveArticles();
    loadLiveEpisodes();
    loadSiteContent();
    loadLiveBooks();
    renderNewsletterFooter();
  });
}

// ═══ ARTICLES DATA ═══
const ARTICLES_DEFAULT=[
  {id:'a1',tag:'Systems',title:'The Difference Between Effort and Structure',excerpt:'Effort without structure is noise. Structure without effort is inert. Understanding the relationship between the two is the starting point for building anything that lasts.',meta:'Essay · 8 min read',cat:'systems',body:`<p>Most people approach their goals the same way every time: they get motivated, they start strong, and then — somewhere around week three — the motivation fades and so does the behaviour. The cycle repeats. The goal never compounds.</p><p>The problem isn't willpower or commitment. It's architecture. Motivation is a renewable resource, but it depletes. A system is infrastructure — it doesn't care how you feel on Tuesday morning.</p><h3>What a system actually is</h3><p>A system is any arrangement of parts that produces a reliable output without requiring a new decision each time. Your morning routine is a system. Your filing structure is a system. So is the way you handle email, track finances, or process information from books.</p><p>The goal of building a system is not to remove all friction from life — it's to ensure that the most important behaviours happen regardless of your emotional state on any given day.</p><blockquote>"You do not rise to the level of your goals. You fall to the level of your systems." — A principle worth internalising deeply.</blockquote><h3>Why most people have none</h3><p>The reason most people don't build systems is the same reason they don't build anything else that requires upfront investment: the payoff is invisible in the short term. A system costs time to design and effort to install. The results only become obvious weeks or months later, compounded across hundreds of applications.</p><p>This is precisely why systems thinking is a form of long-term thinking. And why those who master it consistently outperform those who rely on motivation.</p><h3>Where to start</h3><p>Pick one domain of your life where you rely most on motivation or willpower. Then design the simplest possible system that removes the decision from the moment. You are not trying to automate your life — you are trying to make the right behaviour the path of least resistance.</p><p>Start small. One system, installed properly, will teach you more about systems design than any book.</p>`},
  {id:'a2',tag:'Identity',title:'Why Your Environment Matters More Than You Think',excerpt:'You cannot consistently outperform the environment you operate inside. This is not a metaphor — it is a structural constraint. Here is how to design around it.',meta:'Essay · 11 min read',cat:'identity',body:`<p>We talk about identity as though it is something discovered — a fixed thing waiting to be uncovered through enough introspection or life experience. The reality is far more interesting, and far more empowering.</p><p>Identity is not found. It is built. And if you are not building it deliberately, your environment is building it for you.</p><h3>How identity actually forms</h3><p>Identity is the story your nervous system has learned to tell about who you are. It forms through three primary mechanisms: repeated action, social environment, and narrative.</p><p>Repeated action is the most powerful. Every time you act in a particular way, you deposit a small vote in the ballot box of "who I am." Do something consistently enough and it stops feeling like a choice and starts feeling like a character trait. This is not magic — it is neurology. Your brain optimises for patterns.</p><h3>The intervention</h3><p>If identity forms through repeated action, then the design question is simple: what actions do you want to make habitual? Not what do you want to achieve — but what do you want to become the kind of person who does automatically?</p><p>This is a fundamentally different way of setting goals. Instead of "I want to write a book," you ask: "What actions does a writer take consistently?" Then you install those actions.</p><blockquote>Identity precedes results. Become the person first. The outputs follow.</blockquote><p>The same logic applies to every domain — financial behaviour, physical health, relationships, professional output. Before asking what you want, ask who you are becoming. Then design accordingly.</p>`},
  {id:'a3',tag:'Investment',title:'Designing Decisions Instead of Reacting to Them',excerpt:'Most people make their most important decisions in the worst possible conditions — under pressure, with incomplete information, and no pre-built framework. There is a better approach.',meta:'Essay · 10 min read',cat:'investment',body:`<p>There is a persistent tension in modern investment thinking between the tangible and the digital — between real estate, physical infrastructure, and hard assets on one hand, and technology, software, and digital platforms on the other.</p><p>I do not think this tension is real. I think it is a failure of framing.</p><h3>The case for real assets</h3><p>Real estate and physical infrastructure have a property that most digital assets do not: they exist in scarcity-constrained space. Land cannot be duplicated. A building in a specific location cannot be moved. This physical constraint creates a floor that pure digital assets rarely have.</p><p>More importantly, real assets generate cash flows that compound over time. Rental income, lease agreements, and infrastructure usage fees are not dependent on sentiment. They are dependent on human need — for housing, for space, for movement. These needs do not go away.</p><h3>The case for technology</h3><p>Technology, by contrast, has the opposite properties: it is highly scalable, infinitely duplicable, and increasingly infrastructure-like. The internet is now as essential as roads. Cloud computing is now as essential as electricity. The platforms that have achieved this status have done so by becoming invisible infrastructure.</p><p>Investing in technology is therefore not purely speculative — it is increasingly a bet on infrastructure, just infrastructure of a different kind.</p><h3>The synthesis</h3><p>The builders I most respect do not choose between these worlds. They understand that a healthy long-term portfolio includes exposure to both the physical and the digital — real assets for stability and compounding cash flow, technology for growth and structural transformation. The ratio depends on your time horizon, your risk tolerance, and your ability to understand what you own.</p><p>The one thing I am certain of: building only in one world leaves you unnecessarily exposed. The future belongs to those who can navigate both.</p>`},
  {id:'a4',tag:'Legacy',title:'What Gets Built Into People — Not Just Left Behind',excerpt:'Legacy is not an estate. It is not a name on a building. It is the set of frameworks, perspectives, and decisions you install in people while you are still present and deliberate about it.',meta:'Essay · 9 min read',cat:'legacy',body:`<p>The traditional understanding of legacy is passive and posthumous. You live your life, and whatever impression you made on people, whatever assets you accumulated, whatever institutions bear your name — that is your legacy. It is defined in retrospect, after the fact, by others.</p><p>This is a deeply limiting frame. And I think it is responsible for a great deal of deferred significance.</p><h3>The active definition</h3><p>Legacy, properly understood, is not what you leave behind. It is what you build into people, systems, and structures while you are still present. It is influence that is designed rather than accumulated by accident.</p><p>The most significant people I have studied — in history, in business, in community life — understood this. They were not waiting for the world to remember them. They were actively engineering the conditions under which the people around them would think differently, act more intentionally, and build more deliberately.</p><h3>Legacy as a design problem</h3><p>This reframing converts legacy from a hope into a practice. If legacy is something you build now, then the design questions become practical: Who are the people in your sphere of influence? What thinking do you want to install in them? What structures, systems, or institutions are you building that will outlast your direct involvement?</p><blockquote>Legacy is the residue of your intentionality applied over time, not the sum of your achievements evaluated in retrospect.</blockquote><p>The shift is subtle but profound. One asks you to wait. The other asks you to build — now, deliberately, with full awareness that what you are constructing will outlast the moment in which you build it.</p>`},
  {id:'a5',tag:'Systems',title:'The Compounding Effect No One Talks About',excerpt:'The compound effect is discussed constantly in finance. It is almost never discussed in the context of identity, decisions, and character — where it matters just as much, if not more.',meta:'Essay · 7 min read',cat:'systems',body:`<p>We have a tendency to evaluate the significance of a decision by how large it feels in the moment. Major choices — career changes, moving cities, significant relationships — feel weighty because they demand our full attention. Minor daily choices feel trivial because they ask almost nothing of us.</p><p>This is exactly backwards from how consequences actually work.</p><h3>The compounding problem</h3><p>Most consequential choices are not made in high-stakes moments of obvious decision. They are made in the mundane accumulation of small choices: whether to do the thing or not, whether to respond thoughtfully or reactively, whether to invest an hour in something that compounds or consume it in something that doesn't.</p><p>The compound effect is not a motivational concept. It is a mathematical reality. Small inputs, applied consistently, produce enormous outputs over time. This works for money. It works for knowledge. It works for relationships. It works for reputation. And it works in reverse — small erosions, consistently applied, produce corresponding decay.</p><h3>The practical implication</h3><p>If small decisions compound, then the most important design work is not optimising your biggest choices — it is installing defaults that make your small daily choices automatically better.</p><p>This is what a system does. It takes a small decision out of the moment of temptation or fatigue and pre-commits it at a calmer time. The outcome is not perfection — it is a higher floor and a better average over thousands of repetitions.</p><p>Begin with the question: which small choices, compounded over five years, would matter most? Then design those choices out of the daily decision queue entirely.</p>`},
  {id:'a6',tag:'Systems',title:'On Systems Thinking as a Way of Life',excerpt:'Most people learn systems thinking as a professional tool. The more interesting application is personal — using it to understand and redesign the invisible structures shaping how you live.',meta:'Essay · 8 min read',cat:'legacy',body:`<p>Success is a reasonable goal. It is measurable: targets achieved, income earned, positions held, awards received. It provides a clear feedback loop and a socially legible way of communicating progress. There is nothing wrong with wanting it.</p><p>But significance is different. And confusing the two — or worse, pursuing success in the belief that it will eventually produce significance — is one of the most common and quietly costly mistakes I observe in high-performing people.</p><h3>The distinction</h3><p>Success is essentially a private ledger. It accumulates in your account, and you can measure it precisely. Significance is fundamentally relational — it exists in the gap between you and other people, in the degree to which your presence in their lives has altered the trajectory of something that matters.</p><p>You can be highly successful without being particularly significant. History is full of people who achieved extraordinary results but left surprisingly little trace in the lives of those around them. And the reverse is equally true: some of the most significant people in any community never appeared in any public accounting of success.</p><h3>Why the distinction matters</h3><p>If you are optimising purely for success, you will make certain choices that actively work against significance: you will prioritise visibility over depth, output over relationships, speed over the slow work of investing in people.</p><blockquote>Significance requires a different kind of investment — one that rarely shows up on a quarterly review, but accumulates in the kind of loyalty, influence, and impact that outlasts any particular achievement.</blockquote><p>The path forward is not to abandon success — it is to hold both simultaneously and understand that they require different strategies, different time horizons, and different measures of progress. Build the career. And build the people around you. Both matter. Only one lasts.</p>`},
];
// Start with defaults; loadLiveArticles() replaces this async after DOMContentLoaded
window.ARTICLES = ARTICLES_DEFAULT;

// ═══ EPISODES DATA (defaults — replaced async by loadLiveEpisodes) ═══
window.EPS=[
  {n:'10',t:'The Ultimate Bottleneck: Why You Must Become the CEO of Your Life First',d:'Most people optimise their tools, their schedules, and their habits — while leaving the most critical variable unchanged. This episode examines that variable.',bg:'#1a3028'},
  {n:'09',t:'The Busy Trap: Productive vs. Merely Occupied',d:'Being busy and being productive are structurally different. This episode maps the difference and explains why confusing them is so costly over time.',bg:'#1e3530'},
  {n:'08',t:'Designing Your Environment for High Performance',d:'Your environment is not the backdrop to your life — it is a determining factor. Here is how to design it deliberately.',bg:'#243420'},
  {n:'07',t:'The Long Game: Why Decades Beat Years',d:'Short-term thinking is not irrational — it is the default. This episode examines what changes when you deliberately extend your time horizon and what becomes possible as a result.',bg:'#1a2d20'},
  {n:'06',t:'The Five-Year Architecture: Planning Beyond the Year',d:'Most planning frameworks are too short. Introducing a longer horizon.',bg:'#1e3528'},
  {n:'05',t:'Wealth Across Borders: The Multi-Jurisdiction Reality',d:'Managing income, assets, and planning across multiple countries requires different mental models.',bg:'#243018'},
  {n:'04',t:'The Invisible Frameworks Shaping Your Decisions',d:'Most of the decisions that shape your life were made before you entered the room.',bg:'#1a2a20'},
  {n:'03',t:'Systems That Outlast Motivation',d:'Motivation comes and goes. Systems persist. Building the infrastructure of consistency.',bg:'#1e3020'},
  {n:'02',t:'The Cost of Staying: Comfort, Risk, and Inertia',d:'Every choice to stay has a cost that rarely gets accounted for. Making that cost visible.',bg:'#243428'},
  {n:'01',t:'The Decision — Why You\'re Here and What It Costs to Stay',d:'The foundational episode. Why the decision to live intentionally is not a personality type or a gift — it is a practice, available to anyone willing to examine the structures they are operating inside.',bg:'#1a2818'},
];

// ═══ NAV ═══
function showPage(id,subtab){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active-link'));
  const el=document.getElementById('nl-'+id);if(el)el.classList.add('active-link');
  window.scrollTo(0,0);
  if(id==='podcast')buildCarousel();
  if(id==='resources'){
    if(subtab)switchResTab(subtab);
    else switchResTab('books');
  }
  if(id==='eng'){switchEngTab(subtab||'speaking');}
}
function toggleMenu(){const m=document.getElementById('mob-menu');m.style.display=m.style.display==='block'?'none':'block';}
function closeMenu(){document.getElementById('mob-menu').style.display='none';}

// ═══ HOME TABS ═══
function switchHomeTab(id,btn){
  document.querySelectorAll('.tab-nav .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ['podcast','speaking','writing'].forEach(t=>{const p=document.getElementById('home-'+t);if(p)p.classList.toggle('active',t===id);});
}

// ═══ ENGAGEMENTS TABS ═══
function switchEngTab(id){
  document.querySelectorAll('.eng-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.eng-tab-panel').forEach(p=>p.classList.remove('active'));
  const tab=document.getElementById('eng-tab-'+id);if(tab)tab.classList.add('active');
  const panel=document.getElementById('eng-'+id);if(panel)panel.classList.add('active');
  if(id==='articles'){renderArticles(window.ARTICLES,'all');}
}

// ═══ BOOK TABS ═══
function switchBookTab(id,btn){
  document.querySelectorAll('.book-tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.book-tab-panel').forEach(p=>p.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('book-'+id);if(panel)panel.classList.add('active');
}

// ═══ ARTICLES ═══
function renderArticles(arts,filter){
  const list=document.getElementById('articles-list');
  if(!list)return;
  const filtered=filter==='all'?arts:arts.filter(a=>a.cat===filter);
  list.innerHTML=filtered.map((a,i)=>`
    <div class="article-row" onclick="openArticle('${a.id}')">
      <div class="ar-num">0${i+1}</div>
      <div class="ar-body">
        <div class="ar-tag">${a.tag}</div>
        <div class="ar-title">${a.title}</div>
        <div class="ar-excerpt">${a.excerpt}</div>
        <div class="ar-meta">${a.meta}</div>
      </div>
      <div class="ar-arrow">→</div>
    </div>`).join('');
}
function filterArticles(tag,btn){
  document.querySelectorAll('.art-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderArticles(window.ARTICLES,tag);
}
function openArticle(id){
  const a=window.ARTICLES.find(x=>x.id===id);if(!a)return;
  document.getElementById('af-tag').textContent=a.tag;
  document.getElementById('af-title').textContent=a.title;
  document.getElementById('af-meta').textContent=a.meta;
  const rawBody=a.body||'';
  const safeBody=(typeof DOMPurify!=='undefined')
    ?DOMPurify.sanitize(rawBody,{ALLOWED_TAGS:['p','h2','h3','blockquote','strong','em','ul','ol','li','a','br','hr','code','span','div'],ALLOWED_ATTR:['href','target','rel','class','style']})
    :rawBody.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/on\w+="[^"]*"/gi,'');
  document.getElementById('af-body').innerHTML=safeBody;
  document.getElementById('articles-list-view').style.display='none';
  document.getElementById('article-full-view').classList.add('open');
  window.scrollTo(0,0);
}
function closeArticle(){
  document.getElementById('articles-list-view').style.display='block';
  document.getElementById('article-full-view').classList.remove('open');
  window.scrollTo(0,0);
}

// ═══ RESOURCES TABS ═══
function switchResTab(id){
  document.querySelectorAll('.res-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.res-tab-panel').forEach(p=>p.classList.remove('active'));
  const tab=document.getElementById('rt-'+id);if(tab)tab.classList.add('active');
  const panel=document.getElementById('res-'+id);if(panel)panel.classList.add('active');
  if(id==='planner')setTimeout(calc,80);
}

// ═══ CONTACT TABS ═══
function switchEnqTab(id){
  document.querySelectorAll('.enq-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.enq-panel').forEach(p=>p.classList.remove('active'));
  const tab=document.getElementById('enq-btn-'+id);if(tab)tab.classList.add('active');
  const panel=document.getElementById('enq-'+id);if(panel)panel.classList.add('active');
}
