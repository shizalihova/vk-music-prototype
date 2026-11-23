/* Логика прототипа: навигация, главная, плейлисты, «Микс на двоих», поиск и ассистент,
   плеер, темы оформления. Зависит от js/icons.js и js/data.js. */
{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ic=(n,f)=>`<i class="li${f?' f':''}">${ICONS[n]}</i>`;
const paint=(root=document)=>root.querySelectorAll('i[data-i]:not([data-p])').forEach(e=>{e.innerHTML=ICONS[e.dataset.i];e.dataset.p=1});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cv=h=>`background:linear-gradient(135deg,hsl(${h} 85% 58%),hsl(${(h+40)%360} 75% 30%))`;
const avBg=h=>`background:linear-gradient(135deg,hsl(${h} 80% 58%),hsl(${(h+30)%360} 75% 42%))`;
const wave=(k,w=390,n=26)=>{let s='';for(let i=0;i<n;i++)s+=`<i style="--x:${(-(i*w/n)+Math.sin(i*.9)*22).toFixed(1)}px;--d:${(-i*.33).toFixed(2)}s"></i>`;return`<div class="wave ${k}" style="--w:${w}px">${s}</div>`};
const plural=(n,f)=>{const a=n%10,b=n%100;return n+' '+(a==1&&b!=11?f[0]:a>=2&&a<=4&&(b<10||b>=20)?f[1]:f[2])},TRW=['трек','трека','треков'];
const sec=s=>{const[m,x]=s.split(':');return +m*60+ +x},fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');

const S={section:'home',stack:['main'],theme:'system',wave:'blue',liked:new Set(['z1','k1','sp','m1','np']),found:[],blends:[],blend:null,
  q:[],qi:0,src:'VK Микс',srcKey:'vkmix',cur:null,playing:false,p:0,shuffle:false,repeat:false,
  notifs:[{id:1,ic:'users',bg:'linear-gradient(135deg,#0077ff,#f45fff)',t:'Аня предлагает собрать Микс на двоих',s:'Совпадение вкусов 78% · 2 мин назад',a:'blend-with:0',u:1},
          {id:2,ic:'utensils-crossed',bg:'#c56a1f',t:'Ищете песню из сериала? Спросите ассистента',s:'Например, что играло в «Кухне» · вчера',a:'demo:kitchen',u:1},
          {id:3,ic:'mic',bg:'hsl(265 70% 50%)',t:'Новый выпуск «Разговоров о звуке»',s:'Выпуск 12. Как звучит город · вчера',a:'open:pod1',u:1}],
  prefs:{mix:false,ai:false,privacy:true},optinHidden:false,mixset:{act:'Работаю',char:'Любимое',mood:'Спокойное'}};
L.mine.tr=()=>[...S.liked];L.liked.tr=()=>[...S.liked];L.found.tr=()=>S.found;
const listTracks=k=>{const l=L[k];const t=typeof l.tr=='function'?l.tr():l.tr;return t||[]};

/* ---------- theme ---------- */
const mq=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(anim){const sc=$('#screen');const dark=S.theme=='dark'||(S.theme=='system'&&mq.matches);
  if(anim){sc.classList.add('tt');setTimeout(()=>sc.classList.remove('tt'),450)}sc.classList.toggle('light',!dark);const tb=$('#thBtn');if(tb)tb.innerHTML=ic(S.theme=='light'?'sun':S.theme=='dark'?'moon':'monitor-smartphone')}
try{S.theme=localStorage.getItem('vkm-theme')||'system';S.wave=localStorage.getItem('vkm-wave')||'blue'}catch(e){}
mq.addEventListener?.('change',()=>{if(S.theme=='system'){applyTheme(true);if(top()=='settings')renderSettings();if($('#sheet').classList.contains('on'))themeSheet()}});
const save=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};

/* ---------- navigation ---------- */
const top=()=>S.stack[S.stack.length-1];
const RENDER={pl:()=>renderPl(),blend:()=>renderBlend(),notif:()=>renderNotif(),settings:()=>renderSettings(),ai:()=>{}};
function layout(){S.stack.forEach((id,i)=>{const el=$('#'+id);el.classList.remove('push');el.classList.toggle('under',i<S.stack.length-1);el.style.zIndex=i+1});
  ['pl','blend','ai','notif','settings'].forEach(id=>{if(!S.stack.includes(id)){const el=$('#'+id);el.classList.add('push');el.classList.remove('under');el.style.zIndex=S.stack.length+1}});
  $('#screen').classList.toggle('on-ai',top()=='ai'&&S.smode=='ai');syncStatus()}
function push(id){if(S.stack.includes(id)){S.stack=S.stack.slice(0,S.stack.indexOf(id)+1)}else S.stack.push(id);RENDER[id]?.();$('#'+id).scrollTop=0;layout();paint()}
function back(){if(S.stack.length>1){S.stack.pop();layout();const t=top();if(t=='main')renderSection();else RENDER[t]?.();paint()}}
function syncStatus(){const t=top();let w=$('#player').classList.contains('on')||$('#merge').classList.contains('on');
  if(!w&&t=='main'&&S.section=='home'&&!$('#hdr').classList.contains('solid'))w=true;
  if(!w&&t=='blend'&&$('#blend').scrollTop<220)w=true;
  $('#screen').classList.toggle('stw',w)}

/* ---------- sections ---------- */
const trackRow=(id,key,i,extra='')=>{const t=TR[id];const cur=S.cur&&S.cur.id==id&&S.srcKey==key;
  return`<div class="tr${cur?' cur':''}" data-act="play:${key}:${i}" role="button" tabindex="0"><div class="cv" style="${cv(t.h)}">${t.ic?ic(t.ic):''}</div><div class="tx"><b>${cur&&S.playing?'<span class="eq"><i></i><i></i><i></i></span>':''}${esc(t.t)}</b><small>${esc(t.a)}</small></div>${extra}<button class="ib" data-act="more:${id}:${key}" aria-label="Действия: ${esc(t.t)}">${ic('ellipsis')}</button></div>`};
const card=(k,round)=>{const l=L[k];return`<div class="card" data-act="open:${k}" role="button" tabindex="0"><div class="cv" style="${cv(l.h)}${round?';border-radius:50%':''}">${l.ic?ic(l.ic):''}</div>${l.t}<small>${l.s}</small></div>`};
function heroSlide(kind){const vk=kind==L.vkmix.w||kind=='blue';const key=kind=='blue'?'vkmix':'mine';const l=L[key];const playing=S.playing&&S.srcKey==key;
  return`<div class="slide" id="sl-${key}">${wave(kind)}<div class="slide-c">
    <button class="bigplay" data-act="hero:${key}" aria-label="${playing?'Пауза':'Слушать'} ${l.t}">${ic(playing?'pause':'play',1)}</button>
    <h3>Слушать ${key=='vkmix'?'VK Микс':'мои треки'}</h3><p>${key=='vkmix'?'Музыкальные рекомендации для вас':'Любимые треки из вашей коллекции'}</p>
    ${key=='vkmix'?`<button class="glass" data-act="mixset">${ic('sliders-horizontal')}Настроить</button>`:`<button class="glass" data-act="hero-shuffle">${ic('shuffle')}Перемешать</button>`}
  </div></div>`}
