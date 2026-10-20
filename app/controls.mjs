// App-owned controls: no Android select menus, date dialogs or JavaScript confirms.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const localDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export function installControls(){
 const dialog=document.createElement('dialog');dialog.className='control-sheet';document.body.append(dialog);
 let cancel=()=>{},origin=null;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function close(){dialog.close();dialog.replaceChildren();origin?.isConnected&&origin.focus({preventScroll:true});cancel();cancel=()=>{};}
 function show(title,body,footer,setup=()=>{}){
  if(dialog.open)close();origin=document.activeElement;
  dialog.innerHTML=`<div class="sheet-grip" aria-hidden="true"></div><header class="control-head"><h3 id="control-title">${esc(title)}</h3><button type="button" class="icon-btn" data-control="cancel" aria-label="关闭选择器">×</button></header><div class="control-body">${body}</div><footer class="control-foot">${footer}</footer>`;
  dialog.setAttribute('aria-labelledby','control-title');dialog.showModal();setup();
  dialog.querySelector('[data-control="cancel"]')?.focus({preventScroll:true});
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}if(e.target.closest('[data-control="cancel"]'))close();});
 const actions=clear=>`${clear?'<button type="button" class="btn ghost" data-control="clear">清除</button>':'<span></span>'}<button type="button" class="btn primary" data-control="save">确定</button>`;
 const label=input=>input.dataset.appLabel||input.getAttribute('aria-label')||input.labels?.[0]?.textContent||'选择';
 function set(input,value){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
 function wheel(name,count,value){
  const el=document.createElement('div');el.className='time-wheel';el.tabIndex=0;el.role='listbox';el.setAttribute('aria-label',name);
  el.innerHTML=Array.from({length:count},(_,i)=>`<div class="wheel-option" role="option" aria-selected="${i===value}" id="wheel-${name}-${i}" data-value="${i}">${pad(i)}</div>`).join('');
  let timer;
  const read=()=>Math.max(0,Math.min(count-1,Math.round(el.scrollTop/44)));
  const paint=()=>{const index=read();el.querySelectorAll('[role="option"]').forEach((o,i)=>o.setAttribute('aria-selected',i===index));el.setAttribute('aria-activedescendant',`wheel-${name}-${index}`);};
  el.addEventListener('scroll',()=>{paint();clearTimeout(timer);timer=setTimeout(paint,90);},{passive:true});
  const move=(i,instant=false)=>el.scrollTo({top:Math.max(0,Math.min(count-1,i))*44,behavior:instant||reduced()?'instant':'smooth'});
  el.addEventListener('click',e=>{const o=e.target.closest('[data-value]');if(o)move(+o.dataset.value);});
  el.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();move(e.key==='Home'?0:e.key==='End'?count-1:read()+(e.key==='ArrowDown'?1:-1),true);}});
  el.value=()=>read();el.initialize=()=>{el.scrollTop=value*44;paint();};return el;
 }
 function temporal(input,kind){
  const now=new Date(),value=input.value;let date=value.slice(0,10)||localDate(now);
  let month=new Date(date+'T12:00:00');if(!Number.isFinite(month.getTime()))month=now;
  const time=(kind==='time'?value:value.slice(11))||`${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const [hh,mm]=time.split(':').map(Number);let hours,minutes;
  show(label(input),`${kind!=='time'?'<div class="picker-calendar"></div>':''}${kind!=='date'?'<div class="time-caption"><span>小时</span><span>分钟</span></div><div class="wheel-pair"><div class="wheel-band" aria-hidden="true"></div></div>':''}`,actions(!input.required),()=>{
   if(kind!=='time'){
    const calendar=dialog.querySelector('.picker-calendar');
    const render=()=>{
     const year=month.getFullYear(),m=month.getMonth(),first=new Date(year,m,1),offset=(first.getDay()+6)%7,total=new Date(year,m+1,0).getDate();
     calendar.innerHTML=`<div class="calendar-month"><button class="icon-btn" aria-label="上个月" data-month="-1">‹</button><strong>${year} 年 ${m+1} 月</strong><button class="icon-btn" aria-label="下个月" data-month="1">›</button></div><div class="calendar-week">${['一','二','三','四','五','六','日'].map(x=>`<span>${x}</span>`).join('')}</div><div class="picker-days">${'<span></span>'.repeat(offset)}${Array.from({length:total},(_,i)=>{const d=`${year}-${pad(m+1)}-${pad(i+1)}`;return `<button type="button" data-day="${d}" aria-label="${d}" aria-pressed="${d===date}" class="${d===date?'selected':''} ${d===localDate(now)?'is-today':''}">${i+1}</button>`;}).join('')}</div><button type="button" class="text-btn calendar-today">回到今天</button>`;
    };
    calendar.addEventListener('click',e=>{const day=e.target.closest('[data-day]'),direction=e.target.closest('[data-month]');if(day){date=day.dataset.day;render();}if(direction){month=new Date(month.getFullYear(),month.getMonth()+Number(direction.dataset.month),1);render();}if(e.target.closest('.calendar-today')){date=localDate(now);month=new Date(now);render();}});render();
   }
   if(kind!=='date'){hours=wheel('小时',24,hh);minutes=wheel('分钟',60,mm);dialog.querySelector('.wheel-pair').append(hours,minutes);hours.initialize();minutes.initialize();}
   dialog.querySelector('[data-control="save"]').onclick=()=>{const t=kind==='date'?'':`${pad(hours.value())}:${pad(minutes.value())}`;set(input,kind==='date'?date:kind==='time'?t:date+'T'+t);close();};
   const clear=dialog.querySelector('[data-control="clear"]');if(clear)clear.onclick=()=>{set(input,'');close();};
  });
 }
 function selection(input){
  show(label(input),`<div class="choice-list">${[...input.options].map((o,i)=>`<button type="button" data-option="${i}" ${o.disabled?'disabled':''} aria-pressed="${o.selected}" class="choice-option ${o.selected?'selected':''}"><span>${esc(o.textContent)}</span><span aria-hidden="true">${o.selected?'✓':''}</span></button>`).join('')}</div>`, '<button type="button" class="btn" data-control="cancel">取消</button>',()=>{
   dialog.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{set(input,input.options[+b.dataset.option].value);close();});
  });
 }
 function color(input){
  const colors=[...new Set([input.value,'#6664de','#8780d0','#4376a6','#387564','#b36c29','#b44d54','#db8fbc','#9c91cc','#6ca5a1','#737b8d','#242938'])];
  show(label(input),`<div class="choice-list">${colors.map(c=>`<button type="button" class="choice-option ${input.value===c?'selected':''}" data-color="${c}" aria-label="颜色 ${c}"><span style="display:flex;align-items:center;gap:14px"><span style="background:${c};width:24px;height:24px;border-radius:8px"></span>${c.toUpperCase()}</span><span>${input.value===c?'✓':''}</span></button>`).join('')}</div>`,'<button type="button" class="btn" data-control="cancel">取消</button>',()=>{dialog.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{set(input,b.dataset.color);close();});});
 }
 const confirm=message=>new Promise(resolve=>{show('确认操作',`<p class="confirm-copy">${esc(message)}</p>`,'<button type="button" class="btn" data-control="cancel">保留当前</button><button type="button" class="btn primary" data-control="save">确认继续</button>',()=>{cancel=()=>resolve(false);dialog.querySelector('[data-control="save"]').onclick=()=>{cancel=()=>{};close();resolve(true);};});});
 window.ShixuConfirm=confirm;
 function enhance(){
  const repeat=document.querySelector('#edit-repeat');if(repeat&&!document.querySelector('#editor-form [data-action="editor-track"]'))repeat.closest('.form-field').hidden=true;
  document.querySelectorAll('#modal-root input[type="date"],#modal-root input[type="time"],#modal-root input[type="datetime-local"],#modal-root input[type="color"],#ai-results input[type="date"],#ai-results input[type="time"],#modal-root select,#ai-results select').forEach(input=>{
   if(input.dataset.appControl)return;input.dataset.appControl='true';
   const kind=input.tagName==='SELECT'?'select':input.type;input.dataset.appLabel=label(input);
   if(kind==='select'){input.hidden=true;}else input.type='hidden';
   const button=document.createElement('button');button.type='button';button.className='field-trigger';button.setAttribute('aria-label',label(input));button.setAttribute('aria-haspopup','dialog');
   const refresh=()=>{const text=kind==='select'?input.selectedOptions[0]?.textContent:input.value.replace('T','  ');button.innerHTML=`<span class="${text?'':'muted'}">${esc(text||'不设置')}</span><span class="field-icon" aria-hidden="true">${window.ic?.(kind==='select'?'down':kind==='time'?'clock':'calendar')||'⌄'}</span>`;button.disabled=input.disabled;};
   refresh();input.after(button);input.addEventListener('input',refresh);input.addEventListener('change',refresh);
   button.onclick=()=>{document.activeElement?.blur();kind==='select'?selection(input):kind==='color'?color(input):temporal(input,kind);};
  });
 }
 new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
 return {confirm,enhance};
}
