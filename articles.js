/* phelim.me — articles: render, filter, open, close */

function renderArticles(arts, filter) {
  const list = document.getElementById('articles-list');
  if (!list) return;
  const filtered = filter === 'all' ? arts : arts.filter(a => a.cat === filter);
  list.innerHTML = filtered.map((a, i) => `
    <div class="article-row" onclick="openArticle('${a.id}')">
      <div class="ar-num">0${i + 1}</div>
      <div class="ar-body">
        <div class="ar-tag">${a.tag}</div>
        <div class="ar-title">${a.title}</div>
        <div class="ar-excerpt">${a.excerpt}</div>
        <div class="ar-meta">${a.meta}</div>
      </div>
      <div class="ar-arrow">→</div>
    </div>`).join('');
}

function filterArticles(tag, btn) {
  document.querySelectorAll('.art-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderArticles(ARTICLES, tag);
}

function openArticle(id) {
  const a = ARTICLES.find(x => x.id === id);
  if (!a) return;
  document.getElementById('af-tag').textContent = a.tag;
  document.getElementById('af-title').textContent = a.title;
  document.getElementById('af-meta').textContent = a.meta;
  document.getElementById('af-body').innerHTML = a.body;
  document.getElementById('articles-list-view').style.display = 'none';
  document.getElementById('article-full-view').classList.add('open');
  window.scrollTo(0, 0);
}

function closeArticle() {
  document.getElementById('articles-list-view').style.display = 'block';
  document.getElementById('article-full-view').classList.remove('open');
  window.scrollTo(0, 0);
}
