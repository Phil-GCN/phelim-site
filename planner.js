/* phelim.me — wealth planner calculator */

// ═══ PLANNER ═══
const FX={XAF:.00153,NGN:.00062,GHS:.067,KES:.0071,ZAR:.051,USD:.93};
const SYM={EUR:'€',GBP:'£',USD:'$',CHF:'CHF '};
function fmt(n,s){return(s||'')+(Math.round(n)||0).toLocaleString();}
function calc(){
  const sym=SYM[document.getElementById('pi-cur')?.value]||'€';
  const gross=+document.getElementById('pi-gross')?.value||0;
  const exp=+document.getElementById('pi-exp')?.value||0;
  const rate=+document.getElementById('pi-rate')?.value||0;
  const goal=+document.getElementById('pi-goal')?.value||1;
  const months=Math.min(+document.getElementById('pi-months')?.value||0,12);
  const rLoc=+document.getElementById('pi-remit')?.value||0;
  const rCur=document.getElementById('pi-remcur')?.value;
  const rPri=rLoc*(FX[rCur]||.001);
  const sav=gross*(rate/100);
  const disp=gross-exp-rPri;
  const saved=sav*months;
  const prog=Math.min(Math.round((saved/goal)*100),100);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('r-savings',fmt(sav,sym));set('r-disp',fmt(disp,sym));set('r-prog',prog+'%');
  set('r-prog-sub',fmt(saved,sym)+' of '+fmt(goal,sym));
  set('r-remit','≈ '+fmt(rPri,sym));
  set('r-remit-sub',Math.round(rLoc).toLocaleString()+' '+rCur+' at approximate rate');
  const maxV=gross||1;
  const bD=[{l:'Income',v:gross,c:'var(--ink12)'},{l:'Expenses',v:exp,c:'var(--forest)'},{l:'Savings',v:sav,c:'var(--gold)'},{l:'Transfer',v:rPri,c:'var(--ink30)'},{l:'Other',v:Math.max(0,disp-sav),c:'var(--paper-dark)'}];
  const bars=document.getElementById('planner-bars');
  if(bars)bars.innerHTML=bD.map(b=>`<div class="bar-col"><div class="bar-fill" style="height:${Math.max(2,(b.v/maxV)*115)}px;background:${b.c};border:1px solid var(--ink12);"></div><div class="bar-lbl">${b.l}</div></div>`).join('');
  const ae=+document.getElementById('pi-emerg')?.value||0,ai=+document.getElementById('pi-invest')?.value||0,as_=+document.getElementById('pi-short')?.value||0;
  const alloc=document.getElementById('planner-alloc');
  if(alloc)alloc.innerHTML=[{n:'Emergency fund',p:ae},{n:'Long-term invest.',p:ai},{n:'Short-term savings',p:as_}].map(a=>`<div class="alloc-row"><div class="alloc-name">${a.n}</div><div class="alloc-bar-track"><div class="alloc-bar-fill" style="width:${Math.min(a.p,100)}%;"></div></div><div class="alloc-pct">${Math.round(a.p)}%</div><div class="alloc-amt">${fmt(sav*(a.p/100),sym)}</div></div>`).join('');
}
