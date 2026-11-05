const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:740},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:5196/?demo=1&room=footer-tools');await p.locator('[data-draw]').waitFor();
  assert.deepEqual(await p.locator('.footer-tools button>span').allTextContents(),['Settings','Topics','Share / Save','Room']);
  for(const width of [320,390,1280])for(const palette of ['design','citrus','ocean','rose','night']){await p.setViewportSize({width,height:900});await p.evaluate(value=>document.body.dataset.palette=value,palette);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const buttons=await p.locator('.footer-tools button').evaluateAll(elements=>elements.map(el=>({y:el.getBoundingClientRect().y,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,fits:el.scrollWidth<=el.clientWidth})));assert(buttons.every(b=>b.w>=44&&b.h>=44&&b.fits));assert(buttons.every(b=>Math.abs(b.y-buttons[0].y)<1));}
  for(const [selector,title] of [['[data-settings]','Settings'],['[data-topics]','Topic library'],['[data-share]','Share / Save'],['[data-room]','Your room']]){await p.locator(selector).click();assert.equal(await p.locator('#modal-title').innerText(),title);await p.keyboard.press('Escape');}
  await p.locator('[data-room]').click();await p.locator('[data-table-settings]').click();assert.equal(await p.locator('#settings-tables summary').innerText(),'Rooms');assert(await p.locator('#settings-tables').evaluate(el=>el.open));await p.keyboard.press('Escape');await p.locator('[data-qr]').click();assert.equal(await p.locator('#modal-title').innerText(),'Join this table');await p.keyboard.press('Escape');
  for(const [width,palette,suffix] of [[390,'design','phone'],[390,'night','night'],[1280,'design','desktop']]){await p.setViewportSize({width,height:740});await p.evaluate(value=>document.body.dataset.palette=value,palette);await p.locator('.footer').scrollIntoViewIfNeeded();await p.mouse.move(0,0);await p.screenshot({path:`/tmp/preferences-footer-tools-${suffix}.png`});}
  console.log('PASS4 aligned footer tools, names/icons, all dialogs/QR, Room settings focus,44px targets and320/390/1280 across all palettes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
