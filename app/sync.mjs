const enc = new TextEncoder(); const dec = new TextDecoder();
export const authToken=async token=>encode(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode('shixu:auth:'+token))));
export const encode = bytes => { let text='';for(const b of bytes)text+=String.fromCharCode(b);return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,''); };
export const decode = text => Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0));
const key = async token => {if(decode(token).length!==32)throw Error('配对码不正确');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode('shixu:encryption:'+token)), 'AES-GCM',false,['encrypt','decrypt']);};
export async function encrypt(document, token) {
 const plain=enc.encode(JSON.stringify(document));if(plain.length>1_000_000)throw Error('同步空间超过1MB，请先导出备份并清理过长正文');
 const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(token),plain);
 return {version:document.schema>=3?2:1,iv:encode(iv),ciphertext:encode(new Uint8Array(data))};
}
export async function decrypt(envelope, token) {
 if(![1,2].includes(envelope.version)||envelope.ciphertext.length>1_400_000||decode(envelope.iv).length!==12)throw Error('同步格式不正确，请更新应用');
 return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(envelope.iv)},await key(token),decode(envelope.ciphertext))));
}
export const canonical = value => JSON.stringify(value, (k,v)=>k==='kindLabel'?undefined:v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function merge(before, ours, theirs) {
 const rows=kind=>{const b=new Map((before[kind]||[]).map(x=>[x.id,x])),l=new Map((ours[kind]||[]).map(x=>[x.id,x])),r=new Map((theirs[kind]||[]).map(x=>[x.id,x]));const values=[];
 for(const id of new Set([...b.keys(),...l.keys(),...r.keys()])){const bv=canonical(b.get(id)),lv=canonical(l.get(id)),rv=canonical(r.get(id));if(lv!==bv&&rv!==bv&&lv!==rv){
  const old=b.get(id),left=l.get(id),right=r.get(id);
  const content=v=>canonical({...v,dailyTarget:v.dailyTarget||0,pointEvent:!!v.pointEvent,completions:[],updatedAt:''});
  if(kind==='items'&&old&&left&&right&&content(old)===content(left)&&content(old)===content(right)){
   const maps=[old,left,right].map(v=>new Map((v.completions||[]).map(e=>[e.id,e]))),completionRows=[];
   for(const key of new Set(maps.flatMap(m=>[...m.keys()]))){const [base,local,remote]=maps.map(m=>m.get(key));if(canonical(local)!==canonical(base)&&canonical(remote)!==canonical(base)&&canonical(local)!==canonical(remote)){const e=Error('同一次完成记录被两端修改，请处理同步冲突');e.conflict=true;throw e;}const entry=canonical(local)!==canonical(base)?local:remote;if(entry)completionRows.push(entry);}
   values.push({...left,completions:completionRows,updatedAt:[left.updatedAt,right.updatedAt].sort().at(-1)});continue;
  }
  const e=Error('同一记录被两端修改或一端删除。原记录保留，请处理同步冲突');e.conflict=true;throw e;}const value=lv!==bv?l.get(id):r.get(id);if(value)values.push(value);}return values;};
 const result={schema:Math.max(before.schema||1,ours.schema||1,theirs.schema||1),items:rows('items'),categories:rows('categories'),templates:rows('templates')};
 if(result.templates?.some(t=>!result.categories.some(c=>c.id===t.item.category))){const e=Error('模板分类有并发冲突，请保留两端备份');e.conflict=true;throw e;}
 if(result.items.some(x=>!result.categories.some(c=>c.id===x.category))) {const e=Error('分类与事项有并发冲突，请保留两端备份后处理');e.conflict=true;throw e;}return result;
}
export const empty = () => ({schema:1,items:[],categories:[],templates:[]});
export function parsePair(code) {
 if(!code.startsWith('shixu1.'))throw Error('请粘贴完整配对码');
 const pair=JSON.parse(dec.decode(decode(code.slice(7))));const url=new URL(pair.endpoint);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!/^[A-Za-z0-9_-]{43}$/.test(pair.token))throw Error('配对码格式不正确');
 return {endpoint:url.origin,token:pair.token};
}
