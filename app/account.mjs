import {encode,decode} from './sync.mjs';
export const ITERATIONS=600000;
const utf8=new TextEncoder(),random=n=>encode(crypto.getRandomValues(new Uint8Array(n)));
export const newMaster=()=>random(32),newSalt=()=>random(16),newRecovery=()=>random(32);
export function validatePassword(password){if(typeof password!=='string'||password.length<10||password.length>128)throw Error('密码长度为10–128个字符');}
export function recoveryCode(value){const code=String(value||'').trim().replace(/^shixu-recovery\./,'');if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error('请填写完整恢复码');return code;}
async function hash(value){return new Uint8Array(await crypto.subtle.digest('SHA-256',utf8.encode(value)));}
async function derive(password,salt,purpose){validatePassword(password);if(!/^[A-Za-z0-9_-]{22}$/.test(salt))throw Error('账号盐值不正确');const key=await crypto.subtle.importKey('raw',utf8.encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:utf8.encode('shixu:'+purpose+':v2:'+salt),iterations:ITERATIONS},key,256));}
export async function authProof(password,salt){return encode(await derive(password,salt,'login'));}
export async function recoveryProof(code){return encode(await hash('shixu:recovery-auth:v2:'+recoveryCode(code)));}
async function wrap(master,key){if(decode(master).length!==32)throw Error('数据密钥不正确');const iv=crypto.getRandomValues(new Uint8Array(12));const aes=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);return {version:1,iv:encode(iv),ciphertext:encode(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,decode(master))))};}
async function unwrap(envelope,key){if(envelope?.version!==1||decode(envelope.iv).length!==12||decode(envelope.ciphertext).length!==48)throw Error('账号加密信息不正确');const aes=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['decrypt']);const master=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(envelope.iv)},aes,decode(envelope.ciphertext)));if(master.length!==32)throw Error('数据密钥不正确');return encode(master);}
export async function unwrapPassword(envelope,password,salt){return unwrap(envelope,await derive(password,salt,'wrap'));}
export async function unwrapRecovery(envelope,code){return unwrap(envelope,await hash('shixu:recovery-wrap:v2:'+recoveryCode(code)));}
export async function credentials(password,master,recovery=null){const authSalt=newSalt(),keySalt=newSalt();const result={authSalt,authProof:await authProof(password,authSalt),keySalt,keyEnvelope:await wrap(master,await derive(password,keySalt,'wrap'))};if(recovery)Object.assign(result,{recoveryProof:await recoveryProof(recovery),recoveryEnvelope:await wrap(master,await hash('shixu:recovery-wrap:v2:'+recoveryCode(recovery)))});return result;}
