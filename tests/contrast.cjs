const {chromium}=require('playwright'),assert=require('node:assert/strict');
const rgb=value=>value.startsWith('#')?value.slice(1).match(/../g).map(x=>parseInt(x,16)):value.match(/[\d.]+/g).slice(0,3).map(Number);
const lum=color=>rgb(color).map(x=>{const n=x/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:5196/?demo=1&room=contrast-test');await p.locator('[data-draw]').waitFor();let minText=Infinity,minSurface=Infinity;
  async function audit(selector,surface=false){for(const element of await p.locator(selector).all()){
   if(!await element.isVisible()||await element.isDisabled())continue;
   for(const hover of [false,true]){if(hover)await element.hover();else await p.mouse.move(0,0);
    const colors=await element.evaluate(el=>{const s=getComputedStyle(el),body=getComputedStyle(document.body);return {ink:s.color,bg:s.backgroundColor,start:body.getPropertyValue('--bg-start').trim(),end:body.getPropertyValue('--bg-end').trim(),paper:body.getPropertyValue('--paper').trim()};});
    const text=ratio(colors.ink,colors.bg);minText=Math.min(minText,text);assert(text>=4.5,`${selector} text contrast ${text.toFixed(2)} hover=${hover}`);
    if(surface){const a=rgb(colors.start),b=rgb(colors.end);for(let i=0;i<=20;i++){const bg='rgb('+a.map((x,j)=>Math.round(x+(b[j]-x)*i/20)).join(',')+')',r=ratio(colors.bg,bg);minSurface=Math.min(minSurface,r);assert(r>=3,`${selector} against gradient ${r.toFixed(2)}`);}}
   }
  }}
  async function palettes(check){for(const palette of ['design','citrus','ocean','rose','night']){await p.evaluate(value=>document.body.dataset.palette=value,palette);await check(palette);}}
  await palettes(async palette=>{for(const element of await p.locator('.header-name,.footer-tools button,.ranker-info,.new-round,.qr-reminder').all()){const colors=await element.evaluate(el=>{const body=getComputedStyle(document.body);return {ink:getComputedStyle(el).color,start:body.getPropertyValue('--bg-start').trim(),end:body.getPropertyValue('--bg-end').trim()};});for(const background of [colors.start,colors.end]){const r=ratio(colors.ink,background);assert(r>=4.5,`Quiet control/text ${await element.innerText()} ${palette}: ${r.toFixed(2)}`);}}});
  await palettes(async()=>{await audit('[data-draw],[data-volunteer]',true);});
  await p.locator('[data-player-name]').click();await p.locator('#player-name').fill('Tal');await p.locator('[data-avatar="koala"]').click();await palettes(async()=>{await audit('#modal-footer>button:not(.text-link),.avatar-choice[aria-pressed=true]');});await p.locator('[data-save-name]').click();await p.locator('#modal').waitFor({state:'hidden'});
  await p.locator('[data-volunteer]').click();await p.locator('[data-draw]').click();await p.locator('[data-claim]').waitFor();await palettes(async palette=>{await audit('[data-volunteer],[data-claim]',true);for(const width of [320,390,1280]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await p.setViewportSize({width:390,height:844});await p.mouse.move(0,0);await p.screenshot({path:`/tmp/preferences-contrast-${palette}-phone.png`,fullPage:true});});
  await p.locator('[data-claim]').click();await p.locator('.ranking-list').waitFor();await palettes(async()=>{await audit('.rank-tools .icon');await audit('[data-ready]',true);});await p.locator('[data-ready]').click();await p.locator('[data-start-reveal]').waitFor();await palettes(async()=>{await audit('[data-step-back],[data-start-reveal]',true);});
  await p.setViewportSize({width:1280,height:900});await p.evaluate(()=>document.body.dataset.palette='design');await p.mouse.move(0,0);await p.screenshot({path:'/tmp/preferences-contrast-desktop.png',fullPage:true});
  console.log(`PASS all 5 palettes, hover/selected states, dialogs/avatars/arrows/primary/secondary buttons, 320/390/1280; minimum text ${minText.toFixed(2)}:1, minimum action/gradient ${minSurface.toFixed(2)}:1.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
