let net='local',mySeat=null,conns=[],lastFace=1,vsCpu=false,bt=0;
const R=5,D0=4,CH=2*R+1,L=8*CH,HC=L-1,GOAL=L+R-2,V=11.6;
const COL=['#e53935','#fb8c00','#fdd835','#43a047','#00bcd4','#1e88e5','#8e24aa','#ec407a'];
const NAME=['Red','Orange','Yellow','Green','Cyan','Blue','Purple','Pink'];
const SETS={2:[0,4],3:[0,3,5],4:[0,2,4,6],5:[0,2,4,5,7],6:[0,1,3,4,5,7],7:[0,1,2,3,5,6,7],8:[0,1,2,3,4,5,6,7]};
const rad=k=>(-90+45*k)*Math.PI/180;
const arm=(k,t,l)=>{const a=rad(k),d=D0+t;return [d*Math.cos(a)-l*Math.sin(a),d*Math.sin(a)+l*Math.cos(a)];};
const cellOf=m=>{const k=Math.floor(m/CH),q=m%CH;return q<R?[k,q,-1]:q===R?[k,R-1,0]:[k,2*R-q,1];};
const SK=k=>k*CH+R+2;
const SAFE=new Set();
for(let k=0;k<8;k++){SAFE.add(SK(k));SAFE.add((SK(k)+8)%L);}
const baseXY=k=>{const b=rad(k)+Math.PI/8;return [8.9*Math.cos(b),8.9*Math.sin(b)];};

let ACT=[],turn=0,rolled=null,busy=false,T={};
const EL=[];
const board=document.getElementById('board');
const msg=document.getElementById('msg');
const dice=document.getElementById('dice');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function buildBoard(){
  const rv=10.6/Math.cos(Math.PI/8);
  const oct=[...Array(8).keys()].map(j=>{
    const a=rad(0)+(22.5+45*j)*Math.PI/180;
    return (rv*Math.cos(a)).toFixed(2)+','+(rv*Math.sin(a)).toFixed(2);
  }).join(' ');
  const rect=(x,y,k,f)=>`<rect x="-.48" y="-.48" width=".96" height=".96" rx=".08" fill="${f}" stroke="#888" stroke-width=".05" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${45*k})"/>`;
  let W='',ST='';const G=[];
  for(let k=0;k<8;k++){
    const a=rad(k),f=COL[k];
    const [bx,by]=baseXY(k);
    G[k]=`<polygon points="0,0 ${(3.4*Math.cos(a-Math.PI/8)).toFixed(2)},${(3.4*Math.sin(a-Math.PI/8)).toFixed(2)} ${(3.4*Math.cos(a+Math.PI/8)).toFixed(2)},${(3.4*Math.sin(a+Math.PI/8)).toFixed(2)}" fill="${f}"/>`
      +`<circle cx="${bx.toFixed(2)}" cy="${by.toFixed(2)}" r="1.9" fill="${f}"/><circle cx="${bx.toFixed(2)}" cy="${by.toFixed(2)}" r="1.45" fill="#fff"/>`;
    for(let t=0;t<R-1;t++){const [x,y]=arm(k,t,0);G[k]+=rect(x,y,k,f);}
  }
  for(let m=0;m<L;m++){
    const [k,t,l]=cellOf(m);
    const [x,y]=arm(k,t,l);
    let owner=-1;for(let j=0;j<8;j++)if(SK(j)===m)owner=j;
    if(owner>=0)G[owner]+=rect(x,y,k,COL[owner]);else W+=rect(x,y,k,'#fff');
    if(SAFE.has(m))ST+=`<text x="${x.toFixed(2)}" y="${(y+.22).toFixed(2)}" font-size=".7" text-anchor="middle" fill="#555">\u2605</text>`;
  }
  let s=`<svg viewBox="${-V} ${-V} ${2*V} ${2*V}" style="position:absolute;inset:0;width:100%;height:100%">`;
  s+=`<polygon points="${oct}" fill="#fff" stroke="#fff" stroke-width=".3" stroke-linejoin="round"/>`+W;
  for(let k=0;k<8;k++)s+=`<g id="g${k}">${G[k]}</g>`;
  s+=ST+'</svg>';
  board.innerHTML=s;
  for(let k=0;k<8;k++){
    EL[k]=[];
    for(let i=0;i<4;i++){
      const t=document.createElement('div');t.className='tok';
      t.style.background=COL[k];
      t.onclick=()=>move(k,i);
      board.appendChild(t);EL[k].push(t);
    }
  }
}

