const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),version='20261105-horizontal';
(async()=>{
 const bars='<rect width="512" height="512" rx="90" fill="#f3f7fb"/>'+[
  [86,78,340,'#e8796d'],[86,174,252,'#e3b641'],[86,270,300,'#369b8b'],[86,366,200,'#5381bc']
 ].map(([x,y,width,color])=>`<rect x="${x}" y="${y}" width="${width}" height="68" rx="13" fill="${color}"/>`).join('');
 for(const [name,size] of [['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180],['favicon.png',32]])await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">'+bars+'</svg>')).resize(size,size).png().toFile(path.join(root,'shared',name));
 fs.writeFileSync(path.join(root,'index.html'),fs.readFileSync(path.join(root,'tools/page.html'),'utf8'));
 fs.writeFileSync(path.join(root,'manifest.webmanifest'),JSON.stringify({id:'./',name:'Preferences',short_name:'Preferences',start_url:'./?room=table',scope:'./',display:'standalone',background_color:'#f5f6f2',theme_color:'#377765',icons:[{src:'shared/icon-192.png?v='+version,sizes:'192x192',type:'image/png'},{src:'shared/icon-512.png?v='+version,sizes:'512x512',type:'image/png'}]},null,2));
 // Keep the selected design's old link usable without retaining a second app.
 const legacy=path.join(root,'staging','01');fs.mkdirSync(legacy,{recursive:true});
 fs.writeFileSync(path.join(legacy,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preferences</title></head><body><a href="../../">Open Preferences</a><script>const url=new URL("../../",location.href);url.search=location.search;url.hash=location.hash;location.replace(url.href);</script></body></html>');
 console.log('Built Paper Bowl as the main game, horizontal-bar icons and the old option-one redirect.');
})();
