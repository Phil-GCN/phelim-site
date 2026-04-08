/* phelim.me — navigation: mobile menu, shared utilities */

function toggleMenu() {
  const m = document.getElementById('mob-menu');
  m.style.display = m.style.display === 'block' ? 'none' : 'block';
}
function closeMenu() {
  document.getElementById('mob-menu').style.display = 'none';
}

// Close mobile menu on outside click
document.addEventListener('click', function(e) {
  const menu = document.getElementById('mob-menu');
  const ham = document.querySelector('.ham');
  if (menu && menu.style.display === 'block' && !menu.contains(e.target) && !ham.contains(e.target)) {
    closeMenu();
  }
});

// Highlight active nav link based on current page
(function() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const map = {
    'index.html': 'nl-home',
    'about.html': 'nl-about',
    'podcast.html': 'nl-podcast',
    'engagements.html': 'nl-eng',
    'resources.html': 'nl-resources',
  };
  const id = map[page];
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active-link');
  }
})();
