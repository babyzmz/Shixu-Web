import {reminderOccurrences,reminderLocal} from './creation-model.mjs?v=0.5.6-settings';
window.ShixuCreation={reminderOccurrences,reminderLocal};
import {encode,decode,encrypt,decrypt,merge,canonical,empty,parsePair,authToken} from './sync.mjs?v=0.5.6-settings';
import {installAccount} from './account-ui.mjs?v=0.5.6-settings';
import {installMotion} from './motion.mjs?v=0.5.6-settings';
import {askCloud,prepareAction,renderAssistantText,activityForQuestion} from './assistant-cloud.mjs?v=0.5.6-settings';
import {actionRevision,actionDetails} from './assistant-actions.mjs?v=0.5.6-settings';
import {orbMarkup,installAssistantOrbs} from './assistant-orb.mjs?v=0.5.6-settings';
import {installControls} from './controls.mjs?v=0.5.6-settings';
window.ShixuMotion=installMotion();
installControls();
const app=window.ShixuWeb, $=s=>document.querySelector(s);
app.sameDoc=(a,b)=>canonical(a)===canonical(b);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DOWNLOAD='https://fairyllm.com/shixu/download/';
const DEFAULT_ENDPOINT='https://api.fairyllm.com';
let pair=null,expired=false;
let busy=false,applying=false,lastSync=0,status='未登录 · 本机保存',paused=localStorage.getItem('shixu-sync-paused')==='true';
let messages=[];try{messages=JSON.parse(sessionStorage.getItem('shixu-chat')||'[]');if(!Array.isArray(messages))messages=[];}catch{}
let cloudMode=localStorage.getItem('shixu-ai-mode')!=='local',chatPending=false,consentPending=false,chatAbort=null,chatEpoch=0;
let chatDraft='';let assistantOpen=false;let chatSequence=0;const chatKeys=new WeakMap();const chatKey=m=>{if(!chatKeys.has(m))chatKeys.set(m,++chatSequence);return chatKeys.get(m)};
const column=document.createElement('aside');column.className='web-assistant';column.setAttribute('aria-label','小拾助手');$('.workspace').append(column);
const assistantVisuals=window.ShixuAssistantVisuals=installAssistantOrbs();
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
 return '我可以查询今天、本周、已完成事项，检查时间冲突，或帮你拆解待办和安排日程。直接描述需求即可生成候选，更改由你确认。当前使用本地规则，没有调用云模型。';
}
function actionHTML(m){const pending=(m.actions||[]).filter(p=>p.status==='pending');return (m.error&&m.retryQuestion&&!chatPending?`<div class="row"><button class="btn sm" data-web-action="retry-chat" data-message="${chatKey(m)}">重试</button><button class="btn ghost sm" data-web-action="local-chat" data-message="${chatKey(m)}">本次用本机查询</button></div>`:'')+(m.actions||[]).map((p,n)=>`<section class="assistant-action"><strong>${escape(p.op.label)}</strong>${actionDetails(p.op,app.getState())}<div class="row"><span class="tiny">${escape(p.receipt||({pending:'尚未执行',applying:'正在执行',applied:'已执行',rejected:'已放弃',error:'未执行',superseded:'已被新候选替换'}[p.status]||'已过期'))}</span>${p.status==='pending'?`<button class="btn primary sm" data-web-action="apply-assistant-action" data-message="${chatKey(m)}" data-index="${n}">确认执行</button><button class="btn ghost sm" data-web-action="reject-assistant-action" data-message="${chatKey(m)}" data-index="${n}">放弃</button>`:''}</div></section>`).join('')+(pending.length>1?`<div class="assistant-batch"><span class="tiny muted">逐项核对后，可确认本组；每项单独显示执行结果。</span><button class="btn primary sm" data-web-action="apply-assistant-batch" data-message="${chatKey(m)}">确认本组（${pending.length}项）</button></div>`:'');}
function chatHTML(full=false){
 const proposal=full?app.assistantProposal?.():'';
 const header=full?`<div class="orb-stage">${orbMarkup()}<h1 data-assistant-name>小拾</h1></div>`:`<div class="spread assistant-brand"><div class="assistant-identity">${orbMarkup()}<h3>小拾</h3></div><button class="icon-btn" aria-label="关闭助手" data-web-action="close-assistant">×</button></div>`;
 return `${header}<div class="web-chat" role="log" aria-label="与小拾的对话" aria-live="polite">${messages.map(m=>`<div data-chat-key="${chatKey(m)}" class="chat-message ${m.role==='user'?'user':''}">${m.role==='user'?escape(m.text):m.html+actionHTML(m)}</div>`).join('')}${proposal?`<div class="chat-message assistant-proposal" data-chat-key="proposal"><div id="ai-results">${proposal}</div></div>`:''}</div><form class="web-chat-form" aria-busy="${chatPending}"><textarea class="chat-input" aria-label="助手提问" placeholder="和小拾说说，接下来想做什么…" rows="2" required>${escape(chatDraft)}</textarea><div class="spread composer-tools"><button class="icon-btn" type="button" aria-label="清空聊天" data-web-action="clear-chat">↺</button><div class="row">${chatPending?`<span class="tiny muted" role="status">${escape({thinking:"想一想…",searching:"找一找…",planning:"理一理时间…",focusing:"准备专注…"}[assistantVisuals.stats().state]||"处理中…")}</span>`:""}<button class="text-btn tiny composer-mode" type="button" data-web-action="assistant-mode" aria-label="切换助手模式">${cloudMode&&pair?'DeepSeek V4.1 Flash':'本机查询'}</button>${chatPending?'<button class="btn" type="button" data-web-action="stop-chat">停止</button>':'<button class="btn primary" type="submit" aria-label="发送">发送 ↑</button>'}</div></div></form>`;
}
function renderChat(follow=false){for(const [host,full]of [[column,false],[$('.web-assistant-main'),true]]){if(!host)continue;const chat=host.querySelector('.web-chat'),atBottom=!chat||chat.scrollHeight-chat.scrollTop-chat.clientHeight<64,scroll=chat?.scrollTop||0,lastHeight=Number(chat?.dataset.lastHeight||chat?.scrollHeight||0);const draft=host.querySelector('textarea')?.value;window.ShixuMotion.renderRegion(host,chatHTML(full),{preserveInput:true,layout:false});if(draft!==undefined)host.querySelector('textarea').value=draft;const next=host.querySelector('.web-chat');if(follow||atBottom)next.scrollTop=next.scrollHeight;else{next.scrollTop=scroll;if(chat&&next.scrollHeight>lastHeight){let notice=host.querySelector('.chat-new');if(!notice){notice=document.createElement('button');notice.className='btn sm chat-new';notice.dataset.webAction='chat-latest';notice.textContent='有新消息 ↓';host.querySelector('.web-chat-form').before(notice);}}}next.dataset.lastHeight=next.scrollHeight;}assistantVisuals.refresh();}
async function send(text,forceLocal=false){
 if(!text.trim()||chatPending||consentPending)return;
 const account=pair,useCloud=!forceLocal&&cloudMode&&!!account,question=text.trim();
 if(question.length>4000){app.toast('单条提问请控制在4000字以内');return;}
 if(useCloud&&localStorage.getItem('shixu-ai-consent:'+account.id)!=='yes'){
  consentPending=true;let allowed=false;try{allowed=await window.ShixuConfirm('使用云端小拾会把提问、最近对话及相关事项（标题、备注、日期和完成记录）发送到硅基流动 DeepSeek。聊天留在本机；修改始终先确认。是否开启？');}finally{consentPending=false;}if(!allowed||pair?.id!==account.id)return;
  localStorage.setItem('shixu-ai-consent:'+account.id,'yes');
 }
 const past=[...messages],epoch=++chatEpoch;chatPending=true;chatAbort=new AbortController();
 messages.push({role:'user',text:question});if(!chatDraft.trim()||chatDraft.trim()===question){chatDraft='';document.querySelectorAll('.web-chat-form textarea').forEach(e=>e.value='');}
 assistantVisuals.setState(activityForQuestion(question));renderChat(true);
 try{
  if(useCloud){
   const data=await askCloud(question,app,past,account,AbortSignal.any([chatAbort.signal,AbortSignal.timeout(210000)]),()=>{assistantVisuals.setState('searching');renderChat();});if(epoch!==chatEpoch)return;
   const actions=[];const rejected=[];for(const op of data.actions){try{let original=null,desired=op;const readState=data.readState||app.getState();if(op.replaces){original=messages.flatMap(m=>m.actions||[]).find(p=>p.id===op.replaces&&p.status==='pending');if(!original||original.op.action!==op.action||original.op.id!==op.id)throw Error('原候选已处理或更改了目标，请重新生成');if(original.revision!==actionRevision(original.op,readState))throw Error('原记录已改变，请重新生成候选');desired={...original.op,...op,...(op.item?{item:{...original.op.item,...op.item}}:{}),...(op.patch?{patch:{...original.op.patch,...op.patch}}:{})};}const prepared=prepareAction(desired,readState);if(prepared.revision!==actionRevision(prepared.op,app.getState()))throw Error('生成回复期间原记录已改变，请重新查询');if(original)original.status='superseded';actions.push(prepared)}catch(e){rejected.push(e.message)}}
   const text=data.text+(rejected.length?'\n\n以下候选未生成：'+rejected.join('；'):'');
   messages.push({role:'assistant',text,error:rejected.length>0&&!actions.length,retryQuestion:rejected.length&&!actions.length?question:'',html:(actions.length?'<p class="tiny muted">已准备操作，尚未执行。</p>':'')+renderAssistantText(text,app.getState().items),actions});assistantVisuals.setState(rejected.length&&!actions.length?'error':'replying',actions.length?'confirming':'idle');
  }else{
   const record=!/查询|查看|冲突|已完成/.test(question)&&(/记下|记录|添加|新建|创建|拆解/.test(question)||/(今天|明天|后天|周[一二三四五六日天]).*(有|要).*(活动|会议|开会|评审|预约)/.test(question));
   const html=record?'已准备候选，<strong>尚未创建</strong>。请在回复气泡中核对后确认。日程默认估算为 1 小时；缺失日期或开始时间的候选需要补充。':answer(question);
   if(record)app.prepare(question);messages.push({role:'assistant',html:(forceLocal?'<p class="tiny muted">本机查询（本次）</p>':'')+html});assistantVisuals.setState('replying',record?'confirming':'idle');
  }
 }catch(error){if(epoch!==chatEpoch)return;const stopped=error.name==='AbortError';messages.push({role:'assistant',error:!stopped,retryQuestion:stopped?'':question,html:stopped?'这次已停止，没有自动修改事项。':'这次没有完成：'+escape(error.message||'请稍后重试。')});assistantVisuals.setState(stopped?'idle':'error');}
 finally{if(epoch===chatEpoch){chatPending=false;chatAbort=null;messages=messages.slice(-50);saveMessages();renderChat(true);}}
}
app.hideAssistant=()=>{window.ShixuMotion.assistant(false);assistantOpen=false;$('.workspace').classList.remove('assistant-open');};
function showAssistant(){if(matchMedia('(max-width:899px)').matches){app.nav('ai');return;}if($('#main .web-assistant-main')){app.hideAssistant();renderChat();return;}assistantOpen=!assistantOpen;$('.workspace').classList.toggle('assistant-open',assistantOpen);renderChat();window.ShixuMotion.assistant(assistantOpen);}
window.renderAI=function(){app.hideAssistant();return `<section class="web-assistant-main assistant-page" aria-label="小拾助手">${chatHTML(true)}</section>`;};
app.editAssistantDraft=text=>{chatDraft=text;renderChat();const input=$('.web-assistant-main textarea');if(input){input.value=text;input.focus();}};
const accounts=installAccount(app,{chat(value){if(value!==undefined){chatEpoch++;chatAbort?.abort();chatPending=false;chatAbort=null;assistantVisuals.setState('idle');messages=value;saveMessages();renderChat();}return messages;},reset(){paused=localStorage.getItem('shixu-sync-paused')==='true';expired=false;},changed(value){pair=value;expired=false;status=value?'已登录 · '+value.username:'未登录 · 本机保存';app.render();},busy:()=>busy,status:()=>status,paused:()=>paused,expired:()=>expired,message(text){status=text;repaintStatus();},sync});
pair=accounts.session;if(pair)status='已登录 · '+pair.username;
app.syncSettings=(section)=>section==='account'?`<div class="settings-row"><div><h3>账户与同步</h3><p>${escape(pair?.username||'未登录')}</p></div><button class="btn sm" data-web-action="account-open">${pair?'管理账户':'登录账户'}</button></div>`:`<div class="settings-row"><div><h3>小拾模型</h3><p>DeepSeek V4.1 Flash · 登录后可用</p><p class="tiny">云端密钥由服务端保管，首次发送前授权；改动先确认。可随时切回本机查询。</p></div><div class="sync-actions"><button class="btn sm" data-web-action="assistant-mode">${cloudMode&&pair?'切换本机查询':'启用云端小拾'}</button>${pair?'<button class="btn ghost sm" data-web-action="assistant-revoke">撤销数据发送授权</button>':''}</div></div>`;
window.openHelp=()=>window.location.href='https://fairyllm.com/shixu/help/';
function repaintStatus(){document.querySelectorAll('.sync-indicator,#sync-state').forEach(e=>e.textContent=status);}
window.addEventListener('shixu-render',()=>{
 const profile=$('.profile-name');if(profile)profile.textContent=pair?.username||'我的空间';
 const aside=$('.today-side');if(aside&&!aside.querySelector('.mini-note')){const note=document.createElement('section');note.className='card mini-note';note.innerHTML='<div class="spread"><h3>随手记</h3><button class="icon-btn" data-action="new-note" aria-label="记一张便签">'+window.ic('plus')+'</button></div><button class="btn ghost" data-action="new-note">记一张便签</button>';aside.insertBefore(note,aside.querySelector('.desktop-peek'));}
 const header=$('.header-right');if(header&&!header.querySelector('.web-download')){header.querySelector('.save-state')?.remove();header.querySelector('.separator')?.remove();const links=document.createElement('div');links.className='row web-header-tools';links.innerHTML=`<button class="sync-indicator" data-web-action="account-open" title="打开账户">${escape(status)}</button><a class="btn web-download" href="${DOWNLOAD}" aria-label="下载拾序" rel="noopener noreferrer">${window.ic('download')}<span>下载</span></a>`;header.prepend(links);}
 const profileButton=$('.profile-name');if(profileButton){const entry=document.createElement('button');entry.className='text-btn account-entry';entry.dataset.webAction='account-open';entry.textContent=pair?.username||'登录账户';profileButton.replaceWith(entry);}
 if(assistantOpen&&($('#main .web-assistant-main')||matchMedia('(max-width:899px)').matches))app.hideAssistant();renderChat();
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
 }catch(e){if(e.conflict){paused=true;localStorage.setItem('shixu-sync-paused','true');}status='同步未完成：'+e.message;app.toast(status);}finally{busy=false;repaintStatus();window.dispatchEvent(new Event('shixu-sync-finished'));}
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-web-action]');if(!button)return;const action=button.dataset.webAction;e.preventDefault();
 try{if(await accounts.handle(action))return;switch(action){
 case'assistant':app.nav('ai');break;case'assistant-panel':showAssistant();break;case'close-assistant':app.hideAssistant();break;
 case'assistant-mode':if(chatPending)break;cloudMode=pair?!cloudMode:true;localStorage.setItem('shixu-ai-mode',cloudMode?'cloud':'local');if(cloudMode&&!pair)accounts.open();else if(document.querySelector('#modal-root .settings-row'))app.settings();renderChat();break;
 case'assistant-revoke':if(pair)localStorage.removeItem('shixu-ai-consent:'+pair.id);chatAbort?.abort();cloudMode=false;localStorage.setItem('shixu-ai-mode','local');renderChat();app.settings();break;
 case'retry-chat':case'local-chat':{const m=messages.find(m=>String(chatKey(m))===button.dataset.message);if(m?.retryQuestion)send(m.retryQuestion,action==='local-chat');break;}
 case'stop-chat':chatAbort?.abort();break;
 case'apply-assistant-batch':{
  const m=messages.find(m=>String(chatKey(m))===button.dataset.message),pending=m?.actions?.filter(p=>p.status==='pending')||[];
  if(!pending.length)break;button.disabled=true;
  // Preflight every candidate before the first write; recheck each again when
  // applying. A failure is reported per operation, never as blanket success.
  try{for(const p of pending){if(p.revision!==actionRevision(p.op,app.getState()))throw Error('本组有记录已改变，请重新生成操作');prepareAction(p.op,app.getState());}}
  catch(e){button.disabled=false;app.toast(e.message);assistantVisuals.setState('error');break;}
  for(const p of pending){p.status='applying';try{if(p.revision!==actionRevision(p.op,app.getState()))throw Error('原记录已改变，此项未执行，请重新生成');p.receipt=app.assistantPerform(prepareAction(p.op,app.getState()).op);p.status='applied';}catch(e){p.status='error';p.receipt=e.message;}}
  assistantVisuals.setState(pending.some(p=>p.status==='error')?'error':'replying');saveMessages();renderChat(true);break;
 }
 case'apply-assistant-action':case'reject-assistant-action':{
  const m=messages.find(m=>String(chatKey(m))===button.dataset.message),p=m?.actions?.[Number(button.dataset.index)];if(!p||p.status!=='pending')break;
  if(action==='reject-assistant-action'){p.status='rejected';assistantVisuals.setState('idle');}
  else{p.status='applying';try{if(p.revision!==actionRevision(p.op,app.getState()))throw Error('原记录已改变，请重新生成操作');const checked=prepareAction(p.op,app.getState());p.receipt=app.assistantPerform(checked.op);p.status='applied';assistantVisuals.setState('replying',m.actions.some(a=>a.status==='pending')?'confirming':'idle');}catch(e){p.status='error';p.receipt=e.message;assistantVisuals.setState('error');}}
  saveMessages();renderChat(true);break;
 }
 case'clear-chat':chatEpoch++;chatAbort?.abort();chatPending=false;chatAbort=null;assistantVisuals.setState('idle');messages=[];app.clearAssistantProposal?.();saveMessages();renderChat();break;
 case'source':app.hideAssistant();app.locate(button.dataset.id);break;
 case'plan':app.plan();app.editAssistantDraft('帮我拆解待办：');break;
 case'schedule':app.schedule();break;case'conflicts':send('检查日程冲突');break;
 case'sync':if(paused)accounts.open();else await sync();break;
 case'keep-local':case'keep-cloud':if(!await window.ShixuConfirm('处理前请导出两端备份。确认保留'+(action==='keep-cloud'?'云端':'本机')+'版本？'))break;const remote=JSON.parse(localStorage.getItem('shixu-sync-remote'));if(!remote)throw Error('没有保留的云端版本');if(action==='keep-cloud'){applying=true;try{app.applyDoc(remote);}finally{applying=false;}}localStorage.setItem('shixu-sync-baseline',JSON.stringify(remote));paused=false;localStorage.removeItem('shixu-sync-paused');await sync();accounts.open();break;
 }}catch(error){app.toast(error.message);}
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-web-action=chat-latest]');if(b){const chat=b.parentElement.querySelector('.web-chat');chat.scrollTop=chat.scrollHeight;b.remove();}});
document.addEventListener('input',e=>{if(e.target.matches('.web-chat-form textarea'))chatDraft=e.target.value;});
document.addEventListener('submit',e=>{if(e.target.matches('.web-chat-form')){e.preventDefault();send(e.target.querySelector('textarea').value);}});
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter'&&e.target.closest('.web-chat-form')){e.preventDefault();send(e.target.value);}});
app.syncNow=sync;
let changeSyncTimer;
function queueSync(){clearTimeout(changeSyncTimer);changeSyncTimer=setTimeout(()=>{if(busy||accounts.busy){queueSync();return;}sync();},1000);}
window.addEventListener('shixu-change',()=>{if(!applying)queueSync();});
if('serviceWorker'in navigator&&!window.Capacitor?.isNativePlatform?.())navigator.serviceWorker.register('./sw.js').catch(()=>{});
setInterval(()=>{if(!document.hidden)sync();},60000);window.addEventListener('online',()=>sync());
app.render();renderChat();if(location.hash==='#account')accounts.open();if(pair)sync();
