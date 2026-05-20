/* phelim.me — Podcast Page JS */

document.addEventListener('DOMContentLoaded', () => {
  loadEpisodes();
});

async function loadEpisodes() {
  // Assuming episodes are loaded from a data source like a JSON file or an API
  // For this example, I'll use the existing window.EPS data if available
  const episodes = window.EPS || [];

  const recommended = episodes.filter(e => e.is_recommended);
  const featured = episodes.filter(e => e.is_featured);

  if (recommended.length) {
    populateRecommended(recommended);
  }

  if (featured.length) {
    populateFeatured(featured);
  }
}

function populateRecommended(episodes) {
  const list = document.getElementById('rec-ep-list');
  if (!list) return;

  list.innerHTML = episodes.map(e => {
    const spMatch = e.spotify?.match(/episode\/([A-Za-z0-9]+)/);
    const spEmbed = spMatch ? `https://open.spotify.com/embed/episode/${spMatch[1]}?utm_source=generator` : null;
    const safeTitle = (e.t || '').replace(/'/g, "\\'");

    return `<div class="rec-ep-row" onclick="setRecommendedPlayer('${spEmbed}', '${safeTitle}', this)">
        <div class="sli-num">${e.n}</div>
        <div class="sli-title">${e.t}</div>
      </div>`;
  }).join('');
}

function populateFeatured(episodes) {
  const grid = document.getElementById('featured-episodes-grid');
  if (!grid) return;

  grid.innerHTML = episodes.map(e => {
    const ytMatch = e.youtube?.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{11})/);
    const ytId = ytMatch ? ytMatch[1] : null;
    const spMatch = e.spotify?.match(/episode\/([A-Za-z0-9]+)/);
    const spEmbed = spMatch ? `https://open.spotify.com/embed/episode/${spMatch[1]}?utm_source=generator` : null;
    const safeTitle = (e.t || '').replace(/'/g, "\\'");

    const cardClick = ytId
      ? `onclick="playFeaturedYouTube('${ytId}', '${safeTitle}')"`
      : spEmbed
      ? `onclick="playFeaturedSpotify('${spEmbed}', '${safeTitle}')"`
      : '';

    return `<div class="fep-card" ${cardClick}>
        <div class="fep-thumb" style="background-image: url('${e.thumbnail || ''}'); background-color: ${e.bg || '#000'};">
          <div class="fep-play">&#9654;</div>
        </div>
        <div class="fep-card-body">
          <div class="fep-num">Episode ${e.n}</div>
          <div class="fep-title">${e.t}</div>
          <div class="fep-desc-clamp">${e.d || ''}</div>
        </div>
      </div>`;
  }).join('');
}

function setRecommendedPlayer(embedSrc, title, rowEl) {
  const frame = document.getElementById('rec-player-frame');
  if (frame) frame.src = embedSrc;
  const label = document.getElementById('rec-player-title');
  if (label) label.textContent = title ? 'Now playing: ' + title : '';
  document.querySelectorAll('.rec-ep-row').forEach(r => r.classList.remove('rec-ep-active'));
  if (rowEl) rowEl.classList.add('rec-ep-active');
}

function playFeaturedYouTube(videoId, title) {
  const frame = document.getElementById('fep-player-frame');
  const wrap = document.getElementById('fep-player-wrap');
  const label = document.getElementById('fep-player-title');
  if (!frame) return;
  frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  if (label) label.textContent = title || '';
  wrap.style.display = '';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function playFeaturedSpotify(embedSrc, title) {
  const frame = document.getElementById('fep-player-frame');
  const wrap = document.getElementById('fep-player-wrap');
  const label = document.getElementById('fep-player-title');
  if (!frame) return;
  frame.src = embedSrc;
  if (label) label.textContent = title || '';
  wrap.style.display = '';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeFepPlayer() {
  const frame = document.getElementById('fep-player-frame');
  if (frame) frame.src = '';
  document.getElementById('fep-player-wrap').style.display = 'none';
}
