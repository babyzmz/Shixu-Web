// A small shared vocabulary: press, settle, arrive. No delays on application actions.
export function installMotion(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),running=new Set(),seen=new WeakSet();
 let pointer=false,lastPage='',modalOpen=false,assistantOpen=false,lastModal=null;
 document.documentElement.dataset.input='keyboard';
 document.addEventListener('pointerdown',()=>{pointer=true;document.documentElement.dataset.input='pointer';},{capture:true,passive:true});
 document.addEventListener('keydown',()=>{pointer=false;document.documentElement.dataset.input='keyboard';stop();},true);
 function stop(){for(const a of running)a.cancel();running.clear();}
 reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
 function enter(el,kind='page',delay=0){
  if(!el||reduced.matches||!pointer||!el.animate)return;
  for(const old of el.getAnimations())if(running.has(old)){old.cancel();running.delete(old);}
  const sheet=kind==='sheet',small=kind==='small',phone=globalThis.innerWidth<=760;
  const a=el.animate([
   {opacity:small ? .8 : .65,translate:sheet?(phone?'0 24px':'16px 0'):small?'0 8px':'0 8px',scale:small?'.98':'1'},
   {opacity:1,translate:'0 0',scale:'1'}
  ],{duration:sheet?240:small?200:180,delay,easing:small?'cubic-bezier(.2,.8,.25,1.12)':'cubic-bezier(.2,.8,.2,1)'});
  running.add(a);a.finished.catch(()=>{}).finally(()=>running.delete(a));
 }
 window.addEventListener('shixu-render',()=>{
  const page=document.querySelector('.crumb')?.textContent.trim()||'';
  if(lastPage&&page!==lastPage)enter(document.querySelector('#main'));
  lastPage=page;
 });
 const observer=new MutationObserver(records=>{
  for(const record of records)if(record.target.matches?.('.time-dialog,.control-sheet')&&!record.target.open)seen.delete(record.target);
  const modal=document.querySelector('#modal-root .modal');
  if(modal&&!modalOpen)enter(modal,modal.classList.contains('drawer')?'sheet':'small');
  else if(modal&&lastModal&&modal!==lastModal)enter(modal.querySelector?.('.modal-content'),'page');
  lastModal=modal;
  modalOpen=!!modal;
  const panel=document.querySelector('.workspace.assistant-open .web-assistant');
  if(panel&&!assistantOpen)enter(panel,'sheet');assistantOpen=!!panel;
  for(const el of document.querySelectorAll('.toast,.time-dialog[open],.control-sheet[open],.context-menu,.popover')){
   if(!seen.has(el)){seen.add(el);enter(el,'small');}
  }
 });
 // Observe structure only: typing, clock ticks and validation do not replay page entrances.
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class']});
 function exit(root){
  if(!root||reduced.matches||!pointer||!root.animate)return;
  const copy=root.cloneNode(true);copy.inert=true;copy.setAttribute('aria-hidden','true');copy.classList.add('motion-exit');
  for(const el of copy.querySelectorAll('[id]'))el.removeAttribute('id');document.body.append(copy);
  const panel=copy.querySelector('.modal');const a=panel?.animate([{opacity:1,translate:'0 0'},{opacity:0,translate:globalThis.innerWidth<=760?'0 20px':'12px 0'}],{duration:150,easing:'cubic-bezier(.4,0,1,1)'});
  if(a){a.finished.catch(()=>{}).finally(()=>copy.remove());}else copy.remove();
 }
 return {stop,exit};
}
