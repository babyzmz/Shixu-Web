import{createLiveOrb}from'./live-orb.mjs?v=0.5.6-settings';

// A decorative companion only. It never owns focus, input, or assistant business state.
export function orbMarkup(){return '<span class="assistant-orb" data-assistant-orb data-preserve-visual="xiaoshi" aria-hidden="true"><span class="orb-fallback"><i></i><i></i></span><canvas></canvas></span>';}
export function installAssistantOrbs(){
 const active=new Map(),abort=new AbortController();let queued=false,disposed=false,state='idle',settle=0;
 const visible=el=>{if(document.hidden||!el.isConnected)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
 function refresh(){if(queued||disposed)return;queued=true;queueMicrotask(()=>{queued=false;if(disposed)return;const candidates=new Set(document.querySelectorAll('.web-assistant:not(.assistant-motion-exit) [data-assistant-orb],.web-assistant-main [data-assistant-orb]'));for(const[el,instance]of active)if(!candidates.has(el)||!visible(el)){instance?.destroy();active.delete(el);delete el.dataset.glReady;}
  for(const el of candidates){if(active.has(el)||!visible(el))continue;let instance=null;try{instance=createLiveOrb(el.querySelector('canvas'),{variant:'custom',color:'#8D79E8',eyeColor:'#FFFFFF',interactive:matchMedia('(hover:hover)').matches,blink:true,conversationState:state,onHasGl:ok=>{el.dataset.glReady=String(ok);}});}catch{el.dataset.glReady='false';}active.set(el,instance);el.dataset.chatState=state;}
 });}
 const observer=new MutationObserver(refresh);observer.observe(document.querySelector('#main'),{childList:true,subtree:true});const workspace=document.querySelector('.workspace');observer.observe(workspace,{attributes:true,attributeFilter:['class']});const column=document.querySelector('.web-assistant');if(column)observer.observe(column,{childList:true,subtree:true});
 for(const name of['resize','scroll'])window.addEventListener(name,refresh,{signal:abort.signal,passive:true});document.addEventListener('visibilitychange',refresh,{signal:abort.signal});
 function setState(next,rest='idle'){
  if(!['idle','thinking','searching','planning','confirming','focusing','replying','error'].includes(next))throw new TypeError('Unknown assistant state');
  if(disposed||state===next&&next!=='replying')return;
  clearTimeout(settle);state=next;
  for(const[el,instance]of active){el.dataset.chatState=state;instance?.setOptions({conversationState:state});}
  // A reply is a single acknowledgement, never a permanent bouncing loop.
  if(next==='replying')settle=setTimeout(()=>setState(rest),900);
 }
 function destroy(){clearTimeout(settle);if(disposed)return;disposed=true;observer.disconnect();abort.abort();for(const instance of active.values())instance?.destroy();active.clear();}
 window.addEventListener('pagehide',destroy,{signal:abort.signal,once:true});refresh();return{refresh,destroy,setState,stats:()=>({state,mounted:active.size,webgl:[...active.values()].filter(Boolean).length})};
}