function renderSection(){const s=S.section;let h='';const keepX=$('#slides')?.scrollLeft||0;
  $$('#pills button').forEach(b=>b.classList.toggle('on',b.dataset.act=='tab:'+s));
  if(s=='home'){const order=S.wave=='blue'?['blue','pink']:['pink','blue'];
    const other=order[1]=='pink'?'свои треки':'VK Микс';
    const b=S.blends[0];
    h=`<div class="hero"><div class="slides scroll" id="slides">${order.map(heroSlide).join('')}</div>
      <div class="swipe"><button data-act="hero-swipe">${ic('chevron-left')}<span id="swipeTx">Проведите, чтобы включить ${other}</span>${ic('chevron-right')}</button></div></div>
    <div class="pad">
      <div class="sec-h"><div><small><span class="vkbadge"></span>НОВОЕ В VK МУЗЫКЕ</small><h4>Микс на двоих</h4></div></div>
      <div class="promo" data-act="${b?'open-blend:0':'blend-start'}" role="button" tabindex="0"><div class="wv">${wave('mix',124,8)}</div><div class="pc">
        ${b?`<span class="new">Обновлён сегодня</span><h5>Вы и ${b.f.s}</h5><p>${plural(b.tracks.length,TRW)}, из них 2 новых для вас обоих. Совпадение ${b.f.m}%</p><button class="btn" data-act="play-blend">${ic('play',1)}Слушать</button>`
           :`<span class="new">Новое</span><h5>Смешайте вкусы с другом</h5><p>Общий плейлист, который каждый день собирается из музыки вас обоих</p><button class="btn" data-act="blend-start">Собрать микс</button>`}
        <div class="avs"><span>${FR.slice(0,3).map(f=>`<i class="av" style="${avBg(f.h)}">${f.i}</i>`).join('')}</span>14 друзей уже собрали</div></div></div>
      <div class="sec-h"><h4>Настроения и занятия</h4></div>
      <div class="moods scroll">${MOODS.map(([k,t,c,d])=>`<button class="mood${d?' dk':''}" style="background:${c}" data-act="open:${k}">${ic('play',1)}<span>${t}</span></button>`).join('')}</div>
      <div class="sec-h"><div><small>ИИ-АССИСТЕНТ</small><h4>Что это за песня?</h4></div></div>
      <div class="ask" data-act="demo:kitchen" role="button" tabindex="0"><div class="orbit">${wave('mix',56,6)}</div><div style="flex:1"><b>Найду трек из сериала по сцене</b><small>«Что играло в „Кухне“, когда разбили посуду?»</small></div>${ic('chevron-right')}</div>
      <div class="sec-h"><div><small><span class="vkbadge"></span>ТОЛЬКО В VK МУЗЫКЕ</small><h4>Слушайте друг друга</h4></div><button class="ib" data-act="tab:browse" aria-label="Все подборки">${ic('chevron-right')}</button></div>
      <div class="ldd scroll">${[['ld1',97,'linear-gradient(135deg,#0f5c4a,#0b3b31)','Даша К.',165],['ld2',93,'linear-gradient(135deg,#3b3570,#241f4a)','Игорь П.',250]].map(([k,p,bg,o,hh])=>`<div class="ldc" style="background:${bg}" data-act="open:${k}" role="button" tabindex="0"><div class="pct">${p}% <small>· совпадение с вашим вкусом</small></div><h6>${L[k].t}</h6><div class="row"><div class="own"><i class="av" style="width:24px;height:24px;font-size:11px;${avBg(hh)}">${o[0]}</i>${o}</div><button class="pl" data-act="playlist:${k}" aria-label="Слушать ${L[k].t}">${ic('play',1)}</button></div></div>`).join('')}</div>
      <div class="sec-h"><h4>Собрано для вас</h4></div>
      <div class="shelf scroll">${['ed1','ed2','ed3','ed4'].map(k=>card(k)).join('')}</div>
      <div class="sec-h"><h4>Недавно слушали</h4></div>
      ${['sp2','m1','k2'].map((id,i)=>trackRow(id,'recent',i)).join('')}
    </div>`}
  else if(s=='my'){const lk=[...S.liked];
    h=`<div class="pad"><div class="tiles" style="margin-top:8px">
      <div class="tile" data-act="open:liked" role="button" tabindex="0">${ic('heart')}<div><b>Мне нравится</b><small>${plural(lk.length,TRW)}</small></div></div>
      <div class="tile" data-act="${S.blends.length?'open-blend:0':'blend-start'}" role="button" tabindex="0">${ic('users')}<div><b>Миксы на двоих</b><small>${S.blends.length?plural(S.blends.length,['микс','микса','миксов']):'Пока нет'}</small></div></div>
      <div class="tile" data-act="open:found" role="button" tabindex="0">${ic('sparkles')}<div><b>Найдено</b><small>${S.found.length} от ассистента</small></div></div>
      <div class="tile" data-act="toast:Скачанные треки доступны без интернета" role="button" tabindex="0">${ic('download')}<div><b>Скачанное</b><small>Без интернета</small></div></div></div>
      <div class="sec-h"><h4>Миксы на двоих</h4></div>
      ${S.blends.length?S.blends.map((b,i)=>`<div class="tr" data-act="open-blend:${i}" role="button" tabindex="0"><div class="cv" style="border-radius:12px;width:48px;height:48px;position:relative;overflow:hidden">${wave('mix',48,5)}</div><div class="tx"><b>Вы и ${b.f.s}</b><small>Совпадение ${b.f.m}% · обновлён сегодня</small></div>${ic('chevron-right')}</div>`).join('')
        :`<div class="empty"><b>Пока нет общих миксов</b>Выберите друга, и мы смешаем ваши вкусы в один плейлист<div style="margin-top:12px"><button class="btn" data-act="blend-start">Собрать первый микс</button></div></div>`}
      <div class="sec-h"><h4>Плейлисты</h4><button class="ib" data-act="toast:Создание плейлиста появится в следующей версии прототипа" aria-label="Создать плейлист">${ic('plus')}</button></div>
      ${['my1','my2','my3'].map(k=>`<div class="tr" data-act="open:${k}" role="button" tabindex="0"><div class="cv" style="${cv(L[k].h)}"></div><div class="tx"><b>${L[k].t}</b><small>${L[k].s}</small></div>${ic('chevron-right')}</div>`).join('')}
      <div class="sec-h"><h4>Треки</h4><button class="ib" data-act="playlist:liked" aria-label="Слушать все">${ic('play',1)}</button></div>
      ${lk.length?lk.map((id,i)=>trackRow(id,'liked',i)).join(''):'<div class="empty"><b>Здесь будут ваши треки</b>Нажмите на сердечко у любого трека</div>'}</div>`}
  else if(s=='books'){
    h=`<div class="pad"><div class="sec-h"><h4>Подкасты</h4></div><div class="shelf scroll">${card('pod1')}${card('pod2')}</div>
      <div class="sec-h"><h4>Аудиокниги</h4></div><div class="shelf scroll">${card('bk1')}${card('bk2')}</div>
      <div class="sec-h"><h4>Новые выпуски</h4></div>${['e0','r0','e1'].map((id,i)=>trackRow(id,id[0]=='e'?'pod1':'pod2',id[0]=='e'?+id[1]:0)).join('')}</div>`}
  else{h=`<div class="pad"><div class="sec-h"><h4>Чарт недели</h4><button class="ib" data-act="open:chart" aria-label="Весь чарт">${ic('chevron-right')}</button></div>
      ${listTracks('chart').slice(0,4).map((id,i)=>trackRow(id,'chart',i)).join('')}
      <div class="sec-h"><h4>Жанры</h4></div>
      <div class="tiles">${['rock','pop','hip','indie','alt','ed4'].map(k=>`<button class="genre" style="${cv(L[k].h)}" data-act="open:${k}"><span>${L[k].t}</span></button>`).join('')}</div>
      <div class="sec-h"><h4>Слушайте друг друга</h4></div><div class="shelf scroll">${card('ld1')}${card('ld2')}</div></div>`}
  $('#sec').innerHTML=h;if($('#slides'))$('#slides').scrollLeft=keepX;
  const hdr=$('#hdr');hdr.classList.toggle('solid',s!='home'||$('#main').scrollTop>360);
  const sl=$('#slides');if(sl)sl.onscroll=()=>{const i=Math.round(sl.scrollLeft/sl.clientWidth);const tx=$('#swipeTx');if(tx)tx.textContent='Проведите, чтобы включить '+((i==0)==(S.wave=='blue')?'свои треки':'VK Микс')};
  syncStatus();paint()}