// token position: -1 base, 0..L-2 main path, L-1..GOAL-1 home column, GOAL finished
function unit(k,i,p){
  if(p===-1){const [bx,by]=baseXY(k);return [bx+(i%2?.7:-.7),by+(i>>1?.7:-.7)];}
  if(p<=L-2){return arm(...cellOf((SK(k)+p)%L));}
  if(p<GOAL){return arm(k,R-2-(p-HC),0);}
  return [1.6*Math.cos(rad(k)),1.6*Math.sin(rad(k))];
}

function layout(){
  const g={};
  ACT.forEach(k=>T[k].forEach((p,i)=>{
    const [x,y]=unit(k,i,p);
    const key=x.toFixed(2)+','+y.toFixed(2);
    (g[key]=g[key]||[]).push([k,i,x,y,p]);
  }));
  const sz=.8/(2*V)*100;
  for(const key in g){
    const a=g[key];
    a.forEach(([k,i,x,y,p],j)=>{
      const e=EL[k][i];
      const off=a.length>1?(j-(a.length-1)/2)*.28:0;
      e.style.left=((x+off+V)/(2*V)*100-sz/2)+'%';
      e.style.top=((y+V)/(2*V)*100-sz/2)+'%';
      e.classList.toggle('done',p===GOAL);
    });
  }
  sync();
}

const movable=(k,d)=>[0,1,2,3].filter(i=>{
  const p=T[k][i];
  return p===-1?d===6:(p<GOAL&&p+d<=GOAL);
});

function placeDice(){
  const k=ACT[turn];if(k===undefined)return;
  const [x,y]=arm(k,5.55,0);
  dice.style.left=(x+V)/(2*V)*100+'%';
  dice.style.top=(y+V)/(2*V)*100+'%';
  dice.style.boxShadow='0 0 0 3px '+COL[k]+',0 0 14px '+COL[k];
}
function say(t){
  msg.textContent=t;
  msg.style.color=COL[ACT[turn]]||'#fff';
  placeDice();
  sync();
  botTick();
}
function clearHL(){EL.forEach(a=>a.forEach(e=>e.classList.remove('hl')));}

function face(n){lastFace=n;
  const pips=[[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]][n-1];
  dice.innerHTML='';
  for(let q=0;q<9;q++){const i=document.createElement('i');if(pips.includes(q))i.className='on';dice.appendChild(i);}
}

function reset(){
  ACT=SETS[+document.getElementById('np').value];
  T={};ACT.forEach(k=>T[k]=[-1,-1,-1,-1]);
  for(let k=0;k<8;k++){
    const on=ACT.includes(k);
    document.getElementById('g'+k).style.opacity=on?1:.15;
    EL[k].forEach(e=>{e.style.display=on?'block':'none';e.classList.remove('hl');});
  }
  turn=0;rolled=null;busy=false;
  layout();face(1);
  say(NAME[ACT[0]]+'\u2019s turn \u2013 tap the dice');
}

function next(){
  turn=(turn+1)%ACT.length;
  say(NAME[ACT[turn]]+'\u2019s turn \u2013 tap the dice');
}

function roll(){
  if(busy||rolled!==null)return;
  busy=true;dice.classList.add('spin');bc({t:'spin'});
  let n=0;
  const t=setInterval(()=>{
    face(1+Math.random()*6|0);
    if(++n>8){
      clearInterval(t);
      const d=1+Math.random()*6|0;
      face(d);dice.classList.remove('spin');
      rolled=d;busy=false;afterRoll();
    }
  },70);
}

function afterRoll(){
  const k=ACT[turn],d=rolled,mv=movable(k,d);
  if(!mv.length){
    say(NAME[k]+' rolled '+d+' \u2013 no moves');
    busy=true;
    setTimeout(()=>{busy=false;rolled=null;next();},1000);
    return;
  }
  mv.forEach(i=>EL[k][i].classList.add('hl'));
  say(NAME[k]+' rolled '+d+' \u2013 tap a glowing token');
}

