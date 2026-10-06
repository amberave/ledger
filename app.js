// Edit to match your Transaction Type values: [label, sign applied to Net Impact]
const TYPES=[['⭕️ Expense',-1],['✅ Income',1]];
const K='ledger1';let S={accounts:[],cats:[],shops:[],txns:[],rules:[]},F={},lim=100;
try{S=Object.assign(S,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){alert('Could not save: browser storage is blocked or full.')}};
const $=i=>document.getElementById(i),h=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>(n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=s=>{s=String(s??'').replace(/[$,\s]/g,'');if(/^\(.*\)$/.test(s))s='-'+s.slice(1,-1);const n=parseFloat(s);return isNaN(n)?null:n};
const iso=s=>{const m=s.match(/^(\d+)\/(\d+)\/(\d{4})/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:s.slice(0,10)};
function csv(t){const r=[];let row=[],f='',q=0;t=t.replace(/^\uFEFF/,'');for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=0}else f+=c}else if(c=='"')q=1;else if(c==','){row.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);r.push(row);row=[];f=''}else f+=c}
if(f||row.length){row.push(f);r.push(row)}const hd=(r.shift()||[]).map(x=>x.trim());return r.filter(x=>x.some(y=>y.trim())).map(x=>Object.fromEntries(hd.map((k,i)=>[k,(x[i]||'').trim()])))}
const cesc=v=>{v=String(v??'');return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const hue=s=>{let x=0;for(const c of String(s||''))x=(x*47+c.charCodeAt(0))%360;return x},PAL=k=>`hsl(${hue(k)} 60% 50%)`;
const chip=s=>s?`<span class="chip" style="--h:${hue(s)}">${h(s)}</span>`:'';
const today=()=>new Date().toLocaleDateString('en-CA'),z2=n=>String(n).padStart(2,'0');
const opt=(el,a,v,first)=>{el.innerHTML=(first!=null?`<option value="">${first}</option>`:'')+a.map(x=>`<option>${h(x)}</option>`).join('');if(v!=null&&[...el.options].some(o=>o.value==v))el.value=v};
const acct=n=>S.accounts.find(a=>a.name==n),phone=()=>S.txns.filter(t=>!t.hist);
const shops=()=>[...new Set([...S.shops,...S.txns.map(t=>t.shop)].filter(Boolean))].sort((a,b)=>a.localeCompare(b));
const bal=a=>{const t=S.txns.filter(x=>x.acct==a.name),b=(a.init||0)+t.reduce((s,x)=>s+x.net,0);if(a.type!='Shares')return b;
 const p=t.filter(x=>x.price&&x.date).sort((x,y)=>x.date<y.date?1:-1)[0];return b*((p?p.price:a.price)||0)};

// ---------- add form ----------
function fillForm(){opt($('ty'),TYPES.map(t=>t[0]));opt($('ac'),S.accounts.map(a=>a.name),$('ac').value);
 opt($('pc'),[...new Set(S.cats.map(c=>c.p))],$('pc').value);fillCat();fillShop($('sh').value);acChg()}
const fillCat=()=>opt($('ct'),S.cats.filter(c=>c.p==$('pc').value).map(c=>c.c),$('ct').value);
const fillShop=v=>opt($('sh'),['',...shops(),'＋ New shop…'],v);
function acChg(){const a=acct($('ac').value),sh=a&&a.type=='Shares';$('pw').style.display=sh?'block':'none';if(sh&&a.price&&!$('pr').value)$('pr').value=a.price}
$('pc').onchange=fillCat;$('ac').onchange=()=>{$('pr').value='';acChg()};
$('rp').onchange=()=>$('rw').style.display=$('rp').value?'block':'none';
$('sh').onchange=()=>{if($('sh').value[0]=='＋'){const n=(prompt('New company/shop name')||'').trim();if(n&&!shops().includes(n)){S.shops.push(n);save()}fillShop(n)}};
$('sv').onclick=()=>{
 const amt=num($('am').value),a=acct($('ac').value);
 if(!amt||!$('d').value||!a)return $('msg').textContent='Enter a date, amount and account (import accounts on the Sync tab first).';
 const sign=TYPES.find(t=>t[0]==$('ty').value)[1],sh=a.type=='Shares';
 const f={date:$('d').value,type:$('ty').value,name:$('nm').value.trim(),shop:$('sh').value,acct:a.name,net:sign*Math.abs(amt),parent:$('pc').value,price:sh?num($('pr').value):null,cat:$('ct').value,amt:Math.abs(amt),budget:$('bd').value.trim()};
 if($('rp').value){S.rules.push({...f,id:Date.now().toString(36),start:f.date,freq:$('rp').value,end:$('re').value,n:0});genRules()}
 else S.txns.push({id:'P'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),ts:Date.now(),sent:0,...f});
 save();['am','nm','bd'].forEach(i=>$(i).value='');$('rp').value='';$('rp').onchange();
 $('msg').textContent='Saved. Export it from the Sync tab when ready.';render()};

