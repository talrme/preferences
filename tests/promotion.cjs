const {chromium}=require('playwright'),sharp=require('sharp'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');assert.deepEqual(fs.readdirSync(path.join(root,'staging')),['01']);assert.deepEqual(fs.readdirSync(path.join(root,'staging/01')),['index.html']);assert(!fs.existsSync(path.join(root,'shared/chooser.css')));
 const {data,info}=await sharp(path.join(root,'shared/icon-512.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
 for(const color of [[232,121,109],[227,182,65],[54,155,139],[83,129,188]]){let minX=512,minY=512,maxX=-1,maxY=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*3;if(color.every((c,k)=>data[i+k]===c)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}assert(maxX-minX>2*(maxY-minY),'Each bar must be horizontal');}
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:5196/staging/01/?demo=1&room=promotion');await p.waitForURL('http://127.0.0.1:5196/?demo=1&room=promotion');await p.waitForFunction(()=>window.PreferencesBackend?.status==='sandbox');
  assert.equal(await p.locator('body').getAttribute('data-design'),'1');assert.equal(await p.locator('.design-switch,.design-grid').count(),0);await p.locator('[data-draw]').click();await p.locator('[data-volunteer]').click();await p.locator('#player-name').fill('Tal');await p.locator('[data-save-name]').click();await p.locator('[data-claim]').click();await p.locator('.ranking-list').waitFor();await p.locator('[data-move="0"][data-direction="1"]').click();const privateBefore=await p.evaluate(()=>PreferencesTest.getPrivate());
  await p.goto('http://127.0.0.1:5196/staging/01/?demo=1&room=promotion');await p.locator('.ranking-list').waitFor();assert.deepEqual(await p.evaluate(()=>PreferencesTest.getPrivate()),privateBefore);
  await p.locator('[data-share]').click();assert.equal(await p.locator('#share-url').inputValue(),'https://talrme.github.io/preferences/?room=promotion');await p.locator('.close').click();
  const manifest=await p.evaluate(async()=>fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json()));assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'http://127.0.0.1:5196/?room=promotion');assert(manifest.icons.every(i=>i.src.includes('20261105-horizontal')));
  for(const width of [320,390,1280]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(150);await p.screenshot({path:'/tmp/preferences-promoted-phone.png',fullPage:true});await p.setViewportSize({width:1280,height:900});await p.waitForTimeout(150);await p.screenshot({path:'/tmp/preferences-promoted-desktop.png',fullPage:true});
  console.log('PASS Paper Bowl promotion: four horizontal PNG bars, retired designs gone, old link preserves room/sandbox/private ranking, root share/install URLs, versioned icons, phone/desktop. Sample-only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