async function move(k,i){
  if(busy||rolled===null||k!==ACT[turn]||!movable(k,rolled).includes(i))return;
  busy=true;clearHL();
  const d=rolled;
  if(T[k][i]===-1){T[k][i]=0;layout();await sleep(300);}
  else for(let s=0;s<d;s++){T[k][i]++;layout();await sleep(200);}
  let bonus=d===6;
  const p=T[k][i];
  if(p<=L-2){
    const a=(SK(k)+p)%L;
    if(!SAFE.has(a)){
      for(const o of ACT){
        if(o===k)continue;
        T[o].forEach((q,j)=>{
          if(q>=0&&q<=L-2&&(SK(o)+q)%L===a){T[o][j]=-1;bonus=true;}
        });
      }
      layout();
    }
  }
  if(p===GOAL)bonus=true;
  if(T[k].every(q=>q===GOAL)){
    msg.textContent='\uD83C\uDFC6 '+NAME[k]+' wins!';
    msg.style.color=COL[k];
    sync();
    return;
  }
  rolled=null;busy=false;
  if(bonus)say(NAME[k]+' gets another turn \u2013 roll!');
  else next();
}

dice.onclick=roll;
document.getElementById('ng').onclick=reset;
document.getElementById('np').onchange=reset;
buildBoard();
reset();

/* ===== Chat, emojis, mic ===== */
const $=id=>document.getElementById(id);
const pct=(x,y)=>[(x+V)/(2*V)*100+'%',(y+V)/(2*V)*100+'%'];
const me=()=>mySeat!==null?mySeat:ACT[turn]; // local mode: the player whose turn it is. Online: your own seat.

// ONLINE HOOK: replace receive(ev) below with a Firebase/Socket push,
// and call receive(ev) when data arrives from the other players.
function emit(ev){
  if(net==='local')receive(ev);
  else if(net==='host'){receive(ev);bc(ev);}
  else if(hostConn)hostConn.send(ev);
}

function toast(t){const e=$('toast');if($('stt')&&$('lob').classList.contains('show'))$('stt').textContent=t;e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2500);}

const rings=[];
for(let k=0;k<8;k++){
  const r=document.createElement('div');r.className='ring';
  const [l,t]=pct(...baseXY(k));r.style.left=l;r.style.top=t;
  board.appendChild(r);rings.push(r);
}

// Emojis
const EMO=[['\u{1F602}','shake'],['\u{1F60D}','pulse'],['\u{1F621}','shake'],['\u{1F62D}','bounce'],['\u{1F44F}','bounce'],['\u{1F525}','pulse'],['\u{1F389}','spin'],['\u{1F60E}','bounce']];
EMO.forEach(([e,a])=>{
  const b=document.createElement('button');b.className='eb';b.textContent=e;
  b.onclick=()=>emit({t:'emo',k:me(),e:e,a:a});
  $('tray').appendChild(b);
});
$('emo').onclick=()=>$('tray').classList.toggle('show');

function floatEmo(k,e,a){
  const d=document.createElement('div');d.className='fl';
  const [l,t]=pct(...baseXY(k));d.style.left=l;d.style.top=t;
  const s=document.createElement('span');s.className='a-'+a;s.textContent=e;
  d.appendChild(s);board.appendChild(d);
  setTimeout(()=>d.remove(),2000);
}

// Chat
let unread=0;
function addMsg(k,x){
  const row=document.createElement('div');
  const n=document.createElement('b');n.textContent=NAME[k]+': ';n.style.color=COL[k];
  row.appendChild(n);row.appendChild(document.createTextNode(x));
  $('cm').appendChild(row);$('cm').scrollTop=1e6;
  if(!$('chat').classList.contains('open')){unread++;$('bd').textContent=unread;$('bd').style.display='block';}
}
function receive(ev){
  if(ev.t==='chat')addMsg(ev.k,ev.x);
  if(ev.t==='emo')floatEmo(ev.k,ev.e,ev.a);
  if(ev.t==='spk')rings[ev.k].classList.toggle('speak',ev.on);
}
$('cht').onclick=()=>{
  const c=$('chat');c.classList.toggle('open');
  if(c.classList.contains('open')){unread=0;$('bd').style.display='none';}
};
function sendChat(){
  const v=$('ci').value.trim();if(!v)return;
  emit({t:'chat',k:me(),x:v});$('ci').value='';
}
$('cs').onclick=sendChat;
$('ci').onkeydown=e=>{if(e.key==='Enter')sendChat();};
document.addEventListener('click',e=>{
  const c=$('chat');
  if(c.classList.contains('open')&&!c.contains(e.target)&&!$('cht').contains(e.target))c.classList.remove('open');
});

