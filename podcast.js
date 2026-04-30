/* phelim.me — podcast carousel */

// ═══ CAROUSEL ═══
let carActive=0,isDrag=false,_dragSetup=false;
function buildCarousel(){
  const track=document.getElementById('car-track');
  const dots=document.getElementById('car-dots');
  if(!track)return;
  const eps = window.EPS || [];
  track.innerHTML=eps.map((e,i)=>`
    <div class="car-card">
      <div class="cc-thumb" style="background:${e.bg}"><div class="cc-thumb-lbl">Ep. ${e.n}</div><div class="cc-play">&#9654;</div></div>
      <div class="cc-body">
        <div class="cc-num">Episode ${e.n}</div>
        <div class="cc-title">${e.t}</div>
        <p class="cc-desc">${e.d}</p>
        <div class="cc-actions">
          ${e.youtube ? `<button class="cc-btn" onclick="window.open('${e.youtube}','_blank')">&#9654; Watch</button>` : `<button class="cc-btn" onclick="window.open('https://youtube.com/playlist?list=PL9fKbOngNj6Ac9wdzaJjxbDua3ZVe4270','_blank')">&#9654; Watch</button>`}
          ${e.spotify ? `<button class="cc-btn outline" onclick="window.open('${e.spotify}','_blank')">Listen</button>` : `<button class="cc-btn outline" onclick="window.open('https://open.spotify.com/show/6yUjD35JA5VRfHzHw2gCX9','_blank')">Listen</button>`}
        </div>
      </div>
    </div>`).join('');
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
