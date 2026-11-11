const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=process.env.VIDEO_PROJECT;
const build=process.env.VIDEO_BUILD;
const ff=process.env.VIDEO_FFMPEG || 'ffmpeg';
const timeline=JSON.parse(fs.readFileSync(path.join(root,'timeline.json'),'utf8'));
(async()=>{
 const browser=await chromium.launch({...(process.env.VIDEO_BROWSER_CHANNEL ? {channel:process.env.VIDEO_BROWSER_CHANNEL} : {}),headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 try{
  let page=await browser.newPage({viewport:{width:540,height:960}});
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await page.route('http://film.local/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
   const type=name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':'text/html';
   return route.fulfill({path:path.join(root,name),contentType:type});
  });
  await page.goto('http://film.local/?export');
  await page.waitForFunction(()=>window.animationReady,{},{timeout:16000});
  if(process.argv.includes('--preview')){
    for(let i=0;i<timeline.scenes.length;i++){
      const {start,end}=timeline.scenes[i];
      await page.evaluate(t=>window.seekTo(t),start+(end-start)*.38);
      await page.screenshot({path:path.join(build,'frame-'+i+'.jpg'),type:'jpeg',quality:88});
    }
    return;
  }
  const [first,last]=process.argv.slice(2).map(Number);
  const fps=24;
  const start=Math.ceil(timeline.scenes[first].start*fps),end=Math.ceil(timeline.scenes[last].end*fps);
  const enc=spawn(ff,['-v','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-filter_threads','2','-vf','scale=720:1280','-c:v','libx264','-threads','2','-preset','veryfast','-crf','20','-pix_fmt','yuv420p',path.join(build,'part-'+first+'.mp4')],{stdio:['pipe','ignore','inherit'],windowsHide:true});
  const done=new Promise((res,rej)=>{enc.on('error',rej);enc.on('exit',c=>c?rej(Error('ffmpeg '+c)):res());});
  try{
   for(let f=start;f<end;f+=4){
    if(f>start && (f-start)%180===0){await page.reload();await page.waitForFunction(()=>window.animationReady,{},{timeout:16000});}
    const images=await page.evaluate(({f,end,fps})=>{
      const c=document.querySelector('canvas'),arr=[];
      if(!c)throw Error('Canvas ausente');
      for(let j=f;j<Math.min(f+4,end);j++){
        window.seekTo(j/fps);arr.push(c.toDataURL('image/jpeg',.9).split(',')[1]);
      }
      return arr;
    },{f,end,fps});
    for(const img of images)if(!enc.stdin.write(Buffer.from(img,'base64')))await new Promise(r=>enc.stdin.once('drain',r));
    if((f-start)%120===0)console.log(first,f,end);
   }
  }finally{enc.stdin.end();}
  await done;if(errors.length)throw Error(errors.join('; '));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