// Mic: tap once to turn on, then tap to mute / unmute
let stream=null,an=null,micState='off';
async function micTap(){
  if(micState==='off'){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Mic needs an https link. Publish the game first.');return;}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
    }catch(e){toast('Mic blocked. Allow microphone in browser settings.');return;}
    const ac=new (window.AudioContext||window.webkitAudioContext)();
    an=ac.createAnalyser();an.fftSize=256;
    ac.createMediaStreamSource(stream).connect(an);
    micState='live';callAll();
    toast('Mic on');
  }else{
    micState=micState==='live'?'mute':'live';
    stream.getAudioTracks().forEach(t=>t.enabled=micState==='live');
    toast(micState==='live'?'Mic on':'Muted');
  }
  $('mic').className='rb '+micState;
}
$('mic').onclick=micTap;
const buf=new Uint8Array(128);
let wasSpk=false;
setInterval(()=>{
  let spk=false;
  if(micState==='live'&&an){an.getByteFrequencyData(buf);let s=0;for(let i=0;i<buf.length;i++)s+=buf[i];spk=s/buf.length>18;}
  $('mic').classList.toggle('speak',spk);
  if(net==='local'){rings.forEach(r=>r.classList.remove('speak'));if(spk)rings[me()].classList.add('speak');}
  else if(spk!==wasSpk){wasSpk=spk;emit({t:'spk',k:me(),on:spk});}
},120);
board.appendChild(dice);placeDice();

/* ===== Home screen ===== */
const home=$('home'),pick=$('pick');
document.querySelectorAll('.soon').forEach(b=>b.onclick=()=>toast('Coming soon!'));
$('pnp').onclick=()=>pick.classList.add('show');
$('pc').onclick=()=>pick.classList.remove('show');
for(let n=2;n<=8;n++){
  const b=document.createElement('button');b.textContent=n;
  b.onclick=()=>{
    $('np').value=n;pick.classList.remove('show');
    home.style.display='none';$('gm').style.display='flex';
    reset();
  };
  $('pg').appendChild(b);
}
$('hb').onclick=()=>{$('gm').style.display='none';home.style.display='block';};

/* ===== Play with friends (PeerJS) ===== */
let peer=null,hostConn=null,started=false,peersList=[],myName='Player',sp=null,roomPw='',peerTm=0,peerTried=0,peerCt=0,quick=false,qt=0,qTry=0;
const CODEC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const bc=ev=>conns.forEach(c=>{try{if(c.open&&c.auth)c.send(ev);}catch(e){}});
function sync(){
  if(net!=='host')return;
  bc({t:'state',ACT:ACT,T:T,turn:turn,rolled:rolled,busy:busy,face:lastFace,msg:msg.textContent,col:msg.style.color});
}
function setActive(){
  for(let k=0;k<8;k++){
    const on=ACT.includes(k);
    $('g'+k).style.opacity=on?1:.15;
    EL[k].forEach(e=>{e.style.display=on?'block':'none';});
  }
}
function enterGame(){
  $('lob').classList.remove('show');home.style.display='none';$('gm').style.display='flex';
  $('np').style.display='none';$('ng').style.display=net==='host'?'':'none';
}
function leaveNet(){
  try{if(peer)peer.destroy();}catch(e){}
  peer=null;hostConn=null;conns=[];started=false;net='local';mySeat=null;peersList=[];roomPw='';quick=false;clearTimeout(qt);
  $('np').style.display='';$('ng').style.display='';
  $('l1').style.display='';$('l2').style.display='none';
  clearHL();
}
function showRoom(code){if(quick)$('lob').classList.add('show');$('l1').style.display='none';$('l2').style.display='';$('rcode').textContent=quick?'ONLINE':code+(roomPw?' \uD83D\uDD12':'');}
function lobbyList(list){
  $('pl').innerHTML='';
  list.forEach((n,i)=>{const d=document.createElement('div');d.textContent=(i+1)+'. '+n;$('pl').appendChild(d);});
}
function lobbyUpdate(){
  const list=[myName+' (host)',...conns.filter(c=>c.auth).map(c=>c.name||'Player')];
  lobbyList(list);bc({t:'lobby',list:list});
  if(quick&&!started){
    if(list.length>=8)startGame();
    else if(list.length>=2){clearTimeout(qt);qt=setTimeout(()=>{if(!started)startGame();},10000);toast('Game starts in 10 seconds');}
  }
}
function getName(){myName=($('nm').value.trim()||'Player').slice(0,12);}
function netOK(){if(typeof Peer==='undefined'){toast('Needs internet to load PeerJS');return false;}return true;}

