import fs from 'node:fs';import vm from 'node:vm';
for(const match of fs.readFileSync('index.html','utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
for(const file of ['web.js','sync.mjs','web.css','icon.svg','manifest.webmanifest','sw.js'])if(!fs.statSync(file).isFile())throw Error('Missing '+file);
JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
console.log('Static files and embedded JavaScript verified.');
