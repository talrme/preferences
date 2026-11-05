const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:740},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:5196/?demo=1&room=note-font');await page.locator('[data-draw]').waitFor();await page.evaluate(()=>document.fonts.load('18px "Patrick Hand"'));
  assert(await page.evaluate(()=>document.fonts.check('18px "Patrick Hand"')));
  const fonts=await page.locator('.ranker-reminder,.qr-reminder').evaluateAll(elements=>elements.map(el=>getComputedStyle(el).fontFamily));assert.equal(fonts.length,2);assert.equal(fonts[0],fonts[1]);assert(fonts[0].includes('Patrick Hand'));assert(!fonts[0].includes('cursive'));
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:390,height:740});await page.screenshot({path:'/tmp/preferences-print-notes-phone.png',fullPage:true});
  console.log('PASS bundled print-handwriting font loaded, matching top/bottom notes, no cursive fallback and320/390/1280 layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