const PSRC=['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js','https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js'];
function loadPeer(retry){
  if(peerTried>=PSRC.length){peerTried=0;toast('Cannot load online mode. Check internet and open the game in Chrome.');return;}
  toast('Loading online mode...');
  const s=document.createElement('script');s.src=PSRC[peerTried++];
  s.onload=()=>{if(typeof Peer==='undefined'){loadPeer(retry);return;}peerTried=0;retry();};
  s.onerror=()=>loadPeer(retry);
  document.head.appendChild(s);
}
function createRoom(){
  if(typeof Peer==='undefined'){loadPeer(createRoom);return;}getName();$('stt').textContent='Connecting...';
  const code=$('pw').value.trim();
  if(code.length<4){toast('Room number needs 4 to 6 digits');return;}
  peer=new Peer('lodu-'+code);
  clearTimeout(peerTm);peerTm=setTimeout(()=>{clearInterval(peerCt);if(quick){$('lob').classList.add('show');$('l1').style.display='';}diag();},12000);
  let sec=0;clearInterval(peerCt);peerCt=setInterval(()=>{$('stt').textContent='Connecting... '+(++sec)+'s';},1000);
  peer.on('open',()=>{clearTimeout(peerTm);clearInterval(peerCt);showRoom(code);$('st').style.display='';lobbyUpdate();});
  peer.on('error',e=>{
    if(e.type==='unavailable-id'){try{peer.destroy();}catch(x){}peer=null;clearTimeout(peerTm);if(quick&&++qTry<4)joinRoom();else toast('That number is already used. Pick another.');}
    else{clearTimeout(peerTm);clearInterval(peerCt);toast('Server error ('+e.type+'). Try Wi-Fi or Chrome.');}
  });
  peer.on('connection',c=>{
    if(started||conns.length>=7){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),300);});return;}
    conns.push(c);
    c.on('data',d=>onHost(c,d));
    c.on('close',()=>{conns=conns.filter(x=>x!==c);if(started)toast((c.name||'A player')+' left');else lobbyUpdate();});
  });
  peer.on('call',onCall);
}
function onHost(c,d){
  if(d.t==='hello'){
    if(roomPw&&String(d.pw||'')!==roomPw){conns=conns.filter(x=>x!==c);try{c.send({t:'bad'});}catch(e){}setTimeout(()=>c.close(),400);return;}
    c.auth=true;c.name=String(d.name||'Player').slice(0,12);lobbyUpdate();return;
  }
  if(!c.auth||!started)return;
  if(d.t==='roll'&&ACT[turn]===c.seat)roll();
  else if(d.t==='move'&&ACT[turn]===c.seat)move(c.seat,d.i);
  else if(d.t==='chat'||d.t==='emo'||d.t==='spk'){d.k=c.seat;receive(d);bc(d);}
}
function startGame(){
  conns=conns.filter(c=>c.auth);
  const n=1+conns.length;
  if(n<2){toast('Wait for at least 1 friend');return;}
  started=true;net='host';
  $('np').value=n;mySeat=SETS[n][0];
  conns.forEach((c,i)=>{c.seat=SETS[n][i+1];});
  peersList=[peer.id,...conns.map(c=>c.peer)];
  conns.forEach(c=>c.send({t:'start',seat:c.seat,ACT:SETS[n],peers:peersList}));
  enterGame();
  reset();
}
function joinRoom(){
  if(typeof Peer==='undefined'){loadPeer(joinRoom);return;}getName();
  const code=$('rc').value.trim().toUpperCase();
  if(code.length<4){toast('Enter the room number');return;}
  peer=new Peer();
  peer.on('open',()=>{
    hostConn=peer.connect('lodu-'+code,{reliable:true});
    clearTimeout(peerTm);peerTm=setTimeout(()=>{if(hostConn&&!hostConn.open)toast('Could not connect. Check the code, or try Wi-Fi.');},12000);
    hostConn.on('open',()=>{clearTimeout(peerTm);hostConn.send({t:'hello',name:myName});showRoom(code);$('st').style.display='none';});
    hostConn.on('data',onClient);
    hostConn.on('close',()=>{
      toast('Host left the room');leaveNet();
      $('lob').classList.remove('show');$('gm').style.display='none';home.style.display='block';
    });
  });
  peer.on('error',e=>{
    if(e.type==='peer-unavailable'&&quick&&++qTry<4){try{peer.destroy();}catch(x){}peer=null;createRoom();return;}
    toast(e.type==='peer-unavailable'?'Room not found':'Server error ('+e.type+'). Try Wi-Fi or Chrome.');
  });
  peer.on('call',onCall);
}
function stopSpin(){clearInterval(sp);dice.classList.remove('spin');}
function spinFx(){stopSpin();dice.classList.add('spin');sp=setInterval(()=>face(1+Math.random()*6|0),70);setTimeout(stopSpin,1500);}
function onClient(d){
  if(d.t==='lobby')lobbyList(d.list);
  else if(d.t==='full'){toast('Room is full or already started');leaveNet();}
  else if(d.t==='bad'){toast('Wrong password');leaveNet();}
  else if(d.t==='start'){net='client';started=true;mySeat=d.seat;ACT=d.ACT;peersList=d.peers;setActive();enterGame();}
  else if(d.t==='spin')spinFx();
  else if(d.t==='state'){
    ACT=d.ACT;T=d.T;turn=d.turn;rolled=d.rolled;
    stopSpin();face(d.face);layout();
    msg.textContent=d.msg;msg.style.color=d.col;placeDice();clearHL();
    if(rolled!==null&&!d.busy&&ACT[turn]===mySeat)movable(mySeat,rolled).forEach(i=>EL[mySeat][i].classList.add('hl'));
  }
  else if(d.t==='chat'||d.t==='emo'||d.t==='spk')receive(d);
}

