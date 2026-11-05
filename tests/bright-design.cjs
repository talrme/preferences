const {chromium}=require('playwright'),assert=require('node:assert/strict');
const rgb=value=>value.startsWith('#')?value.slice(1).match(/../g).map(x=>parseInt(x,16)):value.match(/[\d.]+/g).slice(0,3).map(Number);
const luminance=color=>rgb(color).map(x=>{const n=x/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:5196/?demo=1&room=bright-test');await p.locator('[data-draw]').click();await p.locator('[data-volunteer]').click();await p.locator('#player-name').fill('Tal');await p.locator('[data-save-name]').click();await p.locator('[data-claim]').waitFor();
  const backgrounds=new Set();for(const palette of ['design','citrus','ocean','rose','night']){
   await p.evaluate(value=>{document.body.dataset.palette=value;document.activeElement.blur();},palette);
   const colors=await p.locator('[data-claim]').evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));assert(contrast(colors.color,colors.bg)>=4.5,'Primary contrast '+palette);
   const bg=await p.locator('body').evaluate(el=>getComputedStyle(el).backgroundImage);assert(bg.includes('linear-gradient'));backgrounds.add(bg);
   for(const width of [320,390,1280]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('button,.topic-tile').evaluateAll(els=>els.every(el=>getComputedStyle(el).borderTopWidth==='0px'&&getComputedStyle(el).outlineStyle==='none')),'Flat controls/tiles '+palette);}
  }assert.equal(backgrounds.size,5,'Palette changes background');
  await p.evaluate(()=>document.body.dataset.palette='design');await p.setViewportSize({width:390,height:844});await p.waitForTimeout(200);await p.screenshot({path:'/tmp/preferences-bright-phone.png',fullPage:true});await p.setViewportSize({width:1280,height:900});await p.waitForTimeout(200);await p.screenshot({path:'/tmp/preferences-bright-desktop.png',fullPage:true});
  await p.locator('[data-edit-item="0"]').click();assert.equal(await p.locator('#item-text').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');assert.equal(await p.locator('#modal').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');await p.locator('.close').click();await p.locator('[data-claim]').focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.equal(await p.locator('[data-claim]').evaluate(el=>getComputedStyle(el).outlineStyle),'solid','Keyboard focus stays visible');
  console.log('PASS flat borderless controls/tiles/dialogs, distinct bright gradients, 4.5:1 primary contrast in all palettes, keyboard focus retained, 320/390/1280 layouts.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
