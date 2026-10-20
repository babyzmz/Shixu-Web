import {prepareAction,renderAssistantText,activityForQuestion} from './assistant-actions.mjs?v=0.5.5-xiaoshi-cloud';
export {prepareAction,renderAssistantText,activityForQuestion};
export function cloudContext(app,question,state=app.getState()){
 const now=new Date(),soon=Date.now()+14*86400000;
 const needsRecords=/待办|任务|日程|事件|便签|笔记|安排|计划|冲突|空闲|完成|记录|专注|提醒|事项|找|修改|删除|改|排|拆|分类|模板|截止|今天|明天|本周|todo/i.test(question);
 const candidates=(needsRecords?[...state.items]:[]).filter(i=>!/待办|任务/.test(question)||/便签|笔记/.test(question)||i.type!=='note').sort((a,b)=>{const score=i=>(question.includes(i.title)&&i.title?100:0)+(i.status!=='done'?10:0)+(Date.parse(i.planDate||i.dueDate||'')<=soon?5:0);return score(b)-score(a)});
 const records=[];for(const i of candidates.slice(0,60)){const record={id:i.id,type:i.type,title:i.title,bodyCharacters:i.body?.length||0,category:i.category,status:i.status,priority:i.priority,planDate:i.planDate,dueDate:i.dueDate,startTime:i.startTime,endDate:i.endDate,endTime:i.endTime,duration:i.duration,pointEvent:i.pointEvent,repeat:i.repeat,dailyTarget:i.dailyTarget,remindAt:i.remindAt,reminders:i.reminders,subtaskCount:i.subtasks?.length||0,totalCompletions:i.completions?.filter(e=>!e.voided).length||0};if(JSON.stringify(records).length+JSON.stringify(record).length>16000)break;records.push(record)}
 return {now:now.toLocaleString('sv-SE'),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,app:app.assistantState?.(),categories:state.categories.slice(0,30),templates:state.templates?.slice(0,20).map(t=>({id:t.id,name:t.name})),records,totalItems:state.items.length,includedItems:records.length,truncated:records.length<state.items.length,platform:window.Capacitor?.isNativePlatform?.()?'android':'web'};
}
export function readRecords(app,args){
 const state=app.getState();if(!args||typeof args!=='object')throw Error('读取条件无效');
 if(args.id){
  const i=state.items.find(i=>i.id===args.id);if(!i)return{error:'事项不存在'};
  const matches=(i.completions||[]).filter(e=>{const date=new Date(e.at).toLocaleDateString('sv-SE');return(!args.from||date>=args.from)&&(!args.to||date<=args.to)}).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  const offset=Math.max(0,Math.min(10000,Number(args.offset)||0)),bodyOffset=Math.max(0,Math.min(i.body.length,Number(args.bodyOffset)||0)),countsByDay={};
  for(const e of matches.filter(e=>!e.voided)){const d=new Date(e.at).toLocaleDateString('sv-SE');countsByDay[d]=(countsByDay[d]||0)+1;}
  return{record:{...i,body:i.body.slice(bodyOffset,bodyOffset+4000),sourceText:undefined,completions:matches.slice(offset,offset+20).map(e=>({...e,note:e.note.slice(0,200)}))},bodyOffset,totalBodyCharacters:i.body.length,bodyHasMore:bodyOffset+4000<i.body.length,completionOffset:offset,completionTotal:matches.length,completionHasMore:offset+20<matches.length,countsByDay};
 }
 let values=state.items.filter(i=>(!args.type||i.type===args.type)&&(!args.status||(args.status==='pending'?i.status!=='done':i.status===args.status))&&(!args.query||String(args.query).trim().split(/\s+/).every(q=>(i.title+' '+i.body).toLocaleLowerCase().includes(q.toLocaleLowerCase()))));
 if(args.from||args.to)values=values.filter(i=>{const dates=[i.planDate,i.dueDate,i.remindAt?.slice(0,10)].filter(Boolean);return dates.some(d=>(!args.from||d>=args.from)&&(!args.to||d<=args.to))||i.type==='event'&&i.planDate&&(i.endDate||i.planDate)>=(args.from||'0000')&&i.planDate<=(args.to||'9999')});
 const offset=Math.max(0,Math.min(10000,Number(args.offset)||0)),limit=Math.max(1,Math.min(20,Number(args.limit)||20));return {total:values.length,offset,hasMore:offset+limit<values.length,records:values.slice(offset,offset+limit).map(i=>({id:i.id,type:i.type,title:i.title,body:i.body.slice(0,300),category:i.category,status:i.status,planDate:i.planDate,dueDate:i.dueDate,startTime:i.startTime,endDate:i.endDate,endTime:i.endTime,remindAt:i.remindAt,dailyTarget:i.dailyTarget,totalCompletions:i.completions?.filter(e=>!e.voided).length||0}))};
}
export async function askCloud(question,app,messages,account,signal,onRead){
 const history=messages.filter(m=>m.text&&!m.error).slice(-8).map(m=>({role:m.role,content:(m.text+(m.actions?.length?'\n应用回执：'+m.actions.map(p=>p.status+':'+(p.receipt||p.op.label)).join('；'):'')).slice(0,2000)}));
 const initial=app.getState(),base=cloudContext(app,question,initial);base.pendingActions=messages.flatMap(m=>m.actions||[]).filter(p=>p.status==='pending').slice(-3).map(p=>{const action=JSON.parse(JSON.stringify(p.op));for(const fields of[action.item,action.patch])if(fields){delete fields.body;delete fields.subtasks;}return{proposalId:p.id,action}});
 for(const p of base.pendingActions){const i=initial.items.find(i=>i.id===p.action.id);if(i&&!base.records.some(r=>r.id===i.id))base.records.unshift({id:i.id,title:i.title,type:i.type,status:i.status,category:i.category,planDate:i.planDate,dueDate:i.dueDate,startTime:i.startTime,endDate:i.endDate,endTime:i.endTime,dailyTarget:i.dailyTarget});}
 while(JSON.stringify(base).length>21000&&base.records.length)base.records.pop();base.includedItems=base.records.length;base.truncated=base.records.length<base.totalItems;
 const seen=new Map(base.records.map(r=>[r.id,initial.items.find(i=>i.id===r.id)]));
 const readState=()=>({...initial,items:[...seen.values()].filter(Boolean)});
 let context=base;
 for(let round=0;round<3;round++){
  if(signal.aborted)throw signal.reason;
  const response=await fetch(account.endpoint+'/v2/assistant/chat',{method:'POST',headers:{Authorization:'Bearer '+account.session,'Content-Type':'application/json'},body:JSON.stringify({question,context,history,consent:true}),signal,redirect:'error'});
  const reader=response.body.getReader();let length=0;const chunks=[];while(true){const{done,value}=await reader.read();if(done)break;length+=value.length;if(length>90000){await reader.cancel();throw Error('助手响应过大')}chunks.push(value)}const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}let data;try{data=JSON.parse(new TextDecoder().decode(bytes))}catch{throw Error('助手返回格式不正确')}
  if(!response.ok){const error=Error(data.error||'助手服务暂时不可用');error.code=data.code;error.status=response.status;throw error;}
  if(typeof data.text!=='string'||!Array.isArray(data.actions)||data.actions.length>8)throw Error('助手回复不完整');
  if(!data.reads?.length)return {...data,readState:readState()};
  if(round===2)throw Error('本次读取已达上限，请缩小查询范围后再试');
  onRead?.();const readResults=[];let size=0;for(const args of data.reads.slice(0,3)){const snapshot=app.getState(),result=readRecords({getState:()=>snapshot},args);for(const r of result.record?[result.record]:result.records||[]){const current=snapshot.items.find(i=>i.id===r.id);if(current)seen.set(r.id,current);}const length=JSON.stringify(result).length;if(size+length>14000){readResults.push({error:'读取结果较长，请缩小范围或按编号读取'});break;}size+=length;readResults.push({query:args,result});}
  context={now:base.now,timeZone:base.timeZone,app:base.app,categories:base.categories,templates:base.templates,pendingActions:base.pendingActions,totalItems:base.totalItems,readResults};
 }
}