// Voice between phones
function onCall(call){
  call.answer();
  call.on('stream',st=>{
    const a=document.createElement('audio');a.srcObject=st;a.autoplay=true;a.setAttribute('playsinline','');
    document.body.appendChild(a);if(a.play)a.play().catch(()=>{});
  });
}
function callAll(){
  if(!peer||!stream)return;
  peersList.forEach(id=>{if(id!==peer.id)peer.call(id,stream);});
}

// Inputs
dice.onclick=()=>{
  if(net==='client')hostConn.send({t:'roll'});
  else if(net==='host'&&ACT[turn]!==mySeat)toast('Not your turn');
  else if(vsCpu&&ACT[turn]!==0)return;
  else roll();
};
const tokClick=(k,i)=>{
  if(net==='client'){if(k===mySeat)hostConn.send({t:'move',i:i});}
  else if(net==='host'&&k!==mySeat)return;
  else if(vsCpu&&k!==0)return;
  else move(k,i);
};
for(let k=0;k<8;k++)for(let i=0;i<4;i++)EL[k][i].onclick=()=>tokClick(k,i);

['pw','rc'].forEach(id=>$(id).addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'');}));
async function diag(){
  const out=[],show=()=>{$('stt').textContent=out.join(' | ');};
  out.push(navigator.onLine?'Internet: yes':'Internet: NO');
  out.push(typeof Peer!=='undefined'?'Library: ok':'Library: MISSING');
  out.push(window.RTCPeerConnection?'WebRTC: ok':'WebRTC: NOT supported');
  out.push('Server: testing...');show();
  const ok=await new Promise(res=>{
    try{
      const w=new WebSocket('wss://0.peerjs.com/peerjs?key=peerjs&id=lodutest'+Date.now()+'&token=t1');
      const t=setTimeout(()=>{try{w.close();}catch(e){}res(false);},8000);
      w.onopen=()=>{clearTimeout(t);try{w.close();}catch(e){}res(true);};
      w.onerror=()=>{clearTimeout(t);res(false);};
    }catch(e){res(false);}
  });
  out[out.length-1]=ok?'Server: ok':'Server: CANNOT REACH';show();
}
$('dg').onclick=diag;
$('frd').onclick=()=>$('lob').classList.add('show');
$('cr').onclick=createRoom;
$('jn').onclick=joinRoom;
$('st').onclick=startGame;
$('lc').onclick=()=>{if(started)return;leaveNet();$('lob').classList.remove('show');};
$('hb').onclick=()=>{clearTimeout(bt);vsCpu=false;leaveNet();$('gm').style.display='none';home.style.display='block';};