$('#main').addEventListener('scroll',()=>{const solid=S.section!='home'||$('#main').scrollTop>360;$('#hdr').classList.toggle('solid',solid);syncStatus()},{passive:true});

/* ---------- playlist page ---------- */
let PLK='vkmix';
function renderPl(){const l=L[PLK],tr=listTracks(PLK),liked=S.plLiked?.has(PLK);
  $('#pl').innerHTML=`<div class="topbar"><button class="ib" data-act="back" aria-label="Назад">${ic('chevron-left')}</button><h3>${l.t}</h3><button class="ib" data-act="share:${PLK}" aria-label="Поделиться">${ic('send')}</button></div>
  <div class="plh"><div class="cv" style="${cv(l.h)}">${ic(l.ic||'audio-lines')}</div><h2>${l.t}</h2><p>${l.s||''}${l.s?' · ':''}${plural(tr.length,TRW)}</p></div>
  <div class="acts"><button class="rnd" data-act="playlist-shuffle:${PLK}" aria-label="Перемешать">${ic('shuffle')}</button><button class="btn" data-act="playlist:${PLK}" ${tr.length?'':'disabled style="opacity:.4"'}>${ic('play',1)}Слушать</button><button class="rnd${liked?' on':''}" data-act="pl-like:${PLK}" aria-label="Добавить в коллекцию">${ic('heart')}</button></div>
  <div class="pad">${tr.length?tr.map((id,i)=>trackRow(id,PLK,i)).join(''):`<div class="empty" style="margin-top:12px"><b>Пока пусто</b>${PLK=='found'?'Спросите ассистента, и найденные треки появятся здесь<div style="margin-top:12px"><button class="btn" data-act="assistant">Открыть ассистента</button></div>':'Отметьте треки сердечком'}</div>`}</div>`}

/* ---------- blend ---------- */
const owner=o=>{const me=`<i class="av" style="${avBg(210)}">Я</i>`,her=`<i class="av" style="${avBg(S.blend.f.h)}">${S.blend.f.i}</i>`;
  return o=='new'?'<span class="tag">Новое</span>':`<span class="who">${o=='me'?me:o=='her'?her:me+her}</span>`};
function blendList(){const b=S.blend;let t=b.tracks.slice();
  if(b.mode!='eq'){const pr=b.mode=='me'?['both','me','new','her']:['both','her','new','me'];t.sort((x,y)=>pr.indexOf(x[1])-pr.indexOf(y[1]));const drop=b.mode=='me'?'her':'me';let c=0;t=t.filter(x=>!(x[1]==drop&&++c>1))}
  return t}
function renderBlend(){const b=S.blend,f=b.f,list=blendList();L.blend={t:'Вы и '+f.s,s:'Микс на двоих',h:290,tr:list.map(x=>x[0])};
  const c={me:0,her:0,x:0};list.forEach(x=>x[1]=='me'?c.me++:x[1]=='her'?c.her++:c.x++);
  $('#blend').innerHTML=`<div class="topbar clear" id="btop"><button class="ib" data-act="back" aria-label="Назад">${ic('chevron-left')}</button><h3>Вы и ${f.s}</h3><button class="ib" data-act="blend-more" aria-label="Ещё">${ic('ellipsis')}</button></div>
  <div class="bh">${wave('mix')}<div class="bc"><div class="pair"><i class="av" style="${avBg(210)}">Я</i><i class="av" style="${avBg(f.h)}">${f.i}</i></div>
    <h2>Вы и ${f.s}</h2><div class="match">Совпадение вкусов <b>${f.m}%</b></div></div></div>
  <div class="pad"><div class="common" style="margin-top:0">${f.c.map(a=>`<span>${a}</span>`).join('')}</div>
    <div class="acts"><button class="rnd${b.saved?' on':''}" data-act="blend-save" aria-label="Сохранить в коллекцию">${ic('heart')}</button><button class="btn" data-act="play-blend">${ic('play',1)}Слушать</button><button class="rnd" data-act="blend-share" aria-label="Отправить ${f.g}">${ic('send')}</button></div>
    <div class="meta"><span>${ic('repeat')}Обновится завтра в 6:00</span><span>${ic('audio-lines')}Слушаете вместе 3 дня подряд</span></div>
    ${S.prefs.mix||S.optinHidden?'':`<div class="optin"><b>Сообщать, когда микс обновится?</b><p>Одно уведомление в день, когда появятся новые треки. Можно выключить в настройках.</p><div class="two"><button class="btn sec" data-act="optin:no">Не сейчас</button><button class="btn" data-act="optin:yes">Включить</button></div></div>`}
    <div class="seg" id="seg"><span class="knob" style="transform:translateX(${['me','eq','her'].indexOf(b.mode)*100}%)"></span>${[['me','Больше моего'],['eq','Поровну'],['her','Больше '+f.gen]].map(([m,t])=>`<button data-act="mode:${m}" class="${b.mode==m?'on':''}">${t}</button>`).join('')}</div>
    <div class="ratio"><i class="r1" style="flex:${c.me}"></i><i class="r3" style="flex:${c.x}"></i><i class="r2" style="flex:${c.her}"></i></div>
    <div class="legend"><span>Ваше</span><span>Общее и новое</span><span>${f.s}</span></div>
    ${list.map((x,i)=>trackRow(x[0],'blend',i,owner(x[1]))).join('')}
    <button class="danger" data-act="blend-delete">Удалить микс</button></div>`;
  $('#blend').onscroll=()=>{$('#btop')?.classList.toggle('solid',$('#blend').scrollTop>220);syncStatus()};paint()}
function makeBlend(f){let b=S.blends.find(x=>x.f==f);if(!b){b={f,tracks:BLEND_T.map(x=>x.slice()),mode:'eq',saved:false};S.blends.unshift(b)}S.blend=b;return b}
const msubs=['Смешиваем вкусы…','Ищем общих артистов','Подбираем новое для вас обоих'];
function startMerge(f){closeSheet();const m=$('#merge');$('#mw1').innerHTML=wave('blue',150,10);$('#mw2').innerHTML=wave('pink',150,10);$('#mw3').innerHTML=wave('mix',210,12);
  m.classList.remove('go');void m.offsetWidth;m.classList.add('on','go');syncStatus();const t0=performance.now();
  const tick=now=>{const k=Math.min(1,(now-t0)/2600);$('#mNum').textContent=Math.round(f.m*(1-(1-k)**3))+'%';$('#mSub').textContent=msubs[Math.min(2,Math.floor(k*3))];
    if(k<1)requestAnimationFrame(tick);else setTimeout(()=>{makeBlend(f);push('blend');m.classList.remove('on');syncStatus();if(top()=='blend'||S.stack.includes('main'))renderSection()},600)};
  requestAnimationFrame(tick)}

/* ---------- notifications & settings ---------- */
function renderNotif(){$('#notif').innerHTML=`<div class="topbar"><button class="ib" data-act="back" aria-label="Назад">${ic('chevron-left')}</button><h3>Уведомления</h3><span class="ib"></span></div>
  <div class="pad">${S.notifs.map(n=>`<div class="nt" data-act="${n.a}" role="button" tabindex="0"><span class="ic" style="background:${n.bg}">${ic(n.ic)}</span><div class="tx"><b>${n.t}</b><small>${n.s}</small></div>${n.u?'<span class="un" aria-label="Новое"></span>':''}</div>`).join('')}
  <p class="demo">Уведомления о миксах приходят, только если вы включили их сами.</p></div>`;
  setTimeout(()=>{S.notifs.forEach(n=>n.u=0);updBadge()},900)}
