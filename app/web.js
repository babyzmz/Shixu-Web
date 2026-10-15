import {encode,decode,encrypt,decrypt,merge,canonical,empty,parsePair,authToken} from './sync.mjs?v=0.4.13-1';
import {installAccount} from './account-ui.mjs?v=0.4.13-1';
import {installMotion} from './motion.mjs?v=0.4.13-1';
installMotion();
const app=window.ShixuWeb, $=s=>document.querySelector(s);
app.sameDoc=(a,b)=>canonical(a)===canonical(b);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DOWNLOAD='https://fairyllm.com/shixu/download/';
const DEFAULT_ENDPOINT='https://shixu-sync.zmz1998.workers.dev';
let pair=null,expired=false;
let busy=false,applying=false,lastSync=0,status='未登录 · 本机保存',paused=localStorage.getItem('shixu-sync-paused')==='true';
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
function send(text){if(!text.trim())return;const record=!/查询|查看|冲突|已完成/.test(text)&&(/记下|记录|添加|新建|创建|拆解/.test(text)||/(今天|明天|后天|周[一二三四五六日天]).*(有|要).*(活动|会议|开会|评审|预约)/.test(text));messages.push({role:'user',text:text.trim()},{role:'assistant',html:record?'已准备候选，<strong>尚未创建</strong>。请在下方提案工作台核对后确认。日程默认估算为 1 小时；缺失日期或开始时间的候选需要补充。':answer(text.trim())});messages=messages.slice(-50);saveMessages();if(record)app.prepare(text.trim());renderChat();}
app.hideAssistant=()=>{assistantOpen=false;$('.workspace').classList.remove('assistant-open');};
function showAssistant(){if($('#main .web-assistant-main')){app.hideAssistant();renderChat();return;}assistantOpen=!assistantOpen;$('.workspace').classList.toggle('assistant-open',assistantOpen);renderChat();}
const renderAI=window.renderAI;
window.renderAI=function(){app.hideAssistant();return `<div class="page-head"><h1>全局助手</h1></div><section class="card card-pad web-assistant-main">${chatHTML(true)}</section><details style="margin-top:24px" id="planning-details"><summary class="text-btn">待办拆解与提案</summary>${renderAI()}</details>`;};
const accounts=installAccount(app,{chat(value){if(value!==undefined){messages=value;saveMessages();renderChat();}return messages;},reset(){paused=localStorage.getItem('shixu-sync-paused')==='true';expired=false;},changed(value){pair=value;expired=false;status=value?'已登录 · '+value.username:'未登录 · 本机保存';app.render();},busy:()=>busy,status:()=>status,paused:()=>paused,expired:()=>expired,message(text){status=text;repaintStatus();},sync});
pair=accounts.session;if(pair)status='已登录 · '+pair.username;
app.syncSettings=()=>`<div class="settings-row"><div><h3>账户与同步</h3><p>${escape(pair?.username||'未登录')}</p></div><button class="btn sm" data-web-action="account-open">${pair?'管理账户':'登录账户'}</button></div>`;
window.openHelp=()=>window.location.href='https://fairyllm.com/shixu/help/';
function repaintStatus(){document.querySelectorAll('.sync-indicator,#sync-state').forEach(e=>e.textContent=status);}
window.addEventListener('shixu-render',()=>{
 const profile=$('.profile-name');if(profile)profile.textContent=pair?.username||'我的空间';
 const aside=$('.today-side');if(aside&&!aside.querySelector('.mini-note')){const note=document.createElement('section');note.className='card mini-note';note.innerHTML='<div class="spread"><h3>随手记</h3><button class="icon-btn" data-action="new-note" aria-label="记一张便签">'+window.ic('plus')+'</button></div><button class="btn ghost" data-action="new-note">记一张便签</button>';aside.insertBefore(note,aside.querySelector('.desktop-peek'));}
 const header=$('.header-right');if(header&&!header.querySelector('.web-download')){header.querySelector('.save-state')?.remove();header.querySelector('.separator')?.remove();const links=document.createElement('div');links.className='row web-header-tools';links.innerHTML=`<button class="sync-indicator" data-web-action="account-open" title="打开账户">${escape(status)}</button><a class="btn web-download" href="${DOWNLOAD}" aria-label="下载 Windows 桌面端" rel="noopener noreferrer">${window.ic('download')}<span>桌面端</span></a><button class="icon-btn" aria-label="打开侧边助手" data-web-action="assistant">${window.ic('sparkles')}</button>`;header.prepend(links);}
 const profileButton=$('.profile-name');if(profileButton){const entry=document.createElement('button');entry.className='text-btn account-entry';entry.dataset.webAction='account-open';entry.textContent=pair?.username||'登录账户';profileButton.replaceWith(entry);}
 if(assistantOpen&&$('#main .web-assistant-main'))app.hideAssistant();renderChat();
});
async function responseJSON(response){const reader=response.body.getReader();let length=0;const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>1_600_000){reader.cancel();throw Error('同步响应过大');}chunks.push(value);}const bytes=new Uint8Array(length);let p=0;for(const c of chunks){bytes.set(c,p);p+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));}
async function request(method,body,revision){const response=await fetch(pair.endpoint+'/v2/account/data',{method,headers:{Authorization:'Bearer '+pair.session,...(body?{'Content-Type':'application/json','If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000),redirect:'error'});const data=await responseJSON(response);if(!response.ok&&!(method==='GET'&&response.status===404)){if(response.status===401)expired=true;throw Error(data.error||'HTTP '+response.status);};return data;}
async function sync(){
 if(!pair||expired||busy||accounts.busy||paused)return;busy=true;status='正在加密同步…';repaintStatus();const local=app.cloudDoc();
 try{
 const before=JSON.parse(localStorage.getItem('shixu-sync-baseline')||JSON.stringify(empty()));let cloud=await request('GET');const remote=cloud.envelope?await decrypt(cloud.envelope,pair.token):empty();localStorage.setItem('shixu-sync-remote',JSON.stringify(remote));
 const merged=merge(before,local,remote);if(!cloud.envelope||canonical(merged)!==canonical(remote))cloud=await request('PUT',await encrypt(merged,pair.token),cloud.revision);
 localStorage.setItem('shixu-sync-remote',JSON.stringify(merged));const final=merge(local,app.cloudDoc(),merged);applying=true;try{app.applyDoc(final);}finally{applying=false;}
 localStorage.setItem('shixu-sync-baseline',JSON.stringify(merged));status='已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});lastSync=Date.now();
 }catch(e){if(e.conflict){paused=true;localStorage.setItem('shixu-sync-paused','true');}status='同步未完成：'+e.message;app.toast(status);}finally{busy=false;repaintStatus();}
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-web-action]');if(!button)return;const action=button.dataset.webAction;e.preventDefault();
 try{if(await accounts.handle(action))return;switch(action){
 case'assistant':showAssistant();break;case'close-assistant':app.hideAssistant();break;
 case'clear-chat':messages=[];saveMessages();renderChat();break;
 case'source':app.hideAssistant();app.locate(button.dataset.id);break;
 case'plan':app.plan();$('#planning-details').open=true;$('#ai-input')?.focus();break;
 case'schedule':app.schedule();break;case'conflicts':send('检查日程冲突');break;case'widgets':app.nav('widgets');break;
 case'sync':if(paused)accounts.open();else await sync();break;
 case'keep-local':case'keep-cloud':if(!confirm('处理前请导出两端备份。确认保留'+(action==='keep-cloud'?'云端':'本机')+'版本？'))break;const remote=JSON.parse(localStorage.getItem('shixu-sync-remote'));if(!remote)throw Error('没有保留的云端版本');if(action==='keep-cloud'){applying=true;try{app.applyDoc(remote);}finally{applying=false;}}localStorage.setItem('shixu-sync-baseline',JSON.stringify(remote));paused=false;localStorage.removeItem('shixu-sync-paused');await sync();accounts.open();break;
 }}catch(error){app.toast(error.message);}
});
document.addEventListener('submit',e=>{if(e.target.matches('.web-chat-form')){e.preventDefault();send(e.target.querySelector('textarea').value);}});
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter'&&e.target.closest('.web-chat-form')){e.preventDefault();send(e.target.value);}});
// Replace narrow native browser time inputs with a keyboard/touch accessible rolling selector.
const timeDialog=document.createElement('dialog');timeDialog.className='time-dialog';timeDialog.innerHTML='<h3>选择时间</h3><div class="rollers"><select size="5" aria-label="小时">'+Array.from({length:24},(_,i)=>`<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`).join('')+'</select><select size="5" aria-label="分钟">'+Array.from({length:60},(_,i)=>`<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`).join('')+'</select></div><div class="row"><button class="btn ghost" data-time="clear">清除</button><button class="btn" data-time="cancel">取消</button><button class="btn primary" data-time="save">确认</button></div>';document.body.append(timeDialog);let timeTarget=null;
function rollingInputs(){
 const repeat=$('#edit-repeat');if(repeat)repeat.closest('.form-field').hidden=!/待办/.test($('#dialog-title')?.textContent||'');
 const reminder=$('#edit-reminder');if(reminder&&reminder.type==='datetime-local'){
  reminder.type='hidden';const wrap=document.createElement('div');wrap.className='reminder-fields';
  const date=document.createElement('input');date.type='date';date.setAttribute('aria-label','提醒日期');date.value=reminder.value.slice(0,10);
  const time=document.createElement('input');time.type='time';time.setAttribute('aria-label','提醒时间');time.value=reminder.value.slice(11,16);
  const update=()=>{reminder.value=date.value&&time.value?date.value+'T'+time.value:'';reminder.dispatchEvent(new Event('input',{bubbles:true}));};date.addEventListener('input',update);time.addEventListener('input',update);
  const clear=document.createElement('button');clear.type='button';clear.className='text-btn';clear.textContent='清除提醒';clear.addEventListener('click',()=>{date.value='';time.value='';time.nextElementSibling.querySelector('span').textContent='不设置';update();});
  wrap.append(date,time);reminder.after(wrap,clear);
 }
 document.querySelectorAll('#editor-form input[type="time"],#ai-results input[type="time"]').forEach(input=>{input.type='hidden';const button=document.createElement('button');button.type='button';button.className='rolling-trigger';button.innerHTML='<span>'+escape(input.value||'不设置')+'</span><span>◷</span>';button.setAttribute('aria-label',input.getAttribute('aria-label')||(input.id==='event-end'?'结束时间':input.id==='event-start'?'开始时间':'计划开始时间'));button.addEventListener('click',()=>{timeTarget=input;const [hour,minute]=(input.value||'09:00').split(':');timeDialog.querySelector('[aria-label="小时"]').value=hour;timeDialog.querySelector('[aria-label="分钟"]').value=minute;timeDialog.showModal();});input.after(button);});
}
timeDialog.addEventListener('keydown',e=>e.stopPropagation());
timeDialog.addEventListener('click',e=>{const action=e.target.dataset.time;if(!action)return;if(action!=='cancel'&&timeTarget){timeTarget.value=action==='clear'?'':timeDialog.querySelector('[aria-label="小时"]').value+':'+timeDialog.querySelector('[aria-label="分钟"]').value;timeTarget.nextElementSibling.querySelector('span').textContent=timeTarget.value||'不设置';timeTarget.dispatchEvent(new Event('input',{bubbles:true}));}timeDialog.close();});
new MutationObserver(rollingInputs).observe(document.body,{childList:true,subtree:true});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
setInterval(()=>{if(!document.hidden)sync();},60000);window.addEventListener('online',()=>sync());
app.render();renderChat();rollingInputs();if(location.hash==='#account')accounts.open();if(pair)sync();
