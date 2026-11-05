const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(let i=1;i<=10;i++){
   const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await c.route('**/firestore.googleapis.com/**',r=>{errors.push('Sandbox contacted Firebase');return r.abort();});
   await p.goto(`http://127.0.0.1:5196/staging/${String(i).padStart(2,'0')}/?demo=1&room=test-${i}`);
   await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Sandbox'));
   assert.equal(await p.locator('.topic-tile').count(),4);await p.locator('[data-draw]').click();
   await p.waitForFunction(()=>PreferencesTest.getPublic().items.every(i=>i.text));
   await p.locator('[data-edit-item="0"]').click();await p.locator('#item-text').fill('Sleeping with socks on while listening to an extremely detailed documentary');await p.locator('[data-save-item]').click();
   await p.locator('#modal').waitFor({state:'hidden'});await p.locator('[data-claim]').click();await p.locator('.ranking-list').waitFor();
   const original=await p.evaluate(()=>PreferencesTest.getPrivate());await p.locator('[data-move="0"][data-direction="1"]').click();assert.notDeepEqual(await p.evaluate(()=>PreferencesTest.getPrivate()),original);
   await p.reload();await p.locator('.ranking-list').waitFor();assert.equal(await p.evaluate(()=>PreferencesTest.getPrivate()[1]),original[0]);
   await p.locator('[data-ready]').click();await p.locator('[data-reveal]').waitFor();assert(!(await p.locator('.ranking-list').isVisible()));
   const publicRoom=await p.evaluate(()=>PreferencesTest.getPublic());assert.equal(publicRoom.phase,'discuss');assert.deepEqual(publicRoom.revealed,[]);assert(!('order' in publicRoom));
   for(let j=1;j<=4;j++){await p.locator('[data-reveal]').click();await p.waitForFunction(n=>PreferencesTest.getPublic().revealed.length===n,j);assert.equal(await p.locator('.revealed').count(),j);}
   await p.locator('[data-next]').click();await p.locator('[data-draw]').waitFor();
   await p.locator('[data-topics]').click();await p.locator('[data-new-topic]').click();await p.locator('#topic-text').fill('Test topic '+i);await p.locator('[data-save-topic]').click();await p.locator('#topic-search').fill('Test topic '+i);
   await p.locator('[data-edit-topic]').click();await p.locator('#topic-text').fill('Updated test topic '+i);await p.locator('[data-save-topic]').click();await p.locator('#topic-search').fill('Updated test topic '+i);
   await p.locator('[data-remove-topic]').click();await p.locator('[data-confirm]').click();await p.locator('[data-topic-filter=archived]').click();await p.locator('[data-restore-topic]').click();await p.locator('[data-topic-filter=active]').click();await p.locator('#topic-search').fill('Updated test topic '+i);assert.equal(await p.locator('.library-row').count(),1);await p.locator('[data-close]').first().click();
   await p.locator('[data-settings]').click();
   for(const palette of ['design','citrus','ocean','rose','night'])for(const width of [320,390,1280]){
    await p.setViewportSize({width,height:900});await p.locator(`button[data-palette=${palette}]`).click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflow '+i+' '+palette+' '+width);assert(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth),'Modal overflow');
   }
   for(const level of ['off','gentle','playful','ridiculous'])await p.locator('#motion').selectOption(level);
   await p.locator('button[data-palette=design]').click();await p.locator('#motion').selectOption('off');await p.mouse.click(1,1);assert(!(await p.locator('#modal').isVisible()));
   await p.setViewportSize({width:390,height:844});await p.locator('[data-draw]').click();await p.waitForFunction(()=>PreferencesTest.getPublic().items.every(i=>i.text));
   await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:`/tmp/preferences-${String(i).padStart(2,'0')}-phone.png`,fullPage:true});await p.setViewportSize({width:1280,height:900});await p.screenshot({path:`/tmp/preferences-${String(i).padStart(2,'0')}-desktop.png`,fullPage:true});
   await p.locator('[data-qr]').click();assert.equal(await p.locator('#share-qr canvas').count(),1);assert((await p.locator('#share-url').inputValue()).includes('room=test-'+i));assert(!(await p.locator('#share-url').inputValue()).includes('demo'));await p.locator('.close').click();
   const manifest=await p.evaluate(async()=>fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json()));assert(manifest.start_url.includes('room=test-'+i));assert(!manifest.start_url.includes('demo'));
   assert(await p.locator('.identity img').evaluate(e=>e.complete&&e.naturalWidth>0));assert.deepEqual(errors,[]);await c.close();console.log('PASS design '+i+': full round/private reorder/reload/reveal, topic CRUD/restore, settings/palettes, room QR/install URL, 320/390/1280, sandbox isolation');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
