import {px,W,H,outline,eraseRegion,silhouette,angledLayout,printPNG} from './plancha-core.js';

const $=id=>document.getElementById(id);
const key=new URL(location.href).searchParams.get('doc')||'libre';
const settings=['mode','space','margin','gap','maxCm','angles'];
const items=[];
let pages=[], revision=0;
function canvas(w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function context(c){return c.getContext('2d',{willReadFrequently:true});}
function number(field,min,max,integer=false){
  const value=Number(field);
  if(field==='' || !Number.isFinite(value) || value<min || value>max || (integer&&!Number.isInteger(value)))
    throw Error('Revisá las medidas y cantidades indicadas.');
  return value;
}
async function loadImage(file){
  const url=URL.createObjectURL(file),img=new Image();
  try{
    img.src=url;await img.decode();
    const ratio=Math.min(1,4000/Math.max(img.width,img.height));
    const c=canvas(Math.max(1,Math.round(img.width*ratio)),Math.max(1,Math.round(img.height*ratio)));
    context(c).drawImage(img,0,0,c.width,c.height);return c;
  }finally{URL.revokeObjectURL(url);}
}
function build(item){
  const {source,opts}=item, w=source.width,h=source.height;
  const data=context(source).getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let i=0;i<w*h;i++)if(data[4*i+3]>8){
    const x=i%w,y=Math.floor(i/w);
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
  }
  if(x1<x0)throw Error('El diseño quedó vacío. Restaurá el fondo.');
  const limit=px(number(opts.cm===''?$('maxCm').value:opts.cm,.5,29.7)*10);
  const edge=opts.border==='on'?number(opts.expand,1,100,true):0;
  const smooth=edge?number(opts.smooth,0,100,true):0;
  const ratio=(y1-y0+1)/(x1-x0+1);
  const innerWidth=opts.legacyWidth?limit-edge*2:Math.max(1,Math.round((limit-edge*2)/Math.max(1,ratio)));
  const width=innerWidth+edge*2;
  if(limit<=edge*2 || innerWidth<1)throw Error('El borde supera el ancho del sticker.');
  const innerHeight=Math.max(1,(ratio>1&&!opts.legacyWidth?limit-edge*2:Math.round(innerWidth*ratio)));
  const height=innerHeight+2*edge;
  if(height>H)throw Error('El diseño es demasiado alto para una hoja A4.');
  const art=canvas(width,height), ctx=context(art);
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,x0,y0,x1-x0+1,y1-y0+1,edge,edge,innerWidth,innerHeight);
  if(!edge)return art;
  // A transparent guard pixel makes the outside stroke continuous at all four extrema.
  const padded=canvas(width+2,height+2), pc=context(padded);
  pc.drawImage(art,1,1);
  const raw=pc.getImageData(0,0,padded.width,padded.height);
  const alpha=new Uint8Array(padded.width*padded.height);
  for(let i=0;i<alpha.length;i++)alpha[i]=raw.data[i*4+3]>8?1:0;
  const mask=outline(alpha,padded.width,padded.height,edge,smooth);
  for(let i=0;i<mask.length;i++){
    const j=i*4,color=mask[i]===2?255:0;
    raw.data[j]=raw.data[j+1]=raw.data[j+2]=color;raw.data[j+3]=mask[i]?255:0;
  }
  pc.putImageData(raw,0,0);pc.drawImage(art,1,1);
  ctx.clearRect(0,0,width,height);ctx.drawImage(padded,-1,-1);
  return art;
}
function thumbnail(item){
  const c=item.card.querySelector('canvas'),ctx=context(c);
  const editing=item.card.querySelector('details').open;
  const src=(editing&&item.source)||item.art||item.source;
  if(!src)return;
  const scale=Math.min(c.width/src.width,c.height/src.height);
  const w=src.width*scale,h=src.height*scale,x=(c.width-w)/2,y=(c.height-h)/2;
  ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(src,x,y,w,h);
  return {scale,x,y};
}
function draw(c,index){
  const ctx=context(c);ctx.save();ctx.scale(c.width/W,c.height/H);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.imageSmoothingQuality='high';
  for(const p of pages[index]||[]){
    ctx.save();ctx.translate(p.x,p.y);
    if(p.angle!=null){ctx.translate(p.offsetX,p.offsetY);ctx.rotate(p.angle*Math.PI/180);}
    else if(p.rotated){ctx.translate(p.w,0);ctx.rotate(Math.PI/2);}
    ctx.drawImage(items[p.id].art,0,0);ctx.restore();
  }
  ctx.restore();
}
let sequence=0;
async function restoreSource(item){
  if(item.source)return item.source;
  if(!item.loading)item.loading=loadImage(item.file).then(source=>{
    for(const click of item.clicks)applyErase(source,click);
    item.source=source;return source;
  }).finally(()=>{item.loading=null;});
  return item.loading;
}
function release(item){
  if(item.source&&!item.card.querySelector('details').open){
    item.source.width=item.source.height=1;item.source=null;
  }
}
async function refresh(){
  const seq=++sequence;
  const selected=Number($('page').value)||0;
  pages=[];$('download').disabled=true;$('page').hidden=true;
  try{
    if(!items.length)throw Error('Agregá una imagen para empezar.');
    for(const item of items){
      item.card.querySelector('.edge').hidden=item.opts.border!=='on';
      item.card.querySelector('.quantity').hidden=$('mode').value==='fill';
      if(!item.art){
        await restoreSource(item);
        if(seq!==sequence)return;
        try{item.art=build(item);}catch(e){throw Error(item.name+' · '+e.message);}
        finally{release(item);}
      }
      thumbnail(item);
    }
    const step=$('angles').value==='free'?'free':Number($('angles').value);
    const sizes=items.map(i=>{
      const {width:w,height:h}=i.art;
      if(step && i.maskArt!==i.art){
        i.strips=silhouette(context(i.art).getImageData(0,0,w,h).data,w,h);
        i.maskArt=i.art;
      }
      return {w,h,strips:i.strips,qty:number(i.opts.qty,1,500,true)};
    });
    const result=angledLayout(sizes,px(number($('margin').value,0,50)),px(number($('gap').value,0,50)),
      $('mode').value==='fill',$('space').value==='spread',step);
    pages=result.pages;
    $('page').replaceChildren(...pages.map((_,i)=>new Option('Hoja '+(i+1),i)));
    $('page').value=String(Math.min(selected,pages.length-1));$('page').hidden=pages.length<=1;
    const turns=new Map();
    for(const page of pages)for(const piece of page){
      const angle=piece.angle??(piece.rotated?90:0);
      turns.set(angle,(turns.get(angle)||0)+1);
    }
    const angles=Array.from(turns).sort((a,b)=>a[0]-b[0]).map(([deg,n])=>n+' a '+deg+'°').join(', ');
    $('status').textContent=items.length+' diseños · '+result.counts.reduce((n,c)=>n+c,0)+' copias · '+pages.length+' hoja(s) · '+angles;
    $('download').disabled=!pages.length;
  }catch(e){$('status').textContent=e.message;}
  draw($('sheet'),Number($('page').value));
}
function changed(){revision++;$('saved').textContent='Cambios pendientes de guardar.';return refresh();}
async function add(record){
  const source=await loadImage(record.file);
  for(const click of record.clicks||[])applyErase(source,click);
  const card=$('card').content.firstElementChild.cloneNode(true);
  const item={...record,source,card,clicks:record.clicks||[],opts:{cm:'',border:'off',expand:35,smooth:30,tol:28,qty:1,...record.opts}};
  try{item.art=build(item);}catch{item.art=null;}
  release(item);
  items.push(item);$('items').append(card);card.querySelector('strong').textContent=item.name;
  if(item.opts.legacyWidth)card.querySelector('[data-k=cm]').parentElement.firstChild.textContent='Ancho anterior (cm)';
  const details=card.querySelector('details');
  details.ontoggle=async()=>{
    if(details.open){details.inert=true;
      try{await restoreSource(item);}catch(e){$('status').textContent=e.message;details.open=false;}
      finally{details.inert=false;}
    }
    if(!details.open)release(item);
    thumbnail(item);
  };
  for(const input of card.querySelectorAll('[data-k]')){
    const k=input.dataset.k;input.value=item.opts[k];
    input.onchange=()=>{item.opts[k]=input.value;if(k==='cm'){item.opts.legacyWidth=false;input.parentElement.firstChild.textContent='Máximo propio (cm)';}if(!['tol','qty'].includes(k))item.art=null;changed();};
  }
  card.querySelector('[data-action=delete]').onclick=()=>{items.splice(items.indexOf(item),1);card.remove();changed();};
  card.querySelector('[data-action=reset]').onclick=async()=>{
    try{item.source=await loadImage(item.file);item.clicks=[];item.art=null;changed();thumbnail(item);}
    catch(e){$('status').textContent=e.message;}
  };
  card.querySelector('[data-action=auto]').onclick=()=>{
    const c=item.source,ctx=context(c),img=ctx.getImageData(0,0,c.width,c.height);
    const corners=[[0,0],[c.width-1,0],[0,c.height-1],[c.width-1,c.height-1]];
    const color=([x,y])=>img.data.slice(4*(x+y*c.width),4*(x+y*c.width)+4);
    const tol=Number(item.opts.tol);
    const similar=(a,b)=>a[3]&&b[3]&&[0,1,2].every(k=>Math.abs(a[k]-b[k])<=tol);
    const seed=corners.find(p=>corners.filter(q=>similar(color(p),color(q))).length>=3);
    if(!seed){$('status').textContent='El fondo no es uniforme. Tocá las zonas que querés quitar en la miniatura.';return;}
    const matches=corners.filter(p=>similar(color(p),color(seed)));
    for(const [x,y] of matches){eraseRegion(img.data,c.width,c.height,y*c.width+x,tol);item.clicks.push([x,y,tol]);}
    ctx.putImageData(img,0,0);item.art=null;changed();thumbnail(item);
  };
  const thumb=card.querySelector('canvas');
  thumb.onclick=e=>{
    if(!details.open)return;
    const box=thumb.getBoundingClientRect(),{scale,x,y}=thumbnail(item);
    const sx=Math.floor(((e.clientX-box.left)*thumb.width/box.width-x)/scale);
    const sy=Math.floor(((e.clientY-box.top)*thumb.height/box.height-y)/scale);
    if(sx<0||sy<0||sx>=item.source.width||sy>=item.source.height)return;
    const click=[sx,sy,Number(item.opts.tol)];
    applyErase(item.source,click);item.clicks.push(click);item.art=null;changed();thumbnail(item);
  };
  thumbnail(item);
}
function applyErase(source,[x,y,tol]){
  const ctx=context(source),img=ctx.getImageData(0,0,source.width,source.height);
  eraseRegion(img.data,source.width,source.height,y*source.width+x,tol);ctx.putImageData(img,0,0);
}
$('files').onchange=async e=>{
  const files=Array.from(e.target.files),errors=[];e.target.value='';
  $('status').textContent='Preparando '+files.length+' imágenes…';
  for(const file of files)try{await add({file,name:file.name});}catch{errors.push(file.name);}
  await changed();if(errors.length)$('status').textContent+=' · No se pudo abrir '+errors.join(', ');
};
for(const k of settings)$(k).onchange=()=>{
  if(k==='maxCm')for(const item of items)if(item.opts.cm==='')item.art=null;
  changed();
};
$('page').onchange=()=>draw($('sheet'),Number($('page').value));
$('download').onclick=async()=>{
  try{
    const index=Number($('page').value),out=canvas(W,H);draw(out,index);
    const a=document.createElement('a');a.href=URL.createObjectURL(await printPNG(out));
    a.download='Waxi-A4-'+(index+1)+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
  }catch(e){$('status').textContent=e.message;}
};
async function drafts(mode,value){
  const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('waxi-planchas',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('documentos');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('documentos',mode),store=tx.objectStore('documentos');
    const req=mode==='readonly'?store.get(key):store.put(value,key);
    tx.oncomplete=()=>resolve(req.result);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
$('save').onclick=async()=>{
  const version=revision;
  try{await drafts('readwrite',{settings:Object.fromEntries(settings.map(k=>[k,$(k).value])),
    items:items.map(({name,file,opts,clicks})=>({name,file,opts,clicks}))});
    if(version===revision)$('saved').textContent='Plancha guardada en este dispositivo.';
  }catch{$('saved').textContent='No se pudo guardar la plancha. Revisá el espacio disponible.';}
};
document.querySelector('main').inert=true;
try{
  const saved=await drafts('readonly');
  if(saved){
    for(const k of settings)if(saved.settings[k]!=null)$(k).value=saved.settings[k];
    for(const item of saved.items){
      if(saved.settings.maxCm==null)item.opts.legacyWidth=true;
      await add(item);
    }
  }
  await refresh();
}catch{$('saved').textContent='No se pudo recuperar la plancha guardada.';}
finally{document.querySelector('main').inert=false;}
