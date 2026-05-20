/* phelim.me — Podcast Page JS */

document.addEventListener('DOMContentLoaded', () => {
  loadEpisodes();
  setupCarousels();
});

function togglePillars() {
  const strip = document.querySelector('.pod-pillars-strip');
  const content = document.getElementById('pod-pillars-content');
  if (!strip || !content) return;

  const isOpen = strip.classList.toggle('open');
  content.style.display = isOpen ? 'block' : 'none';
}

async function loadEpisodes() {
  try {
    const response = await fetch('/api/db?table=episodes');
    const episodes = await response.json();

    const recommended = episodes.filter(e => e.is_recommended);
    const featured = episodes.filter(e => e.featured);

    if (recommended.length) {
      populateRecommended(recommended);
    }

    if (featured.length) {
      populateFeatured(featured);
    }

    if (episodes.length) {
      populateFullArchiveCarousel(episodes);
    }
  } catch (error) {
    console.error('Error loading episodes:', error);
  }
}

function populateRecommended(episodes) {
  const list = document.getElementById('rec-ep-list');
  if (!list) return;

  list.innerHTML = episodes.map(e => {
    const spMatch = e.spotify_url?.match(/episode\/([A-Za-z0-9]+)/);
    const spEmbed = spMatch ? `https://open.spotify.com/embed/episode/${spMatch[1]}?utm_source=generator` : null;
    const safeTitle = (e.title || '').replace(/'/g, "\\'");
    const platform = e.youtube_url ? 'YouTube' : e.spotify_url ? 'Spotify' : '';

    return `<div class="rec-ep-row" onclick="setRecommendedPlayer('${spEmbed || e.youtube_url}', '${safeTitle}', '${platform}', this)">
        <div class="rec-ep-thumb" style="background-image: url('${e.thumbnail_url || ''}'); background-color: ${e.bg_color || '#000'};"></div>
        <div class="rec-ep-info">
            <div class="rec-ep-title">${e.title}</div>
            <div class="rec-ep-platform">${platform}</div>
        </div>
      </div>`;
  }).join('');
  
  if (episodes.length) {
    const firstEp = episodes[0];
    const spMatch = firstEp.spotify_url?.match(/episode\/([A-Za-z0-9]+)/);
    const spEmbed = spMatch ? `https://open.spotify.com/embed/episode/${spMatch[1]}?utm_source=generator` : null;
    const platform = firstEp.youtube_url ? 'YouTube' : firstEp.spotify_url ? 'Spotify' : '';
    setRecommendedPlayer(spEmbed || firstEp.youtube_url, firstEp.title, platform, list.firstChild);
  }
}

function populateFeatured(episodes) {
  const carousel = document.getElementById('featured-episodes-carousel');
  if (!carousel) return;

  carousel.innerHTML = episodes.map(e => {
    const link = e.youtube_url || e.spotify_url || '#';
    return `<div class="fep-card" onclick="window.open('${link}', '_blank')">
        <div class="fep-thumb" style="background-image: url('${e.thumbnail_url || ''}'); background-color: ${e.bg_color || '#000'};">
          <div class="fep-play">&#9654;</div>
        </div>
        <div class="fep-card-body">
          <div class="fep-num">Episode ${e.number}</div>
          <div class="fep-title">${e.title}</div>
          <div class="fep-desc-clamp">${e.description || ''}</div>
        </div>
      </div>`;
  }).join('');
}

function populateFullArchiveCarousel(episodes) {
    const carousel = document.getElementById('full-archive-carousel');
    if (!carousel) return;

    carousel.innerHTML = episodes.slice(0, 10).map(e => {
        const ytMatch = e.youtube_url?.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : null;
        if (!ytId) return '';

        return `<div class="fep-card" onclick="playInArchivePlayer('${ytId}')">
            <div class="fep-thumb" style="background-image: url('https://i.ytimg.com/vi/${ytId}/hqdefault.jpg'); background-color: #000;">
              <div class="fep-play">&#9654;</div>
            </div>
            <div class="fep-card-body">
              <div class="fep-num">Episode ${e.number}</div>
              <div class="fep-title">${e.title}</div>
            </div>
          </div>`;
    }).join('');
}

function setRecommendedPlayer(src, title, platform, rowEl) {
  const frame = document.getElementById('rec-player-frame');
  const titleEl = document.getElementById('rec-player-title');
  const platformEl = document.getElementById('rec-player-platform');
  if (!frame || !titleEl || !platformEl) return;

  if (platform === 'YouTube') {
      const ytMatch = src.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{11})/);
      if(ytMatch) frame.src = `https://www.youtube.com/embed/${ytMatch[1]}`;
  } else {
      frame.src = src;
  }

  titleEl.textContent = title;
  platformEl.textContent = platform;

  document.querySelectorAll('.rec-ep-row').forEach(r => r.classList.remove('rec-ep-active'));
  if (rowEl) rowEl.classList.add('rec-ep-active');
}

function playInArchivePlayer(videoId) {
    const frame = document.getElementById('full-archive-player');
    if(frame) {
        frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function setupCarousels() {
    const archiveCarousel = document.getElementById('full-archive-carousel');
    if (archiveCarousel) {
        const prevBtn = document.getElementById('archive-prev');
        const nextBtn = document.getElementById('archive-next');
        const dotsContainer = document.getElementById('archive-dots');
        let cardWidth = 316; // card width + gap

        const updateDots = () => {
            if (!dotsContainer) return;
            const page = Math.round(archiveCarousel.scrollLeft / cardWidth);
            const dots = dotsContainer.children;
            for (let i = 0; i < dots.length; i++) {
                dots[i].classList.toggle('active', i === page);
            }
        }

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                archiveCarousel.scrollBy({ left: -cardWidth, behavior: 'smooth' });
            });
            nextBtn.addEventListener('click', () => {
                archiveCarousel.scrollBy({ left: cardWidth, behavior: 'smooth' });
            });
        }
        
        if (dotsContainer) {
          const numCards = archiveCarousel.children.length;
          for (let i = 0; i < numCards; i++) {
              const dot = document.createElement('div');
              dot.classList.add('car-dot');
              dot.addEventListener('click', () => {
                  archiveCarousel.scrollTo({ left: i * cardWidth, behavior: 'smooth' })
              });
              dotsContainer.appendChild(dot);
          }
          archiveCarousel.addEventListener('scroll', updateDots);
          updateDots();
        }
    }
}
