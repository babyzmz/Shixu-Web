import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
const root=process.argv[2]||'.',staged=fs.existsSync(path.join(root,'app/index.html')),app=path.join(root,staged?'app':'.');
for(const match of fs.readFileSync(path.join(app,'index.html'),'utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
for(const file of ['web.js','sync.mjs','web.css','icon.svg','manifest.webmanifest','sw.js'])if(!fs.statSync(path.join(app,file)).isFile())throw Error('Missing '+file);
JSON.parse(fs.readFileSync(path.join(app,'manifest.webmanifest'),'utf8'));
if(staged){
 for(const file of ['index.html','download.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)){
   const target=match[1].split(/[?#]/)[0];if(!fs.existsSync(path.join(root,target)))throw Error('Missing site resource '+target);
  }
 }
 new vm.Script(fs.readFileSync(path.join(root,'site.js'),'utf8'));new vm.Script(fs.readFileSync(path.join(root,'sw.js'),'utf8'));
 for(const file of ['today.jpg','today-light.jpg','calendar.jpg','assistant.jpg','widgets.jpg'])if(!fs.statSync(path.join(root,'assets',file)).isFile())throw Error('Missing actual product screenshot '+file);
 if(!fs.readFileSync(path.join(app,'sw.js'),'utf8').includes('shixu-app-'))throw Error('App cache must have its own namespace');
}
console.log('Workspace syntax, public resources and site routes verified.');