const updBadge=()=>{const n=S.notifs.filter(x=>x.u).length;const b=$('#badge');b.textContent=n;b.style.display=n?'':'none'};
const themeCards=()=>`<div class="themes">${[['light','Дневная','<span class="l"></span>'],['dark','Ночная','<span class="d"></span>'],['system','Системная','<span class="l"></span><span class="d"></span>']].map(([k,t,pv])=>`<button class="th${S.theme==k?' on':''}" data-act="theme:${k}" aria-pressed="${S.theme==k}"><div class="pv">${pv}</div>${t}</button>`).join('')}</div>
  <p class="demo">Системная тема следует настройкам телефона, сейчас ${mq.matches?'тёмная':'светлая'}.</p>`;
function themeSheet(){openSheet(`<h3>Оформление</h3><p>Как будет выглядеть VK Музыка</p>${themeCards()}<button class="act" data-act="sheet-settings" style="margin-top:6px">${ic('settings')}Все настройки</button>`)}
function renderSettings(){const sys=mq.matches?'тёмная':'светлая';
  $('#settings').innerHTML=`<div class="topbar"><button class="ib" data-act="back" aria-label="Назад">${ic('chevron-left')}</button><h3>Настройки</h3><span class="ib"></span></div>
  <div class="pad"><div class="row" style="border:0"><span class="me" style="width:56px;height:56px;font-size:20px">Я</span><div class="tx"><b style="font-size:18px">Ваш профиль</b><small>Подписка VK Музыка активна</small></div></div>
  <div class="grp">Оформление</div>
  ${themeCards()}
  <div class="grp">Волна на главной</div>
  <div class="waves">${[['blue','Синяя<small>VK Микс</small>'],['pink','Розовая<small>Мои треки</small>']].map(([k,t])=>`<button class="wv-opt${S.wave==k?' on':''}" data-act="wave:${k}" aria-pressed="${S.wave==k}">${wave(k,170,10)}<span>${t}</span></button>`).join('')}</div>
  <div class="grp">Уведомления</div>
  ${[['mix','Обновления миксов на двоих','Раз в день, когда появятся новые треки'],['ai','Находки ассистента','Когда найдём песню, которую вы искали']].map(([k,t,s])=>`<div class="row"><div class="tx">${t}<small>${s}</small></div><button class="sw" role="switch" aria-checked="${S.prefs[k]}" aria-label="${t}" data-act="pref:${k}"></button></div>`).join('')}
  <div class="grp">Приватность</div>
  <div class="row"><div class="tx">Показывать друзьям совпадение вкусов<small>Друзья видят только процент, а не историю прослушиваний</small></div><button class="sw" role="switch" aria-checked="${S.prefs.privacy}" aria-label="Показывать совпадение вкусов" data-act="pref:privacy"></button></div>
  <button class="danger" data-act="demo:reset">Сбросить прототип</button></div>`;paint()}

/* ---------- sheets & dialogs ---------- */
function openSheet(html){const sh=$('#sheet');sh.innerHTML='<div class="grab"></div>'+html;sh.classList.add('on');$('#dim').classList.add('on');paint(sh);sh.scrollTop=0}
function closeSheet(){$('#sheet').classList.remove('on');$('#dim').classList.remove('on');$('#dialog').classList.remove('on')}
function picker(q=''){const list=FR.map((f,i)=>({f,i})).filter(x=>x.f.n.toLowerCase().includes(q.toLowerCase()));
  return list.map(({f,i})=>`<button class="fr" data-act="friend:${i}"><i class="av" style="${avBg(f.h)}">${f.i}</i><span class="tx"><b>${f.n}</b><small>Слушает: ${f.r}</small></span><span class="pct">${f.m}%</span></button>`).join('')||'<p class="demo">Никого не нашли</p>'}
function openPicker(){openSheet(`<h3>С кем смешаем?</h3><p>Процент показывает, насколько похожи ваши вкусы</p>
  <label class="search">${ic('search')}<input id="fq" placeholder="Поиск по друзьям" autocomplete="off"></label><div id="frs">${picker()}</div>
  <button class="fr" data-act="invite"><i class="av" style="background:var(--s1);color:var(--link)">${ic('link')}</i><span class="tx"><b style="color:var(--link)">Пригласить по ссылке</b><small>Для друзей, которых ещё нет в VK Музыке</small></span></button>`);
  $('#fq').oninput=e=>{$('#frs').innerHTML=picker(e.target.value);paint($('#frs'))}}
function trackSheet(id,key){const t=TR[id],lk=S.liked.has(id);
  openSheet(`<div class="th1"><div class="cv" style="${cv(t.h)}">${t.ic?ic(t.ic):''}</div><div><b>${esc(t.t)}</b><div class="demo" style="margin:0">${esc(t.a)}</div></div></div>
  <button class="act" data-act="like:${id}">${ic('heart')}${lk?'Убрать из «Мне нравится»':'Добавить в «Мне нравится»'}</button>
  <button class="act" data-act="next-up:${id}">${ic('list-plus')}Слушать следующим</button>
  ${key=='blend'?`<button class="act" data-act="blend-remove:${id}">${ic('x')}Убрать из микса</button>`:`<button class="act" data-act="add-blend:${id}">${ic('users')}Добавить в Микс на двоих</button>`}
  <button class="act" data-act="where:${id}">${ic('clapperboard')}Где звучал этот трек</button>
  <button class="act" data-act="share-t:${id}">${ic('send')}Поделиться</button>`)}
function shareSheet(title,sub,kind){openSheet(`<h3>Поделиться</h3><div class="msgp"><div class="cvw">${wave(kind||'mix',56,6)}</div><div><b>${esc(title)}</b><small>${esc(sub)}</small></div></div>
  <button class="btn w" data-act="sent:Отправлено в Сообщения" style="margin-bottom:8px">${ic('send')}Отправить в Сообщения</button>
  <button class="btn sec w" data-act="sent:Открываем редактор историй" style="margin-bottom:8px">Поделиться в истории</button>
  <button class="btn sec w" data-act="copy">${ic('link')}Скопировать ссылку</button>`)}
function mixSheet(){const g=[['act','Занятие',['Просыпаюсь','В дороге','Работаю','Тренируюсь','Засыпаю']],['char','Характер',['Любимое','Незнакомое','Популярное']],['mood','Настроение',['Бодрое','Весёлое','Спокойное','Грустное']]];
  openSheet(`<h3>Настроить VK Микс</h3><p>Микс подстроится под то, чем вы заняты</p>${g.map(([k,t,o])=>`<b>${t}</b><div class="chipset">${o.map(x=>`<button data-act="mx:${k}:${x}" class="${S.mixset[k]==x?'on':''}" aria-pressed="${S.mixset[k]==x}">${x}</button>`).join('')}</div>`).join('')}
  <button class="btn w" data-act="mx-apply">Применить и слушать</button>`)}
function queueSheet(){openSheet(`<h3>Очередь</h3><p>${esc(S.src)}</p>${S.q.map((id,i)=>`<div class="tr${i==S.qi?' cur':''}" data-act="qjump:${i}" role="button" tabindex="0"><div class="cv" style="${cv(TR[id].h)}">${TR[id].ic?ic(TR[id].ic):''}</div><div class="tx"><b>${esc(TR[id].t)}</b><small>${esc(TR[id].a)}</small></div></div>`).join('')}`)}
let confirmFn=null;
function confirmBox(t,p,ok,fn){confirmFn=fn;const d=$('#dialog');d.innerHTML=`<h3>${t}</h3><p>${p}</p><div class="two"><button class="btn sec" data-act="close">Отмена</button><button class="btn red" data-act="confirm-ok">${ok}</button></div>`;
  d.classList.add('on');$('#dim').classList.add('on')}

/* ---------- player ---------- */
function setQueue(ids,i,src,key){S.q=ids.slice();S.qi=i;S.src=src;S.srcKey=key;S.cur=TR[S.q[i]];S.p=0;S.playing=true;drawPlayer();refreshLists()}
function playList(key,i=0,shuffle){let ids=listTracks(key);if(!ids.length){toast('В списке пока нет треков');return}
  if(shuffle){ids=ids.slice().sort(()=>Math.random()-.5);i=0}
  setQueue(ids,i,key=='blend'?`Микс на двоих · Вы и ${S.blend.f.s}`:L[key]?.t||'VK Музыка',key)}
