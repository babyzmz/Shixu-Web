(()=>{
  'use strict';
  document.documentElement.dataset.input='keyboard';
  document.addEventListener('pointerdown',()=>{document.documentElement.dataset.input='pointer';},{capture:true,passive:true});
  document.addEventListener('keydown',()=>{document.documentElement.dataset.input='keyboard';},true);
  // Chinese lives in the HTML; English replaces tagged content so static pages stay readable without JS.
  const go=text=>text+' <span aria-hidden="true">↗</span>',down=text=>text+' <span aria-hidden="true">↓</span>';
  const en={
    'android.h':'Shixu,<br>on your phone.',
    'android.p':'Android 0.2.1 small-group test build · about 4 MB. The shared web workbench with account sync, optional system calendar integration and local reminders.',
    'android.download':down('Download Android test build'),
    'android.note':'Android 7+ with a recent System WebView. Enable background calendar sync, notifications and unrestricted battery access in settings. Verified with Android 16 emulator lock-screen Doze; vendor phones still need testing. Force-stop and network loss interrupt the connection.',
    'home.title':'Shixu — Pick up the pieces. Shape your day.',
    'home.description':'Shixu gathers scattered to-dos, events and notes in one place. Windows desktop widgets and a web workbench keep your plans with you.',
    'download.title':'Download Shixu — Windows desktop and web workbench',
    'download.description':'Download the Shixu Windows desktop app or open the web workbench. Check the version, installation steps and device sync guide.',
    skip:'Skip to main content',brand:'Shixu','brand.home':'Shixu home','nav.label':'Site navigation',
    'nav.tour':'Tour','nav.web':go('Web app'),'nav.desktop':'Desktop',
    'cta.get':go('Get Shixu'),'cta.getDown':down('Get Shixu'),'cta.windows':down('Download for Windows'),'cta.tryWeb':go('Try the web app first'),'cta.openWeb':go('Open the web app'),
    'hero.l1':'Pick up the pieces.','hero.l2':'Shape your day.',
    'hero.intro':'To-dos, events and notes, all in one place.<br>Keep the next step in sight, and your time for yourself.',
    'hero.alt':'Shixu Today workbench showing priority to-dos, a schedule timeline and notes together',
    'hero.caption':'Your next step already has a place.','hero.explore':down('Explore'),
    'story.title':'From scattered to sorted.','story.nav':'Choose a product scene',
    'story.tab0':'Capture','story.tab1':'Plan','story.tab2':'Widgets','story.tab3':'Assistant',
    's0.h':'Write it down.<br>Sort it out later.','s0.p':'Jot down a to-do or keep a quick note. Categories and small steps turn ideas into things you can start.',
    's0.alt':'Quick capture, to-dos and sticky notes on the Today page','s0.cap':'Today workbench · sample items',
    's1.h':'See your day<br>at a glance.','s1.p':'Switch between year, month, week and day views. Planned time, due dates and reminders stay separate, so your plans stay clear.',
    's1.alt':'Shixu week calendar with a product review scheduled at 3 PM','s1.cap':'Week calendar · planned time never replaces the due date',
    's2.h':'Your next step,<br>right on the desktop.','s2.p':'On Windows, to-dos, events and categories become standalone widgets. When you get back to work, what matters is still in view.',
    's2.alt':'Example layout of to-dos and events as standalone widgets on a canvas','s2.cap':'Widget layout preview · native desktop widgets run on Windows',
    's3.h':'Ask the question.<br>You make the call.','s3.p':'Look things up, break down to-dos, schedule and check for conflicts. Replies link back to the original records, and every change is previewed before you confirm.',
    's3.alt':'The assistant lists this week’s to-dos with links to the original records','s3.cap':'Local web assistant · cloud models configurable on desktop',
    'devices.h':'Switch screens.<br>Keep going.','devices.p':'Focus on your PC, pick up in the browser. Once you sign in, items and categories sync across your devices with encryption.',
    'devices.alt':'Light web workbench for viewing and editing personal to-dos','devices.cap':'Web app · start capturing without installing',
    'devices.win.h':'Windows desktop','devices.win.p':'Native widgets, tray reminders, a focus timer and automatic updates. Your workbench can stay on your desktop, too.','devices.win.a':go('Choose desktop'),
    'devices.web.h':'Web workbench','devices.web.p':'Open a browser and start. Already using the desktop app? Sign in with your Fairy account.',
    'devices.note':'Without signing in, everything stays on this device. Sync is optional, data is encrypted before upload, and everyone uses their own account.',
    'faq.h':'Before you start,<br>you might wonder.',
    'faq.q1':'What’s the easiest way to start?','faq.a1':'To try capturing and the calendar, just open the web app. For native desktop widgets, tray reminders and automatic updates, download the Windows version, extract it and run Shixu.exe.',
    'faq.q2':'Do the web and desktop apps share the same records?','faq.a2':'Sign in to the same account on both. Click “Sign in” at the bottom left of the web or desktop workbench, create a Fairy account, then sign in on the other side with the same username and password. Items and categories are then encrypted on your device and synced automatically.',
    'faq.q3':'Does the assistant need an API key?','faq.a3':'Basic lookups, explicit captures and local rule-based scheduling don’t need an API. More advanced cloud model features on desktop require a model and a valid key in settings; model costs depend on the service you choose. The web app currently uses a local rule-based assistant.',
    'faq.q4':'Will I still get reminders after closing the web page?','faq.a4':'Web reminders need the page to stay open. For tray reminders, use the Windows version; notifications aren’t guaranteed while the app is fully closed or the device is asleep.',
    'closing.h':'Give today<br>a clear start.','closing.p':'Begin by writing down one thing.',
    'footer.download':'Desktop download','footer.web':'Web workbench','footer.home':'Back to home','footer.tagline':'Shixu · A place for everything','footer.sample':'Screens show sample items and contain no user records.',
    'dl.l1':'Bring Shixu','dl.l2':'to your desktop.','dl.intro':'Native desktop widgets, tray reminders, a global assistant.<br>Your next step, always in sight.',
    'dl.icon':'Shixu app icon','dl.windows':'Windows','dl.req':'Windows 10 2004 (19041) or later, or Windows 11, on an x64 PC.<br>ZIP archive. Extract, then run.','dl.tryWeb':go('Try the web app first'),
    'dl.previewAlt':'Preview of to-dos, schedule and notes in the dark Shixu workbench','dl.previewCap':'Everything has its place.',
    'install.h':'Extract. Open.<br>Start writing.',
    'install.1h':'Extract to a permanent folder','install.1p':'Keep every file from the archive. Don’t launch from inside the ZIP, and don’t copy only the EXE.',
    'install.2h':'Run Shixu.exe','install.2p':'Write down a to-do, schedule an event or leave a note. Desktop widgets can be created inside the app.',
    'install.3h':'Connect the web when you need it','install.3p':'Sign in to the same Fairy account on desktop and web, and items and categories sync automatically with encryption.',
    'release.h':'This release keeps<br>your records moving.','release.current':zh=>'Current release '+((zh.match(/\d+\.\d+\.\d+/)||[''])[0]),
    'release.1h':'Encrypted sync between web and desktop','release.1p':'Items and categories are encrypted on your device before they reach your account. API keys, chat history and desktop window settings stay on this PC.',
    'release.2h':'Resolve conflicts, then continue','release.2p':'Changes to different records merge. Concurrent edits to the same record pause sync and keep both versions for you to choose from.',
    'release.3h':'Everything you use daily stays','release.3p':'To-dos, events, notes, categories, desktop widgets, focus and the assistant, all still in one workbench.',
    'release.checksum':'View archive checksum',
    'alt.h':'Or just<br>open it in a browser.','alt.p':'No install needed. Capture to-dos, edit events and tidy notes. Once signed in, continue the same plans you have on desktop.','alt.btn':go('Open the web workbench'),
    'alt.note':'The web assistant currently uses local rules. For native widgets and tray reminders, use the Windows version.',
    'download.started':'Download link opened. When it finishes, extract all files before running.',
    'support.label':'Product support','support.fairy':'Fairy family','support.changelog':'Changelog','support.help':'Help','support.privacy':'Privacy',
    'lang.switch':'中文','lang.switchLabel':'切换到中文'
  };
  const zh={'download.started':'已打开下载链接。下载完成后，解压全部文件再运行。','lang.switch':'English','lang.switchLabel':'Switch to English'};
  const root=document.documentElement,page=document.body.dataset.page,saved=new Map(),savedAttrs=new Map();
  const head={title:document.title,description:document.querySelector('meta[name="description"]')?.content||''};
  let lang='zh';
  try{lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('shixu-lang')||(/^zh\b/i.test(navigator.language||'zh')?'zh':'en');}catch{}
  lang=lang==='en'?'en':'zh';
  const t=key=>(lang==='en'?en:zh)[key];
  const switcher=document.createElement('button');
  switcher.type='button';switcher.className='lang-switch';
  document.querySelector('.site-header nav')?.append(switcher);
  function applyLanguage(){
    root.lang=lang==='en'?'en':'zh-CN';
    for(const el of document.querySelectorAll('[data-i18n]')){
      if(!saved.has(el))saved.set(el,el.innerHTML);
      const value=lang==='en'?en[el.dataset.i18n]:null;
      el.innerHTML=value==null?saved.get(el):typeof value==='function'?value(saved.get(el)):value;
    }
    for(const el of document.querySelectorAll('[data-i18n-attr]'))for(const pair of el.dataset.i18nAttr.split(';')){
      const [attr,key]=pair.split(':');
      if(!savedAttrs.has(el))savedAttrs.set(el,{});
      const original=savedAttrs.get(el);if(!(attr in original))original[attr]=el.getAttribute(attr);
      el.setAttribute(attr,lang==='en'&&en[key]!=null?en[key]:original[attr]);
    }
    if(page){document.title=lang==='en'?en[page+'.title']:head.title;document.querySelector('meta[name="description"]')?.setAttribute('content',lang==='en'?en[page+'.description']:head.description);}
    switcher.textContent=t('lang.switch');switcher.lang=lang==='en'?'zh-CN':'en';switcher.setAttribute('aria-label',t('lang.switchLabel'));
    const note=document.querySelector('.download-state');if(note)note.textContent=t('download.started');
    root.classList.remove('i18n-pending');
  }
  switcher.addEventListener('click',()=>{
    lang=lang==='en'?'zh':'en';
    try{localStorage.setItem('shixu-lang',lang);}catch{}
    try{const url=new URL(location.href);if(url.searchParams.has('lang')){url.searchParams.set('lang',lang);history.replaceState(history.state,'',url);}}catch{}
    applyLanguage();
    if(window.ScrollTrigger)window.ScrollTrigger.refresh();
  });
  applyLanguage();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),story=document.querySelector('.product-story'),buttons=[...document.querySelectorAll('[data-scene]')];
  let storyTrigger=null,active=-1;
  const scenes=[...document.querySelectorAll('.story-scene')];
  function activate(index){if(index===active)return;active=index;buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));scenes.forEach((scene,i)=>scene.setAttribute('aria-hidden',String(!!storyTrigger&&i!==index)));}
  buttons.forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.scene);if(storyTrigger){window.ScrollTrigger.refresh();const distance=storyTrigger.end-storyTrigger.start;window.scrollTo({top:storyTrigger.start+distance*((index+.55)/4),behavior:reduced.matches?'instant':'smooth'});}else scenes[index].scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});activate(index);}));
  // Everything is visible before JS; no script/library failure leaves a blank story.
  if(window.gsap&&window.ScrollTrigger){
    const {gsap,ScrollTrigger}=window;gsap.registerPlugin(ScrollTrigger);
    const media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.from('.title-line>span',{yPercent:106,duration:1.05,ease:'power3.out',stagger:.11,clearProps:'transform'});
      gsap.from('.hero-intro,.download-package',{y:24,opacity:0,duration:.8,delay:.22,stagger:.08,ease:'power2.out',clearProps:'transform,opacity'});
      gsap.from('.hero-stage',{clipPath:'inset(18% 0 0 0 round 36px)',duration:1.25,ease:'power3.out',clearProps:'clipPath'});
      if(document.querySelector('.hero-stage'))gsap.to('.hero-screen',{scale:1.045,yPercent:-2,ease:'none',scrollTrigger:{trigger:'.hero-stage',start:'top 85%',end:'bottom top',scrub:1}});
      for(const section of document.querySelectorAll('.section-space')){
        const parts=[...section.querySelectorAll('h2,h3,p,.button,figure,details,li')].filter(e=>!e.closest('details:not([open])')||e.tagName==='DETAILS');
        gsap.from(parts,{y:22,opacity:0,duration:.65,stagger:.055,ease:'power2.out',scrollTrigger:{trigger:section,start:'top 84%',once:true},clearProps:'transform,opacity'});
      }
    });
    media.add('(min-width: 768px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)',()=>{
      if(!story)return;
      story.classList.add('story-enhanced');
      gsap.set(scenes.slice(1),{autoAlpha:0});
      const stage=story.querySelector('.story-stage');
      const timeline=gsap.timeline({scrollTrigger:{trigger:stage,start:'top top',end:()=>'+='+Math.max(innerHeight*3.2,2300),pin:true,scrub:.65,invalidateOnRefresh:true,onUpdate:self=>activate(Math.min(3,Math.floor(self.progress*4)))}});
      storyTrigger=timeline.scrollTrigger;activate(0);
      timeline.to({}, {duration:1});
      for(let i=1;i<scenes.length;i++){
        const at=i;
        timeline.to(scenes[i-1],{autoAlpha:0,y:-20,duration:.22,ease:'power1.inOut'},at);
        timeline.fromTo(scenes[i],{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.32,ease:'power2.out'},at+.04);
        timeline.fromTo(scenes[i].querySelector('img'),{scale:1.035},{scale:1,duration:.7,ease:'power2.out'},at+.04);
      }
      timeline.to({}, {duration:.8},3.3);
      gsap.fromTo('.story-progress span',{scaleX:.04},{scaleX:1,ease:'none',scrollTrigger:{trigger:stage,start:'top top',end:()=>'+='+Math.max(innerHeight*3.2,2300),scrub:true}});
      return()=>{storyTrigger=null;active=-1;story.classList.remove('story-enhanced');scenes.forEach(scene=>scene.removeAttribute('aria-hidden'));};
    });
    window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
    document.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{
      ScrollTrigger.refresh();
      if(details.open&&!reduced.matches&&document.documentElement.dataset.input==='pointer')
        gsap.fromTo([...details.children].filter(el=>el.tagName!=='SUMMARY'),{opacity:.7,y:4},{opacity:1,y:0,duration:.2,ease:'power2.out',overwrite:true,clearProps:'transform,opacity'});
    }));
  }
  const download=document.querySelector('[data-download]');
  if(download)download.addEventListener('click',()=>{let note=document.querySelector('.download-state');if(!note){note=document.createElement('p');note.className='download-state';note.setAttribute('role','status');download.after(note);}note.textContent=t('download.started');});
})();
