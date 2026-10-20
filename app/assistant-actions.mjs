const ACTIONS=new Set('create edit delete complete restore record void_record add_subtasks note_to_task template_apply set_theme history editor focus schedule category_create category_edit category_delete template_create template_delete navigate search settings export import undo focus_start focus_pause focus_reset'.split(' '));
export const ROUTES=new Set('today inbox all calendar notes more ai review'.split(' '));
export const ITEM_FIELDS=new Set('title body category priority planDate dueDate startTime endDate endTime duration remindAt reminders repeat repeatInterval repeatUnit repeatWeekdays repeatUntil dailyTarget dailyReminderTimes pointEvent subtasks'.split(' '));
export const activityForQuestion=q=>/专注|番茄/.test(q)?'focusing':/安排|排程|排日程|改期|改到|冲突|空闲|拆解|分解|小步骤/.test(q)?'planning':/查询|查一下|看看|哪些|多少|本周|今天.*待办|找/.test(q)?'searching':'thinking';
const LABELS={void_record:'撤销这次完成记录',add_subtasks:'追加小步骤',note_to_task:'便签转待办（保留原便签）',template_apply:'用模板新建',set_theme:'切换外观',create:'新增事项',edit:'修改事项',delete:'删除事项',complete:'完成待办',restore:'恢复待办',record:'记录一次完成',history:'查看完成记录日历',editor:'打开编辑器',focus:'打开专注面板',focus_start:'开始专注',focus_pause:'暂停专注',focus_reset:'重置专注',schedule:'打开日程安排',category_create:'新增分类',category_edit:'修改分类',category_delete:'删除分类',template_create:'保存模板',template_delete:'删除模板',navigate:'打开应用页面',search:'搜索事项',settings:'打开设置',export:'导出本机备份',import:'选择备份文件',undo:'撤销上一步操作'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function actionRevision(op,state){const target=op.action.startsWith('category_')?state.categories.find(i=>i.id===op.id):['template_delete','template_apply'].includes(op.action)?state.templates?.find(i=>i.id===op.id):state.items.find(i=>i.id===op.id);return JSON.stringify({target:target||null,categories:state.categories,settings:op.action==='undo'?state.updatedAt:op.action==='set_theme'?state.settings?.theme:null});}
export function prepareAction(raw,state){
 if(!raw||!ACTIONS.has(raw.action))throw Error('该操作需要在应用中手动完成');
 const op=JSON.parse(JSON.stringify(raw));op.label=LABELS[op.action];if(op.action==='complete'&&state.items.find(i=>i.id===op.id)?.dailyTarget>0)op.label='记录一次完成';
 if(['edit','delete','complete','restore','record','void_record','add_subtasks','note_to_task','history','editor','focus','focus_start','focus_pause','focus_reset','template_create'].includes(op.action)&&!state.items.some(i=>i.id===op.id))throw Error('目标事项不存在，请重新查询');
 if(['complete','restore','focus','focus_start','focus_pause','focus_reset'].includes(op.action)&&state.items.find(i=>i.id===op.id)?.type!=='task')throw Error('该操作仅支持待办');
 if(op.action==='restore'&&state.items.find(i=>i.id===op.id)?.dailyTarget>0)throw Error('每天记录请在完成记录中撤销具体一次，不能恢复整条待办');
 if(op.action==='record'&&state.items.find(i=>i.id===op.id)?.type==='note')throw Error('便签不记录完成次数');
 if(op.action==='void_record'&&!state.items.find(i=>i.id===op.id)?.completions?.some(e=>e.id===op.entryId&&!e.voided))throw Error('完成记录不存在或已撤销');
 if(op.action==='add_subtasks'){const item=state.items.find(i=>i.id===op.id);if(item.type!=='task'||item.status==='done'||!Array.isArray(op.steps)||op.steps.length<1||op.steps.length>20||op.steps.some(s=>typeof s!=='string'||!s.trim()||s.length>2000))throw Error('请为未完成待办提供1–20个小步骤');const names=new Set(item.subtasks.map(s=>s.text.trim().toLowerCase()));for(const text of op.steps)if(names.has(text.trim().toLowerCase()))throw Error('已有同名步骤，请避免重复');else names.add(text.trim().toLowerCase());}
 if(op.action==='note_to_task'&&state.items.find(i=>i.id===op.id)?.type!=='note')throw Error('请选择便签');
 if(op.action==='template_apply'&&!state.templates?.some(t=>t.id===op.id))throw Error('模板不存在');
 if(op.action==='set_theme'&&!['system','light','dark'].includes(op.theme))throw Error('外观选项无效');
 if(op.action==='navigate'&&!ROUTES.has(op.route))throw Error('未知页面');
 if(op.action==='create'||op.action==='edit'){
  const fields=op.action==='create'?op.item:op.patch;if(!fields||typeof fields!=='object'||Array.isArray(fields))throw Error('缺少事项字段');
  for(const key of Object.keys(fields))if(!ITEM_FIELDS.has(key)&&!(op.action==='create'&&key==='type'))throw Error('不支持直接修改字段：'+key);
  if(op.action==='create'&&!['task','event','note'].includes(fields.type))throw Error('事项类型无效');
  if(fields.title!==undefined&&typeof fields.title!=='string'||fields.body!==undefined&&typeof fields.body!=='string')throw Error('标题和备注必须是文字');
  for(const[key,v]of Object.entries(fields)){
   if(['duration','dailyTarget','repeatInterval'].includes(key)&&(!Number.isInteger(v)||v<0||v>10080))throw Error('数值字段无效：'+key);
   if(key==='pointEvent'&&typeof v!=='boolean')throw Error('单点日程字段必须为布尔值');
   if(['subtasks','reminders','dailyReminderTimes','repeatWeekdays'].includes(key)&&!Array.isArray(v))throw Error('列表字段无效：'+key);
   if(!['duration','dailyTarget','repeatInterval','pointEvent','subtasks','reminders','dailyReminderTimes','repeatWeekdays'].includes(key)&&typeof v!=='string')throw Error('文本字段无效：'+key);
  }
  if(fields.category!==undefined&&!state.categories.some(c=>c.id===fields.category))throw Error('分类不存在');
 }
 if(op.action.startsWith('category_')&&op.action!=='category_create'&&!state.categories.some(c=>c.id===op.id))throw Error('分类不存在');
 if(op.action==='category_delete'&&op.id===state.categories[0]?.id)throw Error('未分类不能删除');
 if(op.action==='template_delete'&&!state.templates?.some(t=>t.id===op.id))throw Error('模板不存在');
 if(['category_create','category_edit','template_create'].includes(op.action)&&(!String(op.name||'').trim()||String(op.name).length>60))throw Error('请提供1–60字名称');
 if(op.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(op.color))throw Error('分类颜色无效');
 if(op.action==='record'&&op.at&&(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000))throw Error('完成时间无效或在未来');
 return {id:crypto.randomUUID(),op,revision:actionRevision(op,state),status:'pending'};
}
const FIELD_NAMES={title:'标题',body:'备注',category:'分类',priority:'优先级',planDate:'计划日期',dueDate:'截止日期',startTime:'开始时间',endDate:'结束日期',endTime:'结束时间',duration:'分钟',remindAt:'提醒',reminders:'额外提醒',repeat:'重复',dailyTarget:'每日目标',pointEvent:'单个时间点',subtasks:'小步骤'};
export function actionDetails(op,state){const target=op.action.startsWith('category_')?state.categories.find(i=>i.id===op.id):['template_delete','template_apply'].includes(op.action)?state.templates?.find(i=>i.id===op.id):state.items.find(i=>i.id===op.id);let html=target?'<p>'+esc(target.title||target.name)+'</p>':'';if(op.action==='category_delete')html+='<p>分类内事项保留，归入未分类。</p>';for(const[key,v]of Object.entries(op.item||op.patch||{})){const value=key==='category'?state.categories.find(c=>c.id===v)?.name||v:typeof v==='object'?JSON.stringify(v):String(v);html+='<div class="assistant-action-field"><span>'+esc(FIELD_NAMES[key]||key)+'</span><strong>'+esc(value||'清除')+'</strong></div>';}if(op.action==='void_record'){const entry=target?.completions?.find(e=>e.id===op.entryId);if(entry)html+='<p>撤销：'+esc(new Date(entry.at).toLocaleString())+' '+esc(entry.note)+'</p>';}if(op.steps)html+='<p>保留已有步骤，追加：</p><ul>'+op.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';for(const key of ['name','query','route','at','note','theme'])if(op[key])html+='<p>'+esc(op[key])+'</p>';return html;}
export function renderAssistantText(text,items){
 const inline=s=>{let value=esc(s);value=value.replace(/\[([^\]\n]+)\]\(shixu:\/\/item\/([A-Za-z0-9_-]+)\)/g,(_,label,id)=>items.some(i=>i.id===id)?'<a href="#record-'+id+'" data-web-action="source" data-id="'+id+'">↗ '+label+'</a>':label);return value.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');};
 const lines=String(text||'').split('\n');let html='';for(let n=0;n<lines.length;n++){const line=lines[n];if(/^\|/.test(line)&&/^\|?[\s:|-]+\|/.test(lines[n+1]||'')){const cells=s=>s.trim().replace(/^\||\|$/g,'').split('|').map(c=>inline(c.trim()));html+='<table><thead><tr>'+cells(line).map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>';n+=2;while(n<lines.length&&/^\|/.test(lines[n])){html+='<tr>'+cells(lines[n]).map(c=>'<td>'+c+'</td>').join('')+'</tr>';n++;}html+='</tbody></table>';n--;continue;}html+=line.trim()?'<p>'+inline(line.replace(/^#{1,4}\s+/,''))+'</p>':'<br>';}return html;
}
