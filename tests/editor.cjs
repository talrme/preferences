const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:5196/?demo=1&room=editor-test');await p.locator('.topic-tile').first().click({position:{x:24,y:24}});assert.equal(await p.locator('#modal-title').innerText(),'Add a Topic');
  assert.equal(await p.locator('#item-text').getAttribute('placeholder'),null);assert.equal(await p.locator('#item-text').inputValue(),'');assert(await p.getByText('Add this to the list of topics',{exact:true}).isVisible());
  for(const width of [320,390,600]){
   await p.setViewportSize({width,height:844});const rect=await p.locator('#modal').boundingBox();assert(rect.y>=0&&rect.y<30,'Phone editor opens at top');
   for(const palette of ['design','night']){
    await p.evaluate(palette=>{document.body.dataset.palette=palette;Object.defineProperty(visualViewport,'height',{configurable:true,get:()=>350});visualViewport.dispatchEvent(new Event('resize'));},palette);
    const save=await p.locator('[data-save-item]').boundingBox();assert(save.y>=0&&save.y+save.height<=350,'Save stays above simulated keyboard');assert(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth));
   }
  }
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/preferences-editor-keyboard.png'});
  await p.locator('#item-text').fill('Weekend picnics');await p.locator('#save-topic').check();await p.locator('[data-save-item]').click();await p.locator('#modal').waitFor({state:'hidden'});assert(await p.evaluate(()=>PreferencesTest.getTopics().some(t=>t.text==='Weekend picnics')));
  await p.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});await p.setViewportSize({width:1280,height:900});await p.locator('.topic-tile').first().click({position:{x:24,y:24}});assert.equal(await p.locator('#modal-title').innerText(),'Edit Topic');const desktop=await p.locator('#modal').boundingBox();assert(Math.abs(desktop.y-(900-desktop.height)/2)<3,'Desktop remains centered');assert.equal(await p.locator('#item-text').inputValue(),'Weekend picnics');await p.mouse.click(1,1);assert(!(await p.locator('#modal').isVisible()));
  const previous=await p.evaluate(()=>PreferencesTest.getPublic().items[0].text);await p.locator('[data-shuffle-item="0"]').click();await p.waitForFunction(old=>PreferencesTest.getPublic().items[0].text!==old,previous);assert(!(await p.locator('#modal').isVisible()),'Shuffle does not open editor');await p.locator('[data-edit-item="1"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#modal-title').innerText(),'Add a Topic');await p.locator('.close').click();
  console.log('PASS editor wording, no placeholder, 320/390/600px top positioning, simulated keyboard/save visibility, night mode, explicit save to library, desktop centering, backdrop close.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
