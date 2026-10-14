import {encode,decode,encrypt,decrypt,merge,canonical,empty,parsePair} from './sync.mjs';
const app=window.ShixuWeb, $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DOWNLOAD='https://pub-bbcf2c5767b64bb9a7dd1195e93902b1.r2.dev/Shixu-0.4.4-win-x64.zip';
const DEFAULT_ENDPOINT='https://shixu-sync.zmz1998.workers.dev';
let pair=null;try{pair=JSON.parse(localStorage.getItem('shixu-pair'));}catch{}
let busy=false,applying=false,lastSync=0,status=pair?'等待同步':'本机保存 · 未配对',paused=localStorage.getItem('shixu-sync-paused')==='true';
let messages=[];try{messages=JSON.parse(sessionStorage.getItem('shixu-chat')||'[]');if(!Array.isArray(messages))messages=[];}catch{}
let assistantOpen=false;
const column=document.createElement('aside');column.className='web-assistant';column.setAttribute('aria-label','拾序助手');$('.workspace').append(column);
const saveMessages=()=>sessionStorage.setItem('shixu-chat',JSON.stringify(messages.slice(-50)));
const source=i=>`<a href="#record-${escape(i.id)}" data-web-action="source" data-id="${escape(i.id)}">↗ ${escape(i.title)}</a>`;
function answer(text){
 const state=app.getState();const now=new Date();const day=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);const today=day(now);let from='',to='';
 if(/冲突|重叠/.test(text)){const found=app.conflicts();return found.length?'<strong>发现 '+found.length+' 处时间重叠</strong><br>'+found.map(([a,b])=>source(a)+' 与 '+source(b)).join('<br>'):'已检查有具体时段的待办与日程，未发现时间重叠。尚未安排时段的待办无法参与检查。';}
 if(/本周|这周/.test(text)){const start=new Date(now);start.setDate(start.getDate()-((start.getDay()+6)%7));const end=new Date(start);end.setDate(end.getDate()+6);from=day(start);to=day(end);}
 else if(/今天|今日/.test(text)){from=to=today;}
 let values=state.items.filter(i=>/便签/.test(text)?i.type==='note':/日程|事件/.test(text)?i.type==='event':i.type==='task');
 values=values.filter(i=>/已完成/.test(text)?i.status==='done':i.status!=='done');
 if(from)values=values.filter(i=>i.type==='event'?i.planDate<=to&&i.endDate>=from:[i.planDate,i.dueDate,i.remindAt?.slice(0,10)].some(d=>d&&d>=from&&d<=to)||from===today&&i.dueDate&&i.dueDate<today);
 if(/待办|事项|本周|今天|日程|事件|便签|已完成/.test(text))return `<strong>找到 ${values.length} 条${from?'（'+from+' 至 '+to+'）':''}</strong>`+(values.length?'<table><thead><tr><th>原始记录</th><th>日期 / 时间</th><th>分类</th></tr></thead><tbody>'+values.slice(0,100).map(i=>`<tr><td>${source(i)}</td><td>${escape((i.planDate||i.dueDate||'待安排')+' '+(i.startTime||''))}</td><td>${escape(state.categories.find(c=>c.id===i.category)?.name||'未分类')}</td></tr>`).join('')+'</tbody></table>':'<p>可新建事项，或切换查询时间范围。</p>')+(values.length>100?'<p>仅显示前100条，请缩小范围。</p>':'');
 return '我可以查询今天、本周、已完成事项，检查时间冲突，或帮你拆解待办和安排日程。点击下方快捷操作生成候选，更改由你确认。当前使用本地规则，没有调用云模型。';
}
const actions=()=>`<div class="sync-actions"><button class="btn sm" data-web-action="plan">拆待办</button><button class="btn sm" data-web-action="schedule">排日程</button><button class="btn sm" data-web-action="conflicts">查冲突</button><button class="btn sm" data-web-action="widgets">网页组件</button></div>`;
function chatHTML(full=false){return `<div class="spread"><h3>拾序助手</h3><div class="row"><button class="icon-btn" aria-label="清空聊天" data-web-action="clear-chat">↺</button>${full?'':'<button class="icon-btn" aria-label="关闭助手" data-web-action="close-assistant">×</button>'}</div></div><p class="tiny muted">跨页面查询 · 本地规则 · 修改先确认</p><div class="web-chat" aria-live="polite">${messages.map(m=>`<div class="chat-message ${m.role==='user'?'user':''}">${m.role==='user'?escape(m.text):m.html}</div>`).join('')||'<div class="chat-message">试着问“本周待办”或“检查日程冲突”。回复里的事项可以直接定位到日历。</div>'}</div>${actions()}<form class="web-chat-form"><textarea class="chat-input" aria-label="助手提问" placeholder="查询事项，或者检查时间冲突…" rows="3" required></textarea><div class="spread" style="margin-top:10px"><span class="tiny muted">Ctrl+Enter 发送</span><button class="btn primary" type="submit">发送 ↑</button></div></form>`;}
function renderChat(){column.innerHTML=chatHTML();const main=$('.web-assistant-main');if(main)main.innerHTML=chatHTML(true);requestAnimationFrame(()=>document.querySelectorAll('.web-chat').forEach(e=>e.scrollTop=e.scrollHeight));}
function send(text){if(!text.trim())return;messages.push({role:'user',text:text.trim()},{role:'assistant',html:answer(text.trim())});messages=messages.slice(-50);saveMessages();renderChat();}
app.hideAssistant=()=>{assistantOpen=false;$('.workspace').classList.remove('assistant-open');};
function showAssistant(){if($('#main .web-assistant-main')){app.hideAssistant();renderChat();return;}assistantOpen=!assistantOpen;$('.workspace').classList.toggle('assistant-open',assistantOpen);renderChat();}
const renderAI=window.renderAI;
window.renderAI=function(){app.hideAssistant();return `<div class="page-head"><div><h1>全局助手</h1><p class="page-sub">查询、拆解与排期，都从你的事项出发。</p></div><span class="chip violet">本地助手</span></div><section class="card card-pad web-assistant-main">${chatHTML(true)}</section><details style="margin-top:24px" id="planning-details"><summary class="text-btn">展开待办拆解与提案工作台</summary>${renderAI()}</details>`;};
function syncView(){return `<section><h3>网页与桌面同步</h3><p class="sync-detail">事项与分类上传前加密，API 密钥和桌面窗口位置留在本机。先在桌面“设置 → 网页与桌面同步”建立私有空间，再粘贴配对码。持有码可访问该空间，请保存在自己的设备。</p><textarea class="pair-box" id="web-pair-code" aria-label="设备配对码" placeholder="粘贴 shixu1. 开头的完整配对码"></textarea><div class="sync-actions"><button class="btn primary sm" data-web-action="pair">连接私有空间</button><button class="btn sm" data-web-action="sync">立即同步</button><button class="btn sm" data-web-action="disconnect">断开</button></div><p id="sync-state" class="sync-detail">${escape(status)}</p>${paused?'<div class="sync-actions"><button class="btn sm" data-web-action="keep-local">冲突：保留本机</button><button class="btn sm" data-web-action="keep-cloud">冲突：使用云端</button></div><p class="sync-detail">处理前请在两端导出备份；同一记录的并发修改不会自动覆盖。</p>':''}<p class="sync-detail">配对后每分钟同步一次。清除浏览器数据前请导出备份。</p></section><div class="settings-row"><div><h3>Windows 桌面端 0.4.4</h3><p>原生桌面组件、托盘提醒、全局助手与自动更新。</p></div><a class="btn sm" href="${DOWNLOAD}" rel="noopener noreferrer">下载 win-x64</a></div>`;}
app.syncSettings=syncView;
function repaintStatus(){document.querySelectorAll('.sync-indicator,#sync-state').forEach(e=>e.textContent=status);}
window.addEventListener('shixu-render',()=>{
 const aside=$('.today-side');if(aside&&!aside.querySelector('.mini-note')){const note=document.createElement('section');note.className='card mini-note';note.innerHTML='<div class="spread"><span class="eyebrow">随手记</span><button class="icon-btn small-btn" data-action="new-note" aria-label="记一张便签">↗</button></div><h3>留住一个想法</h3><p>先写下来，不必马上变成待办。</p>';aside.insertBefore(note,aside.querySelector('.desktop-peek'));}
 const header=$('.header-right');if(header&&!header.querySelector('.web-download')){const links=document.createElement('div');links.className='row';links.innerHTML=`<span class="sync-indicator" title="设备同步状态">${escape(status)}</span><a class="web-download" href="${DOWNLOAD}" rel="noopener noreferrer">↓ Windows</a><button class="icon-btn" aria-label="打开侧边助手" data-web-action="assistant">☏</button>`;header.prepend(links);}
 if(assistantOpen&&$('#main .web-assistant-main'))app.hideAssistant();renderChat();
});
async function responseJSON(response){const reader=response.body.getReader();let length=0;const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>1_600_000){reader.cancel();throw Error('同步响应过大');}chunks.push(value);}const bytes=new Uint8Array(length);let p=0;for(const c of chunks){bytes.set(c,p);p+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));}
async function request(method,body,revision){const response=await fetch(pair.endpoint+'/v1/space',{method,headers:{Authorization:'Bearer '+pair.token,...(body?{'Content-Type':'application/json','If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000),redirect:'error'});const data=await responseJSON(response);if(!response.ok&&!(method==='GET'&&response.status===404))throw Error(data.error||'HTTP '+response.status);return data;}
async function sync(){
 if(!pair||busy||paused)return;busy=true;status='正在加密同步…';repaintStatus();const local=app.cloudDoc();
 try{
 const before=JSON.parse(localStorage.getItem('shixu-sync-baseline')||JSON.stringify(empty()));let cloud=await request('GET');const remote=cloud.envelope?await decrypt(cloud.envelope,pair.token):empty();localStorage.setItem('shixu-sync-remote',JSON.stringify(remote));
 const merged=merge(before,local,remote);if(!cloud.envelope||canonical(merged)!==canonical(remote))cloud=await request('PUT',await encrypt(merged,pair.token),cloud.revision);
 const final=merge(local,app.cloudDoc(),merged);applying=true;try{app.applyDoc(final);}finally{applying=false;}
 localStorage.setItem('shixu-sync-baseline',JSON.stringify(merged));status='已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});lastSync=Date.now();
 }catch(e){if(e.conflict){paused=true;localStorage.setItem('shixu-sync-paused','true');}status='同步未完成：'+e.message;app.toast(status);}finally{busy=false;repaintStatus();}
}
async function connect(code){if(pair)throw Error('已配对，请先断开，避免切换空间');const candidate=parsePair(code);if(candidate.endpoint!==DEFAULT_ENDPOINT)throw Error('此版本只连接拾序官方测试同步服务');if(!confirm('将本机事项与分类加密同步到 '+new URL(candidate.endpoint).hostname+'？API 密钥不会上传。'))return;pair=candidate;localStorage.setItem('shixu-pair',JSON.stringify(pair));localStorage.setItem('shixu-sync-baseline',JSON.stringify(empty()));localStorage.removeItem('shixu-sync-paused');paused=false;await sync();app.settings();}
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-web-action]');if(!button)return;const action=button.dataset.webAction;e.preventDefault();
 try{switch(action){
 case'assistant':showAssistant();break;case'close-assistant':app.hideAssistant();break;
 case'clear-chat':messages=[];saveMessages();renderChat();break;
 case'source':app.hideAssistant();app.locate(button.dataset.id);break;
 case'plan':app.plan();$('#planning-details').open=true;$('#ai-input')?.focus();break;
 case'schedule':app.schedule();break;case'conflicts':send('检查日程冲突');break;case'widgets':app.nav('widgets');break;
 case'pair':await connect($('#web-pair-code').value.trim());break;case'sync':if(paused)app.settings();else await sync();break;
 case'disconnect':if(busy)throw Error('请等待当前同步结束');if(confirm('断开此浏览器的同步？本机事项保留，云端空间未删除。')){pair=null;localStorage.removeItem('shixu-pair');status='已断开 · 本机记录保留';app.settings();app.render();}break;
 case'keep-local':case'keep-cloud':if(!confirm('处理前请导出两端备份。确认保留'+(action==='keep-cloud'?'云端':'本机')+'版本？'))break;const remote=JSON.parse(localStorage.getItem('shixu-sync-remote'));if(!remote)throw Error('没有保留的云端版本');if(action==='keep-cloud'){applying=true;try{app.applyDoc(remote);}finally{applying=false;}}localStorage.setItem('shixu-sync-baseline',JSON.stringify(remote));paused=false;localStorage.removeItem('shixu-sync-paused');await sync();app.settings();break;
 }}catch(error){app.toast(error.message);}
});
document.addEventListener('submit',e=>{if(e.target.matches('.web-chat-form')){e.preventDefault();send(e.target.querySelector('textarea').value);}});
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter'&&e.target.closest('.web-chat-form')){e.preventDefault();send(e.target.value);}});
// Replace narrow native browser time inputs with a keyboard/touch accessible rolling selector.
const timeDialog=document.createElement('dialog');timeDialog.className='time-dialog';timeDialog.innerHTML='<h3>选择时间</h3><div class="rollers"><select size="5" aria-label="小时">'+Array.from({length:24},(_,i)=>`<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`).join('')+'</select><select size="5" aria-label="分钟">'+Array.from({length:60},(_,i)=>`<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`).join('')+'</select></div><div class="row"><button class="btn ghost" data-time="clear">清除</button><button class="btn" data-time="cancel">取消</button><button class="btn primary" data-time="save">确认</button></div>';document.body.append(timeDialog);let timeTarget=null;
function rollingInputs(){const repeat=$('#edit-repeat');if(repeat)repeat.closest('.form-field').hidden=!/待办/.test($('#dialog-title')?.textContent||'');document.querySelectorAll('#editor-form input[type="time"]').forEach(input=>{input.type='hidden';const button=document.createElement('button');button.type='button';button.className='rolling-trigger';button.innerHTML='<span>'+escape(input.value||'不设置')+'</span><span>◷</span>';button.setAttribute('aria-label',input.id==='event-end'?'结束时间':input.id==='event-start'?'开始时间':'计划开始时间');button.addEventListener('click',()=>{timeTarget=input;const [hour,minute]=(input.value||'09:00').split(':');timeDialog.querySelector('[aria-label="小时"]').value=hour;timeDialog.querySelector('[aria-label="分钟"]').value=minute;timeDialog.showModal();});input.after(button);});}
timeDialog.addEventListener('keydown',e=>e.stopPropagation());
timeDialog.addEventListener('click',e=>{const action=e.target.dataset.time;if(!action)return;if(action!=='cancel'&&timeTarget){timeTarget.value=action==='clear'?'':timeDialog.querySelector('[aria-label="小时"]').value+':'+timeDialog.querySelector('[aria-label="分钟"]').value;timeTarget.nextElementSibling.querySelector('span').textContent=timeTarget.value||'不设置';timeTarget.dispatchEvent(new Event('input',{bubbles:true}));}timeDialog.close();});
new MutationObserver(rollingInputs).observe(document.body,{childList:true,subtree:true});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
setInterval(()=>{if(!document.hidden)sync();},60000);window.addEventListener('online',()=>sync());
app.render();renderChat();rollingInputs();if(pair)sync();
