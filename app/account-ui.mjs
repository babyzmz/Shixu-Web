import {credentials,authProof,unwrapPassword,unwrapRecovery,newMaster,newRecovery,recoveryProof,validatePassword} from './account.mjs';
import {authToken,empty} from './sync.mjs';
const endpoint='https://shixu-sync.zmz1998.workers.dev';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installAccount(app,hooks){
 let account=null,busy=false,code='';try{account=JSON.parse(localStorage.getItem('shixu-account'));}catch{}
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
  return `<section class="account-panel"><h3>Fairy 账户${account?' · '+esc(account.username):''}</h3><p class="sync-detail">登录同一账户，网页与桌面自动同步事项和分类。密钥和聊天留在本机。</p>${!account||hooks.expired()?input('username','用户名')+input('password','密码（至少10个字符）','password')+'<div class="sync-actions">'+button('login','登录')+(!account?button('register','注册账户'):'')+'</div><p class="sync-detail">首次登录会同步当前本机记录。</p>':''}${!account?'<details><summary>忘记密码</summary>'+input('recovery','恢复码','password')+input('next','新密码','password')+button('recover','重置密码')+'</details>':''}${account?'<div class="sync-actions">'+button('logout','退出账户')+'<button class="btn sm" data-web-action="sync">立即同步</button></div><details><summary>修改密码</summary>'+input('current','当前密码','password')+input('next','新密码','password')+button('password','保存新密码')+'</details>':''}${code?'<div class="account-recovery"><strong>保存你的恢复码</strong><p>忘记密码时需要它。密码与恢复码都丢失后无法找回加密记录。</p><input readonly aria-label="恢复码" value="'+esc(code)+'"><div class="sync-actions">'+button('copy','复制恢复码')+button('dismiss','已保存')+'</div></div>':''}<p id="sync-state" class="sync-detail" aria-live="polite">${esc(hooks.status())}</p>${hooks.paused()?'<div class="sync-actions"><button class="btn sm" data-web-action="keep-local">冲突：保留本机</button><button class="btn sm" data-web-action="keep-cloud">冲突：使用云端</button></div>':''}</section>`;
 }
 async function handle(action){
  if(!action.startsWith('account-'))return false;if(busy||hooks.busy())throw Error('请等待当前账户操作或同步结束');
  if(location.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('请通过 HTTPS 安全连接登录账户');
  action=action.slice(8);if(action==='open'){open();return true;}if(action==='copy'){await navigator.clipboard.writeText(code);app.toast('恢复码已复制');return true;}if(action==='dismiss'){code='';open();return true;}
  const read=name=>document.getElementById('account-'+name)?.value||'';
  const username=read('username'),password=read('password'),next=read('next'),recovery=read('recovery'),current=read('current');
  busy=true;hooks.message('正在处理账户…');document.querySelectorAll('[data-web-action^="account-"]').forEach(e=>e.disabled=true);
  try{
   if(action==='logout'){
    try{await auth('logout',{},account.session);}catch{}cache();account=null;localStorage.removeItem('shixu-account');localStorage.removeItem('shixu-account-owner');keys.forEach(k=>localStorage.removeItem(k));app.applyScope();hooks.chat([]);hooks.reset();hooks.changed(null);code='';
   }else if(action==='login'){
    validatePassword(password);const challenge=await auth('challenge',{username});const v=await auth('login',{username,authProof:await authProof(password,challenge.authSalt)});save(v,await unwrapPassword(v.keyEnvelope,password,v.keySalt));
   }else if(action==='register'){
    const recovery=newRecovery();let legacy=null;try{legacy=JSON.parse(localStorage.getItem('shixu-pair'));}catch{}
    const master=legacy?.token||newMaster(),c=await credentials(password,master,recovery);
    const v=await auth('register',{username,...c,...(legacy?{legacyAuth:await authToken(master)}:{})});save(v,master);code='shixu-recovery.'+recovery;
   }else if(action==='password'){
    const recovery=newRecovery(),c=await credentials(next,account.token,recovery);const v=await auth('password',{...c,currentProof:await authProof(current,account.authSalt)},account.session);save(v,account.token);code='shixu-recovery.'+recovery;
   }else if(action==='recover'){
    const proof=await recoveryProof(recovery),vault=await auth('recovery-vault',{username,recoveryProof:proof}),master=await unwrapRecovery(vault.recoveryEnvelope,recovery),fresh=newRecovery(),c=await credentials(next,master,fresh);
    const v=await auth('recover',{username,...c,recoveryProof:proof,newRecoveryProof:c.recoveryProof});save(v,master);code='shixu-recovery.'+fresh;
   }
  }catch(e){hooks.message('账户操作未完成：'+e.message);throw e;}finally{busy=false;open();}
  if(account)await hooks.sync();return true;
 }
 return {view,open,handle,get session(){return account;},get busy(){return busy;}};
}
