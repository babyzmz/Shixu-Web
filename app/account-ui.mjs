import {credentials,authProof,unwrapPassword,newMaster,newRecovery,validatePassword} from './account.mjs';
import {authToken,empty} from './sync.mjs';
const endpoint='https://api.fairyllm.com';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installAccount(app,hooks){
 let account=null,busy=false;try{account=JSON.parse(localStorage.getItem('shixu-account'));if(account?.endpoint==='https://shixu-sync.zmz1998.workers.dev'){account.endpoint=endpoint;localStorage.setItem('shixu-account',JSON.stringify(account));}}catch{}
 const owner=()=>localStorage.getItem('shixu-account-owner')||'';
 const keys=['shixu-sync-baseline','shixu-sync-remote','shixu-sync-paused'];
 const cache=()=>{if(owner())localStorage.setItem('shixu-account-cache:'+owner(),JSON.stringify({state:app.getState(),meta:keys.map(k=>localStorage.getItem(k)),chat:hooks.chat()}));};
 async function auth(action,data,session){
  const r=await fetch(endpoint+'/v2/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},body:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(20000)});
  const text=await r.text();if(text.length>16000)throw Error('账户响应过大');const v=JSON.parse(text);if(!r.ok)throw Error(v.error||'账户服务暂时不可用');return v;
 }
 function save(v,master){
  const id=v.user?.id;if(!/^[a-f0-9]{32}$/.test(id)||!v.session?.token)throw Error('登录响应不完整');
  if(owner()!==id){cache();let saved=null;try{saved=JSON.parse(localStorage.getItem('shixu-account-cache:'+id));}catch{}
   if(owner()||saved){app.applyScope(saved?.state);hooks.chat(saved?.chat||[]);}
   keys.forEach((k,i)=>{if(saved?.meta?.[i])localStorage.setItem(k,saved.meta[i]);else localStorage.removeItem(k);});
   localStorage.setItem('shixu-account-owner',id);hooks.reset();
  }
  account={id,username:v.user.username,endpoint,token:master,session:v.session.token,authSalt:v.authSalt,expiresAt:v.session.expiresAt};
  localStorage.setItem('shixu-account',JSON.stringify(account));localStorage.removeItem('shixu-pair');hooks.changed(account);
 }
 function open(){app.accountModal(view(),account&&!hooks.expired()?'我的账户':'登录拾序');}
 function view(){
  const input=(name,label,type='text')=>`<label class="form-field"><span>${label}</span><input id="account-${name}" type="${type}" autocomplete="${name==='username'?'username':name==='password'?'current-password':'off'}" maxlength="${name==='username'?32:128}"></label>`;
  const button=(action,label)=>`<button class="btn ${action==='login'?'primary':''} sm" data-web-action="account-${action}" ${busy?'disabled':''}>${label}</button>`;
  return `<section class="account-panel"><h3>Fairy 账户${account?' · '+esc(account.username):''}</h3><p class="sync-detail">登录同一账户，网页与桌面自动同步事项和分类。密钥和聊天留在本机。</p>${!account||hooks.expired()?input('username','用户名')+input('password','密码（至少10个字符）','password')+'<div class="sync-actions">'+button('login','登录')+(!account?button('register','注册账户'):'')+'</div><p class="sync-detail">首次登录会同步当前本机记录。暂不支持找回密码，请妥善保管。</p>':''}${account?'<div class="sync-actions">'+button('logout','退出账户')+'<button class="btn sm" data-web-action="sync">立即同步</button></div><details><summary>修改密码</summary>'+input('current','当前密码','password')+input('next','新密码','password')+button('password','保存新密码')+'</details>':''}<p id="sync-state" class="sync-detail" aria-live="polite">${esc(hooks.status())}</p>${hooks.paused()?'<div class="sync-actions"><button class="btn sm" data-web-action="keep-local">冲突：保留本机</button><button class="btn sm" data-web-action="keep-cloud">冲突：使用云端</button></div>':''}</section>`;
 }
 async function handle(action){
  if(!action.startsWith('account-'))return false;if(busy||hooks.busy())throw Error('请等待当前账户操作或同步结束');
  if(location.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('请通过 HTTPS 安全连接登录账户');
  action=action.slice(8);if(action==='open'){open();return true;}
  const read=name=>document.getElementById('account-'+name)?.value||'';
  const username=read('username'),password=read('password'),next=read('next'),current=read('current');
  busy=true;hooks.message('正在处理账户…');document.querySelectorAll('.account-dialog [data-web-action^="account-"]').forEach(e=>e.disabled=true);
  try{
   if(action==='logout'){
    try{await auth('logout',{},account.session);}catch{}cache();account=null;localStorage.removeItem('shixu-account');localStorage.removeItem('shixu-account-owner');keys.forEach(k=>localStorage.removeItem(k));app.applyScope();hooks.chat([]);hooks.reset();hooks.changed(null);
   }else if(action==='login'){
    validatePassword(password);const challenge=await auth('challenge',{username});const v=await auth('login',{username,authProof:await authProof(password,challenge.authSalt)});save(v,await unwrapPassword(v.keyEnvelope,password,v.keySalt));
   }else if(action==='register'){
    const recovery=newRecovery();let legacy=null;try{legacy=JSON.parse(localStorage.getItem('shixu-pair'));}catch{}
    const master=legacy?.token||newMaster(),c=await credentials(password,master,recovery);
    const v=await auth('register',{username,...c,...(legacy?{legacyAuth:await authToken(master)}:{})});save(v,master);
   }else if(action==='password'){
    const recovery=newRecovery(),c=await credentials(next,account.token,recovery);const v=await auth('password',{...c,currentProof:await authProof(current,account.authSalt)},account.session);save(v,account.token);

   }
  }catch(e){hooks.message('账户操作未完成：'+e.message);throw e;}finally{busy=false;open();}
  if(account)await hooks.sync();return true;
 }
 return {view,open,handle,get session(){return account;},get busy(){return busy;}};
}