/* ===== Computer players, Event, Inventory, Social, Adda ===== */
function botPick(k,mv,d){
  let best=mv[0],bs=-1;
  mv.forEach(i=>{
    const p=T[k][i],np=p===-1?0:p+d;let s=np/10;
    if(p===-1)s+=40;
    if(np===GOAL)s+=90;else if(np>=HC)s+=50;
    if(np<=L-2){
      const a=(SK(k)+np)%L;
      if(SAFE.has(a))s+=30;
      else for(const o of ACT){if(o===k)continue;if(T[o].some(q=>q>=0&&q<=L-2&&(SK(o)+q)%L===a))s+=100;}
    }
    if(s>bs){bs=s;best=i;}
  });
  return best;
}
function botTick(){
  if(!vsCpu||net!=='local')return;
  const k=ACT[turn];if(k===undefined||k===0)return;
  clearTimeout(bt);
  bt=setTimeout(()=>{
    if(!vsCpu||k!==ACT[turn])return;
    if(busy){botTick();return;}
    if(rolled===null)roll();
    else{const mv=movable(k,rolled);if(mv.length)move(k,botPick(k,mv,rolled));}
  },rolled===null?900:700);
}
const ST={get(k,d){try{const v=localStorage.getItem('lf_'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('lf_'+k,JSON.stringify(v));}catch(e){}}};
let coins=ST.get('coins',1000),gems=ST.get('gems',50),pname=ST.get('name','Player'),pav=ST.get('av','\u{1F9D1}');
let owned=ST.get('owned',['#fff']),diceC=ST.get('dice','#fff');
function refresh(){$('cn').textContent=coins;$('gm2').textContent=gems;$('av').textContent=pav;dice.style.background=diceC;ST.set('coins',coins);ST.set('gems',gems);}
const mk=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt)e.textContent=txt;if(cls)e.className=cls;return e;};
function panel(title,fn){$('pt').textContent=title;$('pb').innerHTML='';fn($('pb'));$('pnl').classList.add('show');}
$('px').onclick=()=>$('pnl').classList.remove('show');
function openLobby(){$('nm').value=pname;$('lob').classList.add('show');}
const QID='99999';
function quickPlay(){quick=true;qTry=0;$('nm').value=pname;$('pw').value=QID;$('rc').value=QID;toast('Finding players...');createRoom();}
$('frd').onclick=openLobby;$('onl').onclick=quickPlay;
$('pnp').onclick=()=>{vsCpu=false;pick.classList.add('show');};
$('bcpu').onclick=()=>{vsCpu=true;pick.classList.add('show');};

const DAYS=[100,150,200,250,300,400,500];
$('nEv').onclick=()=>panel('Daily reward',b=>{
  const today=new Date().toDateString(),y=new Date(Date.now()-864e5).toDateString();
  let st=ST.get('daily',{last:'',streak:0});
  let cur=(st.last===today||st.last===y)?st.streak:0;
  if(cur>=7&&st.last!==today)cur=0;
  const done=st.last===today;
  const g=mk('div',null,'dy');
  DAYS.forEach((v,i)=>{const d=mk('div','Day '+(i+1)+'\n'+v);if(i<cur)d.className='got';else if(i===cur&&!done)d.className='now';g.appendChild(d);});
  b.appendChild(g);
  const c=mk('button',done?'Come back tomorrow':'Claim '+DAYS[cur]+' coins');
  c.disabled=done;
  c.onclick=()=>{coins+=DAYS[cur];ST.set('daily',{last:today,streak:cur+1});refresh();toast('+'+DAYS[cur]+' coins');$('pnl').classList.remove('show');};
  b.appendChild(c);
});