// ---------- recurring ----------
const FQ={w:'Weekly',f:'Fortnightly',m:'Monthly',y:'Yearly'};
function occ(r,n){const[y,m,d]=r.start.split('-').map(Number);
 if(r.freq=='w'||r.freq=='f')return new Date(Date.UTC(y,m-1,d+n*(r.freq=='w'?7:14))).toISOString().slice(0,10);
 const t=m-1+(r.freq=='m'?n:n*12),yy=y+Math.floor(t/12),mm=t%12,last=new Date(Date.UTC(yy,mm+1,0)).getUTCDate();
 return `${yy}-${z2(mm+1)}-${z2(Math.min(d,last))}`}
function genRules(){let c=0;const td=today();
 S.rules.forEach(r=>{if(r.off)return;for(let i=0;i<500;i++){const d=occ(r,r.n);if(d>td||(r.end&&d>r.end))break;
  S.txns.push({id:'R'+r.id+'_'+d,ts:Date.now(),sent:0,date:d,type:r.type,name:r.name,shop:r.shop,acct:r.acct,net:r.net,parent:r.parent,price:r.price,cat:r.cat,amt:r.amt,budget:r.budget});r.n++;c++}});
 if(c)save();return c}
window.rulePause=id=>{const r=S.rules.find(x=>x.id==id);r.off=!r.off;if(!r.off)genRules();save();render()};
window.ruleDel=id=>{if(confirm('Delete this repeat? Transactions already created stay.')){S.rules=S.rules.filter(x=>x.id!=id);save();render()}};

