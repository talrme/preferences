const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await p.goto('http://127.0.0.1:5196/?demo=1&room=item-library');await p.locator('[data-draw]').waitFor();
  const role=p.locator('[data-volunteer]');assert.equal(await role.getAttribute('aria-pressed'),'false');assert(await role.locator('.ranker-switch').isVisible());
  const before=await p.evaluate(()=>PreferencesTest.getPublic());await p.locator('[data-edit-item="0"]').click();assert(!(await p.locator('.item-library').getAttribute('open')));
  await p.locator('.item-library summary').click();const choices=p.locator('[data-pick-topic]');assert.equal(await choices.count(),200);
  assert(await p.locator('.item-library-results').evaluate(el=>el.scrollHeight>el.clientHeight));
  const selected=await choices.first().getAttribute('data-pick-topic'),text=await choices.first().locator('span').innerText();const title=text.split('\n')[0];
  assert.equal(await p.locator('.item-library input[type=search]').count(),0);assert.equal(await choices.locator('span small').count(),0);await p.locator(`[data-pick-topic="${selected}"]`).click();assert.equal(await p.locator('#item-text').inputValue(),title);assert.deepEqual(await p.evaluate(()=>PreferencesTest.getPublic()),before,'Picking only changes the draft');
  await p.locator('[data-save-item]').click();await p.locator('#modal').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>PreferencesTest.getPublic().items[0].topicId),selected);
  await p.locator('[data-edit-item="1"]').click();await p.locator('.item-library summary').click();assert(await p.locator(`[data-pick-topic="${selected}"]`).isDisabled());
  for(const width of [320,390,1280])for(const palette of ['design','night','citrus','ocean','rose']){
   await p.setViewportSize({width,height:844});await p.evaluate(value=>document.body.dataset.palette=value,palette);assert(await p.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const save=await p.locator('[data-save-item]').boundingBox();assert(save.y>=0&&save.y+save.height<=844);
  }
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.body.dataset.palette='night');await p.screenshot({path:'/tmp/preferences-library-night-phone.png'});
  await p.locator('#item-text').fill('Uncommitted change');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>PreferencesTest.getPublic().items[1].text),'');
  await p.evaluate(()=>document.body.dataset.palette='design');await p.screenshot({path:'/tmp/preferences-toggle-off-phone.png'});
  await role.click();await p.locator('#player-name').fill('Tal');await p.locator('[data-save-name]').click();await p.waitForFunction(()=>document.querySelector('[data-volunteer]').getAttribute('aria-pressed')==='true');await p.screenshot({path:'/tmp/preferences-toggle-on-phone.png'});
  console.log('PASS names-only library without search, scroll/duplicates, draft-only selection, explicit Save/Cancel, library ID retention, toggle on/off visuals, 320/390/1280 and all palettes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