function step(d){if(!S.q.length)return;let n=S.qi+d;if(S.shuffle&&d>0)n=Math.floor(Math.random()*S.q.length);
  if(n>=S.q.length){if(!S.repeat){S.playing=false;S.p=0;drawPlayer();return}n=0}if(n<0)n=S.q.length-1;S.qi=n;S.cur=TR[S.q[n]];S.p=0;S.playing=true;drawPlayer();refreshLists()}
function refreshLists(){const t=top();if(t=='main')renderSection();else if(t=='pl')renderPl();else if(t=='blend'){const st=$('#blend').scrollTop;renderBlend();$('#blend').scrollTop=st}else if(t=='ai'&&S.smode=='search')renderSearch()}
const WHY={both:'Вы оба часто слушаете этого артиста',me:'Из ваших любимых. Может понравиться и другу',her:'Нравится другу и похоже на то, что слушаете вы',new:'Новое для вас обоих, подобрано на стыке вкусов'};
function drawPlayer(){const t=S.cur;if(!t)return;
  $('#miniCv').style.cssText=cv(t.h);$('#miniCv').innerHTML=t.ic?ic(t.ic):'';
  $('#miniTx').innerHTML=`<b>${esc(t.t)}</b><small>${esc(t.a)}</small>`;
  $('#miniPP').innerHTML=ic(S.playing?'pause':'play',1);$('#miniPP').setAttribute('aria-label',S.playing?'Пауза':'Слушать');
  $('#pPP').innerHTML=ic(S.playing?'pause':'play',1);$('#pPP').setAttribute('aria-label',S.playing?'Пауза':'Слушать');
  $('#pArt').style.cssText=cv(t.h);$('#pArt').innerHTML=ic(t.ic||'audio-lines');
  $('#pT').textContent=t.t;$('#pA').textContent=t.a;$('#pDur').textContent=t.d;$('#pFrom').textContent=S.src;
  $('#player').style.background=`linear-gradient(180deg,hsl(${t.h} 60% 32%),hsl(${(t.h+40)%360} 50% 10%) 78%)`;
  $('#pLike').classList.toggle('on',S.liked.has(t.id));
  const bt=S.srcKey=='blend'&&S.blend?S.blend.tracks.find(x=>x[0]==t.id):null;const w=$('#pWhy');w.style.display=bt?'flex':'none';if(bt)w.innerHTML=owner(bt[1])+`<span>${WHY[bt[1]]}</span>`;
  $('#shuf').classList.toggle('on',S.shuffle);$('#rep').classList.toggle('on',S.repeat);prog()}
function prog(){const t=S.cur;if(!t)return;const pc=Math.min(100,S.p/sec(t.d)*100);$('#miniBar').style.width=pc+'%';$('#pBar').style.width=pc+'%';$('#pCur').textContent=fmt(S.p)}
setInterval(()=>{if(!S.playing||!S.cur)return;S.p++;if(S.p>=sec(S.cur.d))step(1);else prog()},1000);
$('#prog').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();const k=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));S.p=Math.floor(k*sec(S.cur.d));prog()});
const openPlayer=()=>{$('#player').classList.add('on');syncStatus()},closePlayer=()=>{$('#player').classList.remove('on');syncStatus()};

/* ---------- assistant ---------- */
const AQ=[];let busy=false;const msgs=$('#msgs'),aiPg=$('#ai');
const down=()=>aiPg.scrollTo({top:aiPg.scrollHeight,behavior:'smooth'});
const resRow=(id,q,k,c)=>{const t=TR[id];return`<div class="res"><div class="cv" style="${cv(t.h)}">${t.ic?ic(t.ic):''}</div><div class="tx"><b>${esc(t.t)}</b><small>${esc(t.a)}${c?` · совпадение <span class="conf">${c}%</span>`:''}</small></div><button class="go" data-act="aiplay:${q}:${k}" aria-label="Слушать ${esc(t.t)}">${ic('play',1)}</button></div>`};
const filmRow=f=>`<div class="res"><div class="cv" style="${cv(f.h)};height:68px;border-radius:8px">${ic('clapperboard')}</div><div class="tx"><b>${f.t}</b><small>${f.y} · ${f.n}</small></div><button class="vkv" data-act="vkvideo:${f.t}" aria-label="Смотреть «${f.t}» в VK Видео">${ic('tv')}Смотреть</button></div>`;
function addUser(html){$('#aiHome').style.display='none';const u=document.createElement('div');u.className='u'+(html.startsWith('<img')?' img':'');u.innerHTML=html;msgs.append(u)}
function addAgent(){const a=document.createElement('div');a.innerHTML=`<div class="who-ai"><span class="orbit">${wave('mix',24,4)}</span>Ассистент</div><div class="steps"></div>`;msgs.append(a);down();return a}
async function steps(a,list){const box=a.querySelector('.steps');for(const s of list){const st=document.createElement('div');st.className='st';st.innerHTML=`<span class="dt"></span>${s}`;box.append(st);down();await sleep(650);st.classList.add('done');st.querySelector('.dt').innerHTML=ic('check')}}
async function skeleton(a,n=2){const sk=document.createElement('div');sk.innerHTML='<div class="skel"></div>'.repeat(n);a.append(sk);down();await sleep(650);sk.remove()}
function finish(a,html){a.insertAdjacentHTML('beforeend',html);paint(a);down();busy=false}
function tracksBlock(ids,conf={}){const q=AQ.push(ids)-1;ids.forEach(id=>{if(!S.found.includes(id))S.found.unshift(id)});return ids.map((id,k)=>resRow(id,q,k,conf[id])).join('')}
const follow=arr=>`<div class="follow">${arr.map(([t,a,i])=>`<button data-act="${a}">${i?ic(i):''}${t}</button>`).join('')}</div>`;
const SC={
 brat2:{st:['Понимаю запрос: саундтрек фильма','Нахожу фильм «Брат 2» (2000)','Сверяю треки с каталогом VK Музыки'],
  out:()=>`<p class="atext">Нашёл саундтрек «Брата 2». Эти песни есть в VK Музыке:</p>${filmRow({t:'Брат 2',y:'2000',n:'Саундтрек фильма',h:20})}${tracksBlock(['b2','z2','sp2','ak','sg'])}${follow([['Открыть как плейлист','open:brat2','list-music'],['А что звучало в первом «Брате»?','ask:Песня из «Брата», где поют про крылья']])}`},
 wings:{st:['Понимаю: песня из фильма «Брат» (1997)','Ищу в саундтреке по слову «крылья»','Нашёл совпадение'],
  out:()=>`<p class="atext">Это «Крылья» группы Наутилус Помпилиус. Песня звучит в фильме «Брат» (1997), саундтрек которого построен на песнях этой группы.</p>${tracksBlock(['np'],{np:94})}`},
 zem:{st:['Разбираю описание: медленная, Земфира','Ищу по фразе из припева','Нашёл совпадение'],
  out:()=>`<p class="atext">Скорее всего, это «Хочешь?» с альбома «Прости меня, моя любовь» (2000).</p>${tracksBlock(['z1','z2'],{z1:96,z2:31})}${follow([['Это не она','ask:Это не та песня']])}`},
 kuk:{st:['Определяю песню: «Кукушка», группа Кино','Ищу её в фильмах и сериалах','Проверяю кавер-версии'],
  out:()=>`<p class="atext">Оригинал вышел на «Чёрном альбоме» группы Кино в 1990 году. Самое известное появление в кино — кавер Полины Гагариной для фильма «Битва за Севастополь» (2015).</p>${filmRow({t:'Битва за Севастополь',y:'2015',n:'Кавер Полины Гагариной',h:15})}${tracksBlock(['k2'])}`},
 none:{st:['Разбираю запрос','Ищу совпадения в каталоге и базе фильмов'],
  out:()=>`<p class="atext">Пока не уверен в ответе. Подскажите, что вы помните лучше всего:</p>${follow([['Слышал в фильме или сериале','hint:Название, сезон, серия и что происходило в сцене','clapperboard'],['Есть фото или скриншот','photo','image-plus'],['Помню пару слов','hint:Напишите слова, которые помните','sparkles']])}`}
};
const route=q=>{q=q.toLowerCase();if(/кухн/.test(q))return'kitchen';if(/брат[ае]?\s*-?\s*2|брат\s*два/.test(q))return'brat2';if(/кукушк/.test(q))return'kuk';if(/земфир|хочешь/.test(q))return'zem';if(/крыл|брат/.test(q))return'wings';
  if(!/[?]|как(ая|ой|ие)|что (играл|за)|где (звуч|игра)|сери|сезон|фильм|сцен|из /.test(q)){const hit=Object.values(TR).filter(t=>!t.ic&&(t.a.toLowerCase().includes(q)||t.t.toLowerCase().includes(q)));if(hit.length)return{cat:hit.map(t=>t.id)}}
  return'none'};
