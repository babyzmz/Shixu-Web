// Local wall-clock values are interpreted in the item's timezone, not the receiving device's.
const zoneAliases={'China Standard Time':'Asia/Shanghai','AUS Eastern Standard Time':'Australia/Sydney','UTC':'UTC','GMT Standard Time':'Europe/London','Eastern Standard Time':'America/New_York','Pacific Standard Time':'America/Los_Angeles'};
export function zoneOf(i){let zone=zoneAliases[i.timeZoneId]||i.timeZoneId||Intl.DateTimeFormat().resolvedOptions().timeZone;try{new Intl.DateTimeFormat('en',{timeZone:zone});}catch{zone=Intl.DateTimeFormat().resolvedOptions().timeZone;}return zone;}
const formatters=new Map();
function parts(at,zone){if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));return Object.fromEntries(formatters.get(zone).formatToParts(new Date(at)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));}
function text(p){return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function reminderLocal(i,at){return text(parts(at,zoneOf(i)));}
export function creationUtc(local,zone){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))return NaN;const target=Date.parse(local+'Z');if(!Number.isFinite(target))return NaN;let at=target;for(let n=0;n<4;n++){const wall=Date.parse(text(parts(at,zone))+'Z');const offset=target-wall;if(!offset)break;at+=offset;}if(text(parts(at,zone))!==local)return NaN;const alternatives=[at-3600000,at+3600000,at-1800000,at+1800000];if(alternatives.some(x=>text(parts(x,zone))===local))return NaN;return at;}
export function reminderOccurrences(i,now=Date.now(),futureDays=0){
 if(i.status==='done')return [];const zone=zoneOf(i),values=[i.remindAt,...(i.reminders||[])].filter(Boolean),generated=new Set(),base=text(parts(now,zone)).slice(0,10);
 const created=Number.isFinite(Date.parse(i.createdAt))?text(parts(Date.parse(i.createdAt),zone)).slice(0,10):'';
 if(i.dailyTarget>0)for(let n=-1;n<=futureDays;n++){const d=new Date(base+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);const date=d.toISOString().slice(0,10);if(i.planDate&&date<i.planDate||created&&date<created||i.repeatUntil&&date>i.repeatUntil)continue;for(const time of i.dailyReminderTimes||[]){values.push(date+'T'+time);generated.add(date+'T'+time);}}
 return [...new Set(values)].map(local=>({local,at:creationUtc(local,zone)})).filter(x=>Number.isFinite(x.at)&&(!generated.has(x.local)||!created||x.at>=Date.parse(i.createdAt)));
}
