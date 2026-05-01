/* phelim.me — podcast carousel */

// ═══ CAROUSEL ═══
let carActive=0,isDrag=false,_dragSetup=false;
function buildCarousel(){
  const track=document.getElementById('car-track');
  const dots=document.getElementById('car-dots');
  if(!track)return;
  const eps = window.EPS || [];
  track.innerHTML=eps.map((e,i)=>{
    // Extract IDs for inline playback
    const ytMatch  = e.youtube?.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{11})/);
    const ytId     = ytMatch ? ytMatch[1] : null;
    const spMatch  = e.spotify?.match(/episode\/([A-Za-z0-9]+)/);
    const spEmbed  = spMatch ? `https://open.spotify.com/embed/episode/${spMatch[1]}?utm_source=generator` : null;
    const safeTitle = (e.t||'').replace(/'/g,"\\'");

    // Primary action: play YouTube inline if available; else open externally
    const cardClick = ytId
      ? `onclick="if(typeof playYouTubeInline==='function')playYouTubeInline('${ytId}','${safeTitle}')"`
      : `onclick="window.open('${e.youtube||e.spotify||(window.SITE?.podcastYouTubeUrl||'#')}','_blank')"`;

    const watchBtn = ytId
      ? `<button class="cc-btn" onclick="event.stopPropagation();if(typeof playYouTubeInline==='function')playYouTubeInline('${ytId}','${safeTitle}')">&#9654; Watch here</button>`
      : `<button class="cc-btn" onclick="event.stopPropagation();window.open('${e.youtube||(window.SITE?.podcastYouTubeUrl||'#')}','_blank')">&#9654; YouTube ↗</button>`;
    const listenBtn = spEmbed
      ? `<button class="cc-btn outline" onclick="event.stopPropagation();if(typeof setSpotifyEmbed==='function')setSpotifyEmbed('${spEmbed}',null);else window.open('${e.spotify||'#'}','_blank')">&#9654; Spotify</button>`
      : `<button class="cc-btn outline" onclick="event.stopPropagation();window.open('${e.spotify||(window.SITE?.podcastSpotifyUrl||'#')}','_blank')">Listen ↗</button>`;

    return `<div class="car-card" ${cardClick}>
      <div class="cc-thumb" style="background:${e.bg}"><div class="cc-thumb-lbl">${e.t.split(' ').slice(0,5).join(' ')}…</div><div class="cc-play">&#9654;</div></div>
      <div class="cc-body">
        <div class="cc-title">${e.t}</div>
        <p class="cc-desc">${e.d||''}</p>
        <div class="cc-actions">${watchBtn}${listenBtn}</div>
      </div>
    </div>`;
  }).join('');
  if(dots)dots.innerHTML=eps.map((_,i)=>`<div class="car-dot${i===0?' active':''}"></div>`).join('');
  setupDrag();scrollCar();
}
function carMove(dir){
  const track=document.getElementById('car-track');if(!track)return;
  const eps = window.EPS || [];
  const cardW=296;
  const cur=parseFloat(track.style.transform?.replace('translateX(',''))||0;
  const newT=Math.min(0,Math.max(-(eps.length-3)*cardW,cur+(dir<0?cardW:-cardW)));
  track.style.transform=`translateX(${newT}px)`;
}
function scrollCar(){
  const track=document.getElementById('car-track');if(!track)return;
  const cards=track.querySelectorAll('.car-card');if(!cards[carActive])return;
  const oRect=track.parentElement.getBoundingClientRect();
  const cRect=cards[carActive].getBoundingClientRect();
  const curT=parseFloat(track.style.transform?.replace('translateX(',''))||0;
  track.style.transform=`translateX(${Math.min(0,curT-(cRect.left-oRect.left)+40)}px)`;
}
function setupDrag(){
  const track=document.getElementById('car-track');if(!track||_dragSetup)return;_dragSetup=true;
  let sX=0,sT=0;
  track.addEventListener('mousedown',e=>{isDrag=false;sX=e.clientX;sT=parseFloat(track.style.transform?.replace('translateX(',''))||0;track.classList.add('dragging');document.addEventListener('mousemove',onM);document.addEventListener('mouseup',onU);});
  function onM(e){const dx=e.clientX-sX;if(Math.abs(dx)>5)isDrag=true;if(isDrag)track.style.transform=`translateX(${sT+dx}px)`;}
  function onU(e){track.classList.remove('dragging');document.removeEventListener('mousemove',onM);document.removeEventListener('mouseup',onU);if(isDrag){const dx=e.clientX-sX;if(Math.abs(dx)>60)carMove(dx<0?1:-1);setTimeout(()=>isDrag=false,50);}};
  track.addEventListener('touchstart',e=>{sX=e.touches[0].clientX;sT=parseFloat(track.style.transform?.replace('translateX(',''))||0;isDrag=false;},{passive:true});
  track.addEventListener('touchmove',e=>{const dx=e.touches[0].clientX-sX;if(Math.abs(dx)>5)isDrag=true;if(isDrag)track.style.transform=`translateX(${sT+dx}px)`;},{passive:true});
  track.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sX;if(Math.abs(dx)>60)carMove(dx<0?1:-1);setTimeout(()=>isDrag=false,50);});
}