async function ask(text){text=String(text).trim();if(!text||busy)return;busy=true;$('#ask').value='';$('#ask').placeholder='Опишите песню, сцену или фильм';
  openMode('ai');addUser(esc(text));const a=addAgent();const r=route(text);
  if(r=='kitchen')return kitchen(a);
  if(typeof r=='object'){await skeleton(a,2);return finish(a,`<p class="atext">Нашёл в каталоге:</p>${tracksBlock(r.cat.slice(0,5))}`)}
  const sc=SC[r];await steps(a,sc.st);await skeleton(a,1);finish(a,sc.out())}
async function kitchen(a){await steps(a,['Понимаю запрос: сериал «Кухня», 2 сезон, 3 серия','Ищу в серии сцены по описанию «разбили посуду»']);
  finish(a,`<p class="atext">В этой серии две похожие сцены. Какую вы имеете в виду?</p><div class="opts">
   <button data-act="kscene:1"><span class="n">1</span><span><b>На кухне ресторана</b><small>Около 9-й минуты · звучит музыка</small></span></button>
   <button data-act="kscene:2"><span class="n">2</span><span><b>В зале ресторана</b><small>Около 27-й минуты · фоновая музыка</small></span></button></div>`)}
async function kscene(n){if(busy)return;busy=true;$$('.opts button').forEach(b=>b.disabled=true);addUser(n==1?'На кухне ресторана':'В зале ресторана');const a=addAgent();
  await steps(a,['Распознаю музыку по аудиодорожке сцены','Сверяю с каталогом VK Музыки']);await skeleton(a,2);
  const tc=n==1?'09:14':'27:02';
  finish(a,`<div class="scene"><div class="frame">${ic('utensils-crossed')}<span class="tc">С2 · Э3 · ${tc}</span></div><button class="vkv big" data-act="vkvideo:«Кухня», 2 сезон, 3 серия с ${tc}">${ic('tv')}Смотреть сцену в VK Видео с ${tc}</button><div class="tx"><b>Сцена найдена</b><small>«Кухня», 2 сезон, 3 серия · ${n==1?'кухня ресторана':'зал ресторана'}</small></div></div>
   <p class="atext">В сцене звучит оригинальная музыка сериала. Автор музыки к «Кухне» — композитор И. Канаев. Совпадение по аудиоотпечатку 92%.</p>
   ${tracksBlock(['kx'],{kx:92})}
   ${follow([['Подборка «Саундтреки»','open:ed4','list-music'],['Это другая мелодия','ask:Это не та мелодия']])}
   <p class="demo">Демо: в продукте трек определяется по аудиодорожке серии. Сцены, тайм-код и название трека здесь условные.</p>`)}
function analyse(src){return new Promise(res=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=30;c.height=30;const x=c.getContext('2d');x.drawImage(im,0,0,30,30);
  const d=x.getImageData(0,0,30,30).data,b=[[0,0,0],[0,0,0],[0,0,0]];for(let i=0;i<d.length;i+=4){const k=Math.min(2,Math.floor(i/4/300));b[k][0]+=d[i];b[k][1]+=d[i+1];b[k][2]+=d[i+2]}
  const pal=b.map(v=>v.map(z=>Math.round(z/300)));const[r,g,bl]=[0,1,2].map(j=>pal.reduce((s,p)=>s+p[j],0)/3);const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl),l=(mx+mn)/510;let h=0;
  if(mx!=mn){h=mx==r?((g-bl)/(mx-mn))%6:mx==g?(bl-r)/(mx-mn)+2:(r-g)/(mx-mn)+4;h=(h*60+360)%360}
  res({key:l<.28?'night':mx-mn<28?'calm':(h<55||h>300)?'warm':h<160?'green':'cool',pal})};im.onerror=()=>res({key:'calm',pal:[]});im.src=src})}
const PM={night:['тёмные ночные тона','спокойное, ночное',['sp','z1','sh']],calm:['светлые нейтральные тона','спокойное, утреннее',['m1','el','z1']],warm:['тёплые закатные тона','тёплое, летнее',['mt','dt','m1']],cool:['холодные синие тона','просторное, прохладное',['k1','sp2','ag']],green:['зелёные природные тона','лёгкое, свежее',['el','bu','dt']]};
async function photoFlow(src){if(busy)return;busy=true;openMode('ai');addUser(`<img src="${src}" alt="Ваше фото">`);const a=addAgent();const{key,pal}=await analyse(src);const[tone,mood,ids]=PM[key];
  await steps(a,['Смотрю на фото','Определяю цвета и настроение','Подбираю треки под атмосферу']);
  finish(a,`${pal.length?`<div class="pal">${pal.map(p=>`<i style="background:rgb(${p.join(',')})"></i>`).join('')}</div>`:''}<p class="atext">Вижу ${tone}, настроение — ${mood}. Музыки или текста на снимке нет, поэтому подобрал треки под атмосферу. Если пришлёте афишу, обложку или кадр из видео, найду конкретную песню.</p>${tracksBlock(ids)}`)}
function samplePhoto(){const c=document.createElement('canvas');c.width=480;c.height=360;const x=c.getContext('2d');const sky=x.createLinearGradient(0,0,0,230);sky.addColorStop(0,'#3b2a7a');sky.addColorStop(.55,'#ff6a5c');sky.addColorStop(1,'#ffb347');x.fillStyle=sky;x.fillRect(0,0,480,230);
  x.fillStyle='#ffd27a';x.beginPath();x.arc(240,218,46,0,7);x.fill();const sea=x.createLinearGradient(0,230,0,360);sea.addColorStop(0,'#d9574f');sea.addColorStop(1,'#3a2250');x.fillStyle=sea;x.fillRect(0,230,480,130);return c.toDataURL('image/jpeg',.85)}
$('#composer').addEventListener('submit',e=>{e.preventDefault();ask($('#ask').value)});
$('#file').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>photoFlow(r.result);r.readAsDataURL(f);e.target.value=''});