// ---------- transactions ----------
const FF=[['type','Type'],['acct','Account'],['shop','Company/shop'],['parent','Parent category'],['cat','Category']];
const vals=k=>[...new Set(S.txns.map(t=>t[k]).filter(Boolean))].sort();
function filtered(){const q=($('q').value||'').toLowerCase();
 return S.txns.filter(t=>FF.every(([k])=>!F[k]||t[k]==F[k])&&(!F.from||t.date>=F.from)&&(!F.to||t.date<=F.to)&&(!q||[t.name,t.shop,t.cat,t.parent,t.acct,t.budget].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0)}
function renderTx(){const r=filtered(),k=Object.values(F).filter(Boolean).length;$('fo').textContent='Filter'+(k?` (${k})`:'');
 $('ts').textContent=`${r.length} of ${S.txns.length} · net ${money(r.reduce((s,t)=>s+t.net,0))}`;
 $('tl').innerHTML=r.slice(0,lim).map(t=>`<div class="tx" style="--h:${hue(t.type)}"><div class="top"><b>${h(t.name||t.cat||t.type)}</b><span class="amt ${t.net<0?'n':''}">${t.net?money(t.net):''}</span></div>
 <small>${h(t.date)}${t.shop?' · '+h(t.shop):''}${t.hist||t.sent?'':' · not exported'}</small><div>${chip(t.type)}${chip(t.acct)}${chip(t.parent)}${chip(t.cat)}</div></div>`).join('')||'<p class="mute">No transactions match.</p>';
 $('more').style.display=r.length>lim?'block':'none'}
$('more').onclick=()=>{lim+=100;renderTx()};$('q').oninput=()=>{lim=100;renderTx()};
$('fo').onclick=()=>{$('ff').innerHTML=FF.map(([k,l])=>`<label>${l}</label><select id="f_${k}"></select>`).join('')+'<div class="row"><div><label>From</label><input type="date" id="f_from"></div><div><label>To</label><input type="date" id="f_to"></div></div>';
 FF.forEach(([k])=>opt($('f_'+k),vals(k),F[k]||'','All'));$('f_from').value=F.from||'';$('f_to').value=F.to||'';$('fd').showModal()};
$('fa').onclick=()=>{[...FF.map(x=>x[0]),'from','to'].forEach(k=>F[k]=$('f_'+k).value);lim=100;$('fd').close();renderTx()};
$('fr').onclick=()=>{F={};$('fd').close();renderTx()};

// ---------- charts ----------
function donut(items){const tot=items.reduce((s,x)=>s+x[1],0);if(!tot)return'<p class="mute">No data.</p>';let o=0;const C=2*Math.PI*40;
 return`<div class="dn"><svg viewBox="0 0 120 120" width="150">${items.map(([k,v])=>{const l=v/tot*C,s=`<circle r="40" cx="60" cy="60" fill="none" stroke="${PAL(k)}" stroke-width="22" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-o}" transform="rotate(-90 60 60)"><title>${h(k)}: ${money(v)}</title></circle>`;o+=l;return s}).join('')}</svg>
 <div>${items.map(([k,v])=>`<div class="lg"><i style="background:${PAL(k)}"></i>${h(k)} <span class="mute">${money(v)}</span></div>`).join('')}</div></div>`}
function plot(pts,kind){if(!pts.length)return'<p class="mute">No data.</p>';const W=320,H=150,m=Math.max(...pts.map(p=>p[1]),1),y=v=>H-20-v/m*(H-36),bw=(W-20)/pts.length;
 const body=kind=='line'?`<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="${pts.map((p,i)=>`${10+i*(W-20)/Math.max(pts.length-1,1)},${y(p[1])}`).join(' ')}"/>`
  :pts.map((p,i)=>`<rect x="${10+i*bw+1}" y="${y(p[1])}" width="${Math.max(bw-2,1)}" height="${H-20-y(p[1])}" fill="var(--acc)"><title>${p[0]}: ${money(p[1])}</title></rect>`).join('');
 return`<svg viewBox="0 0 ${W} ${H}" width="100%">${body}<text x="10" y="${H-5}" class="ax">${pts[0][0]}</text><text x="${W-10}" y="${H-5}" text-anchor="end" class="ax">${pts.at(-1)[0]}</text><text x="10" y="10" class="ax">max ${money(m)}</text></svg>`}
function mrange(a,b){const r=[];let[y,m]=a.split('-').map(Number);while(`${y}-${z2(m)}`<=b&&r.length<600){r.push(`${y}-${z2(m)}`);if(++m>12){m=1;y++}}return r}
function bars(e){const mx=e.length?e[0][1]:1;return e.length?e.map(([k,v])=>`<div class="bar"><span>${h(k)}</span><span><i style="width:${v/mx*100}%;background:${PAL(k)}"></i></span><span class="amt">${money(v)}</span></div>`).join(''):'<p class="mute">No data.</p>'}
function renderCharts(){
 $('c0').innerHTML=donut(S.accounts.map(a=>[a.name,bal(a)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]));
 const ex=S.txns.filter(t=>t.net<0&&t.date.length>=7),s={};ex.forEach(t=>s[t.date.slice(0,7)]=(s[t.date.slice(0,7)]||0)-t.net);
 const ks=Object.keys(s).sort();$('c1').innerHTML=ks.length?plot(mrange(ks[0],ks.at(-1)).map(k=>[k,s[k]||0]),'line'):plot([]);
 const yrs=[...new Set(S.txns.map(t=>t.date.slice(0,4)).filter(Boolean))].sort().reverse();let v=$('ey').value;
 if(!$('ey').dataset.i&&yrs.length){$('ey').dataset.i=1;v=yrs[0]}opt($('ey'),yrs,v,'All years');
 if(!$('em').options.length)$('em').innerHTML='<option value="">All months</option>'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>`<option value="${z2(i+1)}">${m}</option>`).join('');
 const y=$('ey').value;$('em').disabled=!y;if(!y)$('em').value='';const mo=$('em').value,k=$('ek').value,g=$('eg').value,pre=y&&mo?`${y}-${mo}`:y;
 const rows=S.txns.filter(t=>(k=='e'?t.net<0:t.net>0)&&t.date.length>=7&&t.date.startsWith(pre||''));
 const sum={};rows.forEach(t=>{const d=y&&mo?t.date:t.date.slice(0,7);sum[d]=(sum[d]||0)+Math.abs(t.net)});
 let keys;if(y&&mo)keys=[...Array(new Date(+y,+mo,0).getDate())].map((_,i)=>`${y}-${mo}-${z2(i+1)}`);else if(y)keys=[...Array(12)].map((_,i)=>`${y}-${z2(i+1)}`);else{const a=Object.keys(sum).sort();keys=a.length?mrange(a[0],a.at(-1)):[]}
 $('t2').textContent=(k=='e'?'Spending':'Income')+' by '+(y&&mo?'day':'month')+' · '+money(rows.reduce((s,t)=>s+Math.abs(t.net),0));
 $('c2').innerHTML=plot(keys.map(d=>[d,sum[d]||0]),'bars');
 const gr={};rows.forEach(t=>{const key=t[g]||'(none)';gr[key]=(gr[key]||0)+Math.abs(t.net)});
 $('c3').innerHTML=bars(Object.entries(gr).sort((a,b)=>b[1]-a[1]).slice(0,15))}
['ek','ey','em','eg'].forEach(i=>$(i).onchange=renderCharts);

// ---------- accounts / recurring / sync ----------
function render(){
 $('d').value=$('d').value||today();
 const b=S.accounts.map(a=>[a,bal(a)]);
 $('al').innerHTML=b.length?`<div class="li"><b>Total</b><b class="amt">${money(b.reduce((s,x)=>s+x[1],0))}</b></div>`+b.map(([a,v])=>`<div class="li"><div>${h(a.name)}<small>${chip(a.type)}</small></div><div class="amt ${v<0?'n':''}">${money(v)}</div></div>`).join('')
  :'<p class="mute">No accounts yet. Save your Accounts table as CSV and import it on the Sync tab.</p>';
 $('rl2').innerHTML=S.rules.map(r=>`<div class="li"><div>${h(r.name||r.cat)}<small>${FQ[r.freq]} · next ${r.off?'paused':occ(r,r.n)}${r.end?' · until '+r.end:''}</small>${chip(r.acct)}${chip(r.cat)}
  <br><button class="s sm" onclick="rulePause('${r.id}')">${r.off?'Resume':'Pause'}</button><button class="s sm" onclick="ruleDel('${r.id}')">Delete</button></div><div class="amt ${r.net<0?'n':''}">${money(r.net)}</div></div>`).join('')||'<p class="mute">No repeating transactions yet.</p>';
 const p=phone(),u=p.filter(t=>!t.sent).length;
 $('st').textContent=`${u} not yet exported · ${p.length} entered on this phone · ${S.txns.length-p.length} history rows · ${S.accounts.length} accounts · ${shops().length} shops`;
 $('rl').innerHTML=p.slice(-10).reverse().map(t=>`<div class="li"><div>${h(t.name||t.cat)}<small>${t.date} · ${h(t.acct)}${t.sent?'':' · not exported'}</small></div><div class="amt ${t.net<0?'n':''}">${money(t.net)}</div></div>`).join('')||'<p class="mute">Nothing yet.</p>';
 renderTx();renderCharts()}

const COLS=['Transaction Date','Transaction Type','Transaction Name','Company/Shop','Linked Account','Net Impact','Parent Category','Share Price','Spending Category','Transaction Amount','Affected Budget','Phone ID'];
function exp(all){const r=phone().filter(t=>all||!t.sent);if(!r.length)return alert('Nothing to export.');
 const rows=r.map(t=>[t.date,t.type,t.name,t.shop,t.acct,t.net.toFixed(2),t.parent,t.price??'',t.cat,t.amt.toFixed(2),t.budget,t.id]);
 const b=new Blob(['\uFEFF'+[COLS,...rows].map(x=>x.map(cesc).join(',')).join('\r\n')],{type:'text/csv'}),a=document.createElement('a'),n=new Date();
 a.href=URL.createObjectURL(b);a.download=`phone_txns_${n.getFullYear()}${z2(n.getMonth()+1)}${z2(n.getDate())}_${z2(n.getHours())}${z2(n.getMinutes())}${z2(n.getSeconds())}.csv`;a.click();
 r.forEach(t=>t.sent=1);save();render()}
async function put(name,text){const b=new Blob(['\uFEFF'+text],{type:'text/csv'});
 if(window.showSaveFilePicker){try{const fh=await showSaveFilePicker({suggestedName:name,types:[{description:'CSV',accept:{'text/csv':['.csv']}}]});const w=await fh.createWritable();await w.write(b);await w.close();return 1}catch(e){if(e.name=='AbortError')return 0}}
 const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();return 1}
async function expFull(){if(!S.txns.length)return alert('Nothing to export.');
 const rows=S.txns.map(t=>[t.date,t.type,t.name,t.shop,t.acct,t.net?t.net.toFixed(2):'',t.parent,t.price??'',t.cat,t.amt?t.amt.toFixed(2):'',t.budget,/^H\d+$/.test(t.id)?'':t.id]);
 if(await put('transactions.csv',[COLS,...rows].map(x=>x.map(cesc).join(',')).join('\r\n'))){phone().forEach(t=>t.sent=1);save();render()}}
$('exf').onclick=expFull;
$('ex').onclick=()=>exp(0);$('exa').onclick=()=>exp(1);
$('im').onchange=async e=>{const log=[];
 for(const f of e.target.files){const r=csv(await f.text()),x0=r[0]||{};
  if('Account Name'in x0){S.accounts=r.filter(x=>x['Account Name']).map(x=>({type:x.Type,name:x['Account Name'],init:num(x['Initial Balance'])||0,price:num(x['Latest Share Price'])}));log.push('accounts')}
  else if('Category Name'in x0){S.cats=r.filter(x=>x['Category Name']).map(x=>({p:x['Parent Category Name'],c:x['Category Name']}));log.push('categories')}
  else if('Transaction Date'in x0){const hs=r.map((x,i)=>({hist:1,id:x['Phone ID']||'H'+i,date:iso(x['Transaction Date']),type:x['Transaction Type'],name:x['Transaction Name'],shop:x['Company/Shop'],acct:x['Linked Account'],net:num(x['Net Impact'])||0,price:num(x['Share Price']),parent:x['Parent Category'],cat:x['Spending Category'],amt:num(x['Transaction Amount'])||0,budget:x['Affected Budget']}));
   const ids=new Set(hs.map(x=>x.id));S.txns=[...hs,...S.txns.filter(t=>!t.hist&&!ids.has(t.id))];log.push(hs.length+' history rows')}
  else if('Company/Shop'in x0){S.shops=r.map(x=>x['Company/Shop']).filter(Boolean);log.push('shops')}
  else log.push('skipped '+f.name)}
 save();fillForm();render();alert('Imported: '+log.join(', '));e.target.value=''};
$('clr').onclick=()=>{if(confirm('Delete all data on this phone? Unexported transactions will be lost.')){S={accounts:[],cats:[],shops:[],txns:[],rules:[]};save();fillForm();render()}};

const tabs=[...document.querySelectorAll('nav a')];
function nav(){const t=(location.hash||'#add').slice(1);document.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on',s.id==t));tabs.forEach(a=>a.classList.toggle('on',a.hash=='#'+t));scrollTo(0,0)}
addEventListener('hashchange',nav);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&genRules())render()});
genRules();fillForm();render();nav();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
