(()=>{
  'use strict';
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
    document.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>ScrollTrigger.refresh()));
  }
  const download=document.querySelector('[data-download]');
  if(download)download.addEventListener('click',()=>{let note=document.querySelector('.download-state');if(!note){note=document.createElement('p');note.className='download-state';note.setAttribute('role','status');download.after(note);}note.textContent='已打开下载链接。下载完成后，解压全部文件再运行。';});
})();