/* ---------- catalog search ---------- */
S.smode='search';S.recent=['Земфира','Кино','Сплин'];
const ARTISTS=[...new Set(Object.values(TR).filter(t=>!t.ic).map(t=>t.a))];
ARTISTS.forEach((a,i)=>{const ids=Object.values(TR).filter(t=>t.a==a).map(t=>t.id);L['ar'+i]={t:a,s:'Исполнитель',h:TR[ids[0]].h,tr:ids}});
const QRE=/[?]|как(ая|ой|ие)\s|что (играл|за)|где (звуч|игра)|сери[яию]|сезон|фильм|сцен|песн[яю] (где|про|из|с)|помню|мелоди/i;
const hl=(s,q)=>{const i=s.toLowerCase().indexOf(q);return i<0?esc(s):esc(s.slice(0,i))+'<span class="hl">'+esc(s.slice(i,i+q.length))+'</span>'+esc(s.slice(i+q.length))};
const addRecent=t=>{t=t.trim();if(t&&!QRE.test(t))S.recent=[t,...S.recent.filter(x=>x.toLowerCase()!=t.toLowerCase())].slice(0,6)};
function searchHits(q){const ar=ARTISTS.map((a,i)=>({a,i})).filter(x=>x.a.toLowerCase().includes(q)).slice(0,3);
  const tr=Object.values(TR).filter(t=>!t.ic&&(t.t.toLowerCase().includes(q)||t.a.toLowerCase().includes(q))).map(t=>t.id).slice(0,8);
  const pls=Object.entries(L).filter(([k,l])=>!/^ar\d|^(blend|srch|mine|liked|found|vkmix)$/.test(k)&&l.t.toLowerCase().includes(q)).slice(0,4);return{ar,tr,pls}}