const ITEMS=[['White','#fff',0],['Gold','#ffd54f',200],['Mint','#a5f3d0',100],['Pink','#ffc1e3',100],['Sky','#a8d8ff',100]];
$('nIn').onclick=()=>panel('Inventory: dice color',b=>{
  const draw=()=>{
    b.innerHTML='';b.appendChild(mk('div','Coins: '+coins));
    ITEMS.forEach(([n,c,pr])=>{
      const r=mk('div',null,'rw');const sw=mk('span','\u{1F3B2} '+n);sw.style.color=c;r.appendChild(sw);
      const have=owned.includes(c);
      const b2=mk('button',diceC===c?'In use':have?'Use':'Buy '+pr);
      b2.disabled=diceC===c||(!have&&coins<pr);
      b2.onclick=()=>{if(!have){coins-=pr;owned.push(c);ST.set('owned',owned);}diceC=c;ST.set('dice',c);refresh();draw();};
      r.appendChild(b2);b.appendChild(r);
    });
  };
  draw();
});

const AVS=['\u{1F9D1}','\u{1F466}','\u{1F467}','\u{1F468}','\u{1F469}','\u{1F9D4}','\u{1F60E}','\u{1F431}','\u{1F436}','\u{1F981}'];
$('nSo').onclick=()=>panel('Profile and invite',b=>{
  const inp=mk('input');inp.maxLength=12;inp.value=pname;inp.placeholder='Your name';b.appendChild(inp);
  const av=mk('div',null,'avs');let sel=pav;
  AVS.forEach(a=>{const s=mk('span',a,a===sel?'sel':'');s.onclick=()=>{sel=a;[...av.children].forEach(x=>{x.className=x.textContent===a?'sel':'';});};av.appendChild(s);});
  b.appendChild(av);
  const sv=mk('button','Save');
  sv.onclick=()=>{pname=(inp.value.trim()||'Player').slice(0,12);pav=sel;ST.set('name',pname);ST.set('av',pav);refresh();toast('Saved');};
  const sh=mk('button','Invite friends');
  sh.onclick=()=>{const d={title:'Lodu Family',text:'Play Lodu Family with me!',url:location.href};if(navigator.share)navigator.share(d).catch(()=>{});else toast('Send your friends the game link');};
  b.appendChild(sv);b.appendChild(sh);
  const lo=mk('button','Switch player');lo.onclick=()=>{$('pnl').classList.remove('show');showLogin();};b.appendChild(lo);
});

$('nAd').onclick=()=>panel('Adda (voice room)',b=>{
  b.appendChild(mk('div','Talk with friends while you play. Create a room, share the number, start the game, then tap the mic button.'));
  const o=mk('button','Open room');o.onclick=()=>{$('pnl').classList.remove('show');openLobby();};b.appendChild(o);
});
refresh();
/* ===== Login ===== */
let lgSel=pav;
const lgA=$('lga');
AVS.forEach(a=>{const s=mk('span',a,a===lgSel?'sel':'');s.onclick=()=>{lgSel=a;[...lgA.children].forEach(x=>{x.className=x.textContent===a?'sel':'';});};lgA.appendChild(s);});
function showLogin(){$('lgn').value=ST.get('logged',false)?pname:'';$('lge').textContent='';$('login').classList.add('show');}
function doLogin(guest){
  const n=guest?'Guest'+(100+Math.random()*900|0):$('lgn').value.trim();
  if(!n){$('lge').textContent='Please type your name';return;}
  if(!ST.get('logged',false)){coins+=200;}
  pname=n.slice(0,12);pav=lgSel;ST.set('name',pname);ST.set('av',pav);ST.set('logged',true);
  refresh();$('login').classList.remove('show');toast('Welcome '+pname+'!');
}
$('lgp').onclick=()=>doLogin(false);
$('lgg').onclick=()=>doLogin(true);
$('lgn').onkeydown=e=>{if(e.key==='Enter')doLogin(false);};
if(!ST.get('logged',false))showLogin();