function renderSearch(){const raw=$('#sq').value,q=raw.trim().toLowerCase();$('#sqx').style.visibility=raw?'visible':'hidden';let h='';
  const askRow=lead=>`<button class="askrow" data-act="sq-ask"><span class="orbit">${wave('mix',40,5)}</span><span style="flex:1"><b>${lead}</b><br><small>«${esc(raw.trim())}»</small></span>${ic('sparkles')}</button>`;
  if(!q){h=`<div class="grp" style="margin-top:8px">Недавние запросы</div><div class="chipset">${S.recent.map(r=>`<button data-act="sq-set:${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <button class="askrow" data-act="smode:ai"><span class="orbit">${wave('mix',40,5)}</span><span style="flex:1"><b>Не помните название?</b><br><small>Опишите песню, сцену из фильма или пришлите фото — найдёт ассистент</small></span>${ic('chevron-right')}</button>
    <div class="grp">Жанры и подборки</div><div class="tiles">${['rock','pop','hip','indie','alt','ed4'].map(k=>`<button class="genre" style="${cv(L[k].h)}" data-act="open:${k}"><span>${L[k].t}</span></button>`).join('')}</div>`}
  else{const{ar,tr,pls}=searchHits(q);L.srch={t:'Результаты поиска',s:'«'+raw.trim()+'»',h:210,tr};const qlike=QRE.test(raw);
    if(!ar.length&&!tr.length&&!pls.length)h=`<div class="empty" style="margin-top:8px"><b>В каталоге ничего не нашлось</b>Проверьте написание. Если это описание песни или сцены — его поймёт ассистент</div>${askRow('Спросить ассистента')}`;
    else{if(qlike)h+=askRow('Похоже на вопрос — спросите ассистента');
      if(ar.length)h+=`<div class="grp">Исполнители</div>`+ar.map(({a,i})=>`<div class="tr" data-act="open:ar${i}" role="button" tabindex="0"><div class="cv" style="${cv(L['ar'+i].h)};border-radius:50%"></div><div class="tx"><b>${hl(a,q)}</b><small>Исполнитель · ${plural(L['ar'+i].tr.length,TRW)}</small></div>${ic('chevron-right')}</div>`).join('');
      if(tr.length)h+=`<div class="grp">Треки</div>`+tr.map((id,i)=>trackRow(id,'srch',i)).join('');
      if(pls.length)h+=`<div class="grp">Плейлисты и подборки</div>`+pls.map(([k,l])=>`<div class="tr" data-act="open:${k}" role="button" tabindex="0"><div class="cv" style="${cv(l.h)}">${l.ic?ic(l.ic):''}</div><div class="tx"><b>${hl(l.t,q)}</b><small>${esc(l.s||'Плейлист')}</small></div>${ic('chevron-right')}</div>`).join('');
      if(!qlike)h+=askRow('Не то? Спросите ассистента')}}
  $('#sres').innerHTML=h}
function applyMode(){const s=S.smode=='search';$('#sWrap').style.display=s?'':'none';$('#aWrap').style.display=s?'none':'';
  [['#tabS',s],['#tabA',!s]].forEach(([id,on])=>{$(id).classList.toggle('on',on);$(id).setAttribute('aria-selected',on)});
  $('#aiNew').style.visibility=s?'hidden':'';if(s)renderSearch();layout()}
function openMode(m,focus){S.smode=m;if(top()!='ai')push('ai');applyMode();if(m=='search'&&focus)setTimeout(()=>{try{$('#sq').focus({preventScroll:true})}catch(e){}},420)}
$('#sq').addEventListener('input',renderSearch);
$('#sq').addEventListener('keydown',e=>{if(e.key!='Enter')return;e.preventDefault();const t=$('#sq').value.trim();if(!t)return;const{ar,tr,pls}=searchHits(t.toLowerCase());
  if(QRE.test(t)||(!ar.length&&!tr.length&&!pls.length))ask(t);else{addRecent(t);$('#sq').blur();renderSearch()}});

/* ---------- toast ---------- */
let tt;function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2300)}

/* ---------- actions ---------- */
function act(a,el,e){const[k,...r]=a.split(':');const v=r.join(':');
 switch(k){
  case'tab':if(top()!='main'){S.stack=['main'];layout()}S.section=v;renderSection();$('#main').scrollTop=0;syncStatus();break;
  case'push':push(v);break;
  case'search':openMode('search',true);break;
  case'vkvideo':toast('Откроется VK Видео: '+v+'. Музыка продолжит играть в мини-плеере');break;
  case'assistant':openMode('ai');break;
  case'smode':openMode(v,v=='search');break;
  case'sq-set':$('#sq').value=v;renderSearch();break;
  case'sq-clear':$('#sq').value='';renderSearch();$('#sq').focus({preventScroll:true});break;
  case'sq-ask':{const t=$('#sq').value.trim();if(t)ask(t);break}
  case'theme-sheet':themeSheet();break;
  case'sheet-settings':closeSheet();push('settings');break;
  case'back':back();break;
  case'close':closeSheet();break;
  case'open':PLK=v;push('pl');break;
  case'playlist':playList(v);break;
  case'playlist-shuffle':playList(v,0,true);toast('Перемешали');break;
  case'play':{const[key,i]=r;if(key=='srch')addRecent($('#sq').value);if(key=='recent'){setQueue(['sp2','m1','k2'],+i,'Недавно слушали','recent')}else if(key=='blend'){playList('blend',+i)}else playList(key,+i);break}
  case'pl-like':S.plLiked=S.plLiked||new Set();S.plLiked.has(v)?S.plLiked.delete(v):S.plLiked.add(v);toast(S.plLiked.has(v)?'Добавлено в коллекцию':'Убрано из коллекции');renderPl();break;
  case'hero':if(S.playing&&S.srcKey==v){S.playing=false;drawPlayer()}else if(S.srcKey==v&&S.cur){S.playing=true;drawPlayer()}else playList(v);renderSection();break;
  case'hero-shuffle':playList('mine',0,true);renderSection();toast('Мои треки: перемешано');break;
  case'hero-swipe':{const sl=$('#slides');sl.scrollTo({left:sl.scrollLeft>10?0:sl.clientWidth,behavior:'smooth'});break}
  case'mixset':mixSheet();break;
  case'mx':{const[g,val]=r;S.mixset[g]=val;mixSheet();break}
  case'mx-apply':closeSheet();playList('vkmix',0,true);renderSection();toast(`VK Микс: ${S.mixset.act.toLowerCase()}, ${S.mixset.mood.toLowerCase()}`);break;
  case'blend-start':openPicker();break;
  case'friend':startMerge(FR[+v]);break;
  case'blend-with':closeSheet();startMerge(FR[+v]);break;
  case'invite':closeSheet();toast('Ссылка-приглашение скопирована');break;
  case'open-blend':S.blend=S.blends[+v];push('blend');break;
  case'play-blend':if(!S.blend)S.blend=S.blends[0];if(top()!='blend')push('blend');else renderBlend();playList('blend',0);break;
  case'mode':S.blend.mode=v;{const st=$('#blend').scrollTop;renderBlend();$('#blend').scrollTop=st}break;
  case'blend-save':S.blend.saved=!S.blend.saved;toast(S.blend.saved?'Микс сохранён в Коллекцию':'Микс убран из Коллекции');{const st=$('#blend').scrollTop;renderBlend();$('#blend').scrollTop=st}break;
  case'blend-share':shareSheet(`Вы и ${S.blend.f.s} · Микс на двоих`,`Совпадение ${S.blend.f.m}% · ${plural(blendList().length,TRW)}`);break;
  case'blend-more':openSheet(`<h3>Вы и ${S.blend.f.s}</h3><p>Микс на двоих</p><button class="act" data-act="blend-share">${ic('send')}Отправить ${S.blend.f.g}</button><button class="act" data-act="pref:mix">${ic('bell')}${S.prefs.mix?'Выключить':'Включить'} уведомления об обновлении</button><button class="act red" data-act="blend-delete">${ic('trash-2')}Удалить микс</button>`);break;
  case'blend-delete':closeSheet();confirmBox('Удалить микс?',`Плейлист «Вы и ${S.blend.f.s}» пропадёт у вас. У ${S.blend.f.gen} он останется.`,'Удалить',()=>{S.blends=S.blends.filter(b=>b!=S.blend);S.blend=null;S.stack=['main'];layout();renderSection();toast('Микс удалён')});break;
  case'confirm-ok':closeSheet();confirmFn&&confirmFn();confirmFn=null;break;
  case'optin':if(v=='yes'){S.prefs.mix=true;toast('Будем сообщать об обновлениях')}else{S.optinHidden=true;toast('Хорошо, не будем')}{const st=$('#blend').scrollTop;renderBlend();$('#blend').scrollTop=st}break;
  case'blend-remove':S.blend.tracks=S.blend.tracks.filter(x=>x[0]!=v);closeSheet();toast('Убрали. Учтём это в следующих обновлениях');renderBlend();break;
  case'add-blend':closeSheet();if(!S.blends.length){toast('Сначала соберите Микс на двоих');break}{const b=S.blends[0];if(!b.tracks.find(x=>x[0]==v))b.tracks.unshift([v,'me']);toast(`Добавлено в микс «Вы и ${b.f.s}»`)}break;
  case'more':trackSheet(r[0],r[1]);break;
  case'more-cur':S.cur&&trackSheet(S.cur.id,S.srcKey);break;
  case'like':S.liked.has(v)?S.liked.delete(v):S.liked.add(v);closeSheet();toast(S.liked.has(v)?'Добавлено в «Мне нравится»':'Убрано из «Мне нравится»');drawPlayer();refreshLists();break;
  case'like-cur':S.cur&&act('like:'+S.cur.id);break;
  case'next-up':S.q.length?S.q.splice(S.qi+1,0,v):setQueue([v],0,'Очередь','queue');closeSheet();toast('Будет играть следующим');break;
  case'where':closeSheet();closePlayer();ask(`Где звучала «${TR[v].t}»?`);break;
  case'where-cur':S.cur&&act('where:'+S.cur.id);break;
  case'share-t':shareSheet(TR[v].t,TR[v].a,'blue');break;
  case'share-cur':S.cur&&shareSheet(S.cur.t,S.cur.a,'blue');break;
  case'share':shareSheet(L[v].t,L[v].s||'Плейлист','pink');break;
  case'sent':closeSheet();toast(v);break;
  case'copy':closeSheet();try{navigator.clipboard.writeText('https://vk.ru/music').catch(()=>{})}catch(err){}toast('Ссылка скопирована');break;
  case'player':openPlayer();break;
  case'player-close':closePlayer();break;
  case'pp':if(!S.cur)break;S.playing=!S.playing;drawPlayer();refreshLists();break;
  case'next':step(1);break;case'prev':if(S.p>3){S.p=0;prog()}else step(-1);break;
  case'shuffle':S.shuffle=!S.shuffle;drawPlayer();toast(S.shuffle?'Перемешивание включено':'Перемешивание выключено');break;
  case'repeat':S.repeat=!S.repeat;drawPlayer();toast(S.repeat?'Повтор включён':'Повтор выключен');break;
  case'queue':queueSheet();break;
  case'qjump':S.qi=+v;S.cur=TR[S.q[S.qi]];S.p=0;S.playing=true;drawPlayer();closeSheet();refreshLists();break;
  case'ask':ask(v);break;
  case'hint':$('#ask').placeholder=v;$('#ask').focus();break;
  case'photo':$('#file').click();break;
  case'photo-sample':photoFlow(samplePhoto());break;
  case'kscene':kscene(+v);break;
  case'aiplay':{const[q,i]=r;setQueue(AQ[+q],+i,'Найдено ассистентом','found');toast('Играет: '+S.cur.t);break}
  case'ai-clear':msgs.innerHTML='';$('#aiHome').style.display='';busy=false;break;
  case'theme':S.theme=v;save('vkm-theme',v);applyTheme(true);if($('#sheet').classList.contains('on'))themeSheet();if(top()=='settings')renderSettings();toast({light:'Дневная тема',dark:'Ночная тема',system:'Тема как в системе'}[v]);break;
  case'wave':S.wave=v;save('vkm-wave',v);renderSettings();renderSection();toast(v=='blue'?'На главной сначала VK Микс':'На главной сначала Мои треки');break;
  case'pref':S.prefs[v]=!S.prefs[v];if(top()=='settings')renderSettings();if(top()=='blend'){closeSheet();renderBlend()}toast(S.prefs[v]?'Включено':'Выключено');break;
  case'toast':toast(v);break;
  case'demo':demo(v);break;
 }
 paint()}
function demo(v){closeSheet();closePlayer();
  if(v=='blend'){S.stack=['main'];S.section='home';layout();renderSection();$('#main').scrollTo({top:420,behavior:'smooth'});setTimeout(openPicker,500)}
  else if(v=='kitchen'){openMode('ai');if(!busy){msgs.innerHTML='';$('#aiHome').style.display=''}setTimeout(()=>ask('Сериал «Кухня», 2 сезон, 3 серия: какая мелодия играла, когда разбили посуду?'),350)}
  else if(v=='theme'){themeSheet()}
  else if(v=='search'){openMode('search');$('#sq').value='Земф';renderSearch()}
  else if(v=='reset'){confirmBox('Начать сначала?','Миксы, лайки и история ассистента сбросятся. Тема оформления сохранится.','Сбросить',()=>location.reload())}}

document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;if(el.closest('#prog'))return;if(el.disabled)return;
  if(el.id=='mini'&&e.target.closest('button'))return;e.preventDefault();act(el.dataset.act,el,e)});
document.addEventListener('keydown',e=>{if(e.key=='Escape'){if($('#sheet').classList.contains('on')||$('#dialog').classList.contains('on'))closeSheet();else if($('#player').classList.contains('on'))closePlayer();else back()}
  const el=e.target.closest?.('[role=button][data-act]');if(el&&(e.key=='Enter'||e.key==' ')){e.preventDefault();act(el.dataset.act,el,e)}});

/* ---------- boot ---------- */
function fit(){const bare=innerWidth<600;document.body.classList.toggle('bare',bare);if(bare)return;const s=Math.min(1,(innerHeight-40)/844);$('#phone').style.transform=`scale(${s})`;$('#holder').style.width=390*s+'px';$('#holder').style.height=844*s+'px'}
addEventListener('resize',fit);fit();
$('#orb1').innerHTML=wave('mix',52,6);
applyTheme();S.q=L.vkmix.tr.slice();S.qi=0;S.cur=TR[S.q[0]];S.p=48;S.src='VK Микс';S.srcKey='vkmix';
renderSection();drawPlayer();layout();updBadge();paint();
}
