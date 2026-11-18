export const px = mm => Math.round(mm * 300 / 25.4);
export const W = px(210), H = px(297);

// Approximate Euclidean distance with orthogonal and diagonal neighbours.
function distance(mask, w, h, target) {
  const d = Float32Array.from(mask, value => value === target ? 0 : 1e6);
  for (const direction of [1, -1]) {
    let i = direction === 1 ? 0 : d.length - 1;
    for (let k = 0; k < d.length; k++, i += direction) {
      const x = i % w, side = x - direction, previous = i - direction * w;
      const hasSide = side >= 0 && side < w;
      if (hasSide) d[i] = Math.min(d[i], d[i-direction]+1);
      if (previous < 0 || previous >= d.length) continue;
      d[i] = Math.min(d[i], d[previous]+1);
      if (hasSide) d[i] = Math.min(d[i], d[previous-direction]+Math.SQRT2);
      if (x+direction >= 0 && x+direction < w) d[i] = Math.min(d[i], d[previous+direction]+Math.SQRT2);
    }
  }
  return d;
}

export function outline(alpha, w, h, expand, smooth) {
  let mask = Uint8Array.from(distance(alpha,w,h,1), n => n <= expand);
  if (smooth) {
    const inside = distance(mask,w,h,0);
    const core = Uint8Array.from(inside,n => n > smooth);
    const rounded = distance(core,w,h,1);
    mask = Uint8Array.from(mask,(v,i) => alpha[i] || (v && rounded[i] <= smooth));
  }
  const inside = distance(mask,w,h,0);
  return Uint8Array.from(mask,(v,i) => v ? (inside[i] <= 1 ? 1 : 2) : 0);
}

// Remove a connected background by sampling the selected point. Transparency is preserved.
export function eraseRegion(data,w,h,start,tolerance) {
  const color = data.slice(start*4,start*4+4);
  if (!color[3]) return;
  const queue = new Int32Array(w*h);
  let head=0, tail=0;
  function add(i) {
    const j=i*4;
    if (!data[j+3] || Math.max(Math.abs(data[j]-color[0]),Math.abs(data[j+1]-color[1]),Math.abs(data[j+2]-color[2]))>tolerance) return;
    data[j+3]=0;queue[tail++]=i;
  }
  add(start);
  while (head<tail) {
    const i=queue[head++], x=i%w;
    if(x) add(i-1);
    if(x<w-1) add(i+1);
    if(i>=w) add(i-w);
    if(i+w<w*h) add(i+w);
  }
}

export function layout(sizes, margin, gap, fill, spread) {
  const right=W-margin, bottom=H-margin;
  for (const s of sizes) if (![[s.w,s.h],[s.h,s.w]].some(([w,h])=>w<=right-margin && h<=bottom-margin))
    throw Error('Un diseño supera el área imprimible. Revisá su medida o el margen.');
  if(fill && sizes.length===1){
    const s=sizes[0], available=bottom-margin+gap, width=right-margin;
    const choices=[[s.w,s.h,false],[s.h,s.w,true]].map(([w,h,rotated])=>({
      w,h,rotated,capacity:Math.floor((width+gap)/(w+gap))
    })).filter(v=>v.capacity && v.h<=bottom-margin);
    const scores=new Int32Array(available+1),choice=new Int8Array(available+1).fill(-1);
    for(let height=1;height<=available;height++){
      scores[height]=scores[height-1];
      choices.forEach((v,i)=>{
        const left=height-v.h-gap;
        if(left>=0 && scores[left]+v.capacity>scores[height]){
          scores[height]=scores[left]+v.capacity;choice[height]=i;
        }
      });
    }
    const rows=[];
    for(let h=available;h>0;){
      const i=choice[h];if(i<0){h--;continue;}
      const v=choices[i];rows.push(v);h-=v.h+gap;
    }
    const unused=available-rows.reduce((n,v)=>n+v.h+gap,0);
    const pieces=[];let y=margin;
    rows.forEach((v,i)=>{
      const spare=width-v.capacity*v.w-(v.capacity-1)*gap;
      for(let j=0;j<v.capacity;j++){
        const dx=spread?(v.capacity===1?spare/2:spare*j/(v.capacity-1)):0;
        const dy=spread?(rows.length===1?unused/2:unused*i/(rows.length-1)):0;
        pieces.push({id:0,w:v.w,h:v.h,rotated:v.rotated,x:margin+j*(v.w+gap)+Math.round(dx),y:y+Math.round(dy)});
      }
      y+=v.h+gap;
    });
    return {pages:[pieces],counts:[pieces.length]};
  }
  const order=sizes.map((_,id)=>id);
  function pack(byArea,shortSide){
    const ids=order.slice().sort((a,b)=>priority(sizes[b])-priority(sizes[a]));
    function priority(s){return byArea?s.w*s.h:Math.max(s.w,s.h);}
    const remaining=sizes.map(s=>fill?1:s.qty), counts=sizes.map(()=>0), pages=[];
    let total=remaining.reduce((sum,n)=>sum+n,0);
    while(total){
      const page=[];
      let free=[{x:margin,y:margin,w:right-margin+gap,h:bottom-margin+gap}];
      function place(id){
        const s=sizes[id];let best;
        for(const r of free)for(const rotated of [false,true]){
          const w=rotated?s.h:s.w,h=rotated?s.w:s.h;
          const dw=r.w-w-gap,dh=r.h-h-gap;
          if(dw<0||dh<0)continue;
          const score=shortSide?Math.min(dw,dh):r.y+h;
          const tie=shortSide?r.y+h:Math.min(dw,dh);
          if(!best||score<best.score||(score===best.score&&tie<best.tie))
            best={x:r.x,y:r.y,w,h,rotated,id,score,tie};
        }
        if(!best)return false;
        page.push(best);counts[id]++;
        const x=best.x,y=best.y,endX=x+best.w+gap,endY=y+best.h+gap;
        const next=[];
        for(const r of free){
          const rx=r.x+r.w,ry=r.y+r.h;
          if(x>=rx||y>=ry||endX<=r.x||endY<=r.y){next.push(r);continue;}
          if(x>r.x)next.push({...r,w:x-r.x});
          if(y>r.y)next.push({...r,h:y-r.y});
          if(endX<rx)next.push({...r,x:endX,w:rx-endX});
          if(endY<ry)next.push({...r,y:endY,h:ry-endY});
        }
        free=next.filter((a,i)=>!next.some((b,j)=>j!==i&&a.x>=b.x&&a.y>=b.y&&
          a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h&&(a.w*a.h<b.w*b.h||j<i)));
        return true;
      }
      for(const id of ids)while(remaining[id]&&place(id)){remaining[id]--;total--;}
      if(fill&&!total){
        let added;
        do{
          added=false;
          for(const id of ids.slice().sort((a,b)=>counts[a]-counts[b]))if(place(id))added=true;
        }while(added);
      }
      pages.push(page);
    }
    const last=pages.at(-1);
    return {pages,counts,ink:last.reduce((sum,p)=>sum+p.w*p.h,0),
      depth:Math.max(...last.map(p=>p.y+p.h))};
  }
  const options=[pack(true,true),pack(true,false),pack(false,true),pack(false,false)];
  options.sort((a,b)=>a.pages.length-b.pages.length||(fill?b.ink-a.ink:0)||a.depth-b.depth);
  const result=options[0];
  if(spread)for(const page of result.pages){
    for(const [axis,dim,limit] of [['x','w',right],['y','h',bottom]]){
      const max=Math.max(...page.map(p=>p[axis]));
      const extra=limit-Math.max(...page.map(p=>p[axis]+p[dim]));
      for(const p of page)p[axis]+=Math.round(max===margin?extra/2:extra*(p[axis]-margin)/(max-margin));
    }
  }
  return result;
}

// Insert physical resolution metadata into a browser-generated PNG.
export async function printPNG(canvas) {
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob) throw Error('No se pudo generar el PNG.');
  const bytes=new Uint8Array(await blob.arrayBuffer()), chunk=new Uint8Array(21);
  const view=new DataView(chunk.buffer);view.setUint32(0,9);chunk.set([112,72,89,115],4);
  view.setUint32(8,11811);view.setUint32(12,11811);chunk[16]=1;
  let crc=0xffffffff;
  for(const b of chunk.slice(4,17)){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  view.setUint32(17,(crc^0xffffffff)>>>0);
  const blocks=[bytes.slice(0,33),chunk], source=new DataView(bytes.buffer);
  for(let pos=33;pos<bytes.length;){
    const end=pos+12+source.getUint32(pos);
    if(String.fromCharCode(...bytes.slice(pos+4,pos+8))!=='pHYs') blocks.push(bytes.subarray(pos,end));
    pos=end;
  }
  return new Blob(blocks,{type:'image/png'});
}

// Horizontal strips enclose every visible pixel, including the printed outline.
export function silhouette(data,w,h){
  const strips=[];
  for(let y=0;y<h;y+=12){
    const bottom=Math.min(y+12,h);let left=w,right=0;
    for(let row=y;row<bottom;row++)for(let x=0;x<w;x++){
      if(data[(row*w+x)*4+3]){
        if(x<left)left=x;
        if(x+1>right)right=x+1;
      }
    }
    if(right>left)strips.push([left,y,right,bottom]);
  }
  return strips;
}

const column=16;
function profile(strips,angle){
  const radians=angle*Math.PI/180, cs=Math.cos(radians),sn=Math.sin(radians);
  const polys=strips.map(([l,t,r,b])=>[[l,t],[r,t],[r,b],[l,b]].map(([x,y])=>[x*cs-y*sn,x*sn+y*cs]));
  let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;
  for(const poly of polys)for(const [x,y] of poly){
    xmin=Math.min(x,xmin);ymin=Math.min(y,ymin);xmax=Math.max(x,xmax);ymax=Math.max(y,ymax);
  }
  const w=xmax-xmin,h=ymax-ymin,n=Math.max(1,Math.ceil(w/column));
  const top=new Float64Array(n).fill(Infinity),bottom=new Float64Array(n).fill(-Infinity);
  for(const poly of polys)for(let i=0;i<4;i++){
    const [xa,ya]=poly[i],[xb,yb]=poly[(i+1)%4];
    const lo=Math.min(xa,xb)-xmin,hi=Math.max(xa,xb)-xmin;
    for(let j=Math.max(0,Math.floor(lo/column));j<=Math.min(n-1,Math.floor(hi/column));j++){
      const a=Math.max(lo,j*column),b=Math.min(hi,(j+1)*column);
      const v=xb===xa?ya:ya+(yb-ya)*(a+xmin-xa)/(xb-xa);
      const u=xb===xa?yb:ya+(yb-ya)*(b+xmin-xa)/(xb-xa);
      top[j]=Math.min(top[j],u-ymin,v-ymin);bottom[j]=Math.max(bottom[j],u-ymin,v-ymin);
    }
  }
  return {angle,w,h,top,bottom,offsetX:-xmin,offsetY:-ymin};
}

export function angledLayout(sizes,margin,gap,fill,spread,step){
  const free=step==='free';
  const previous=distributed=>free?angledLayout(sizes,margin,gap,fill,distributed,15):layout(sizes,margin,gap,fill,distributed);
  let baseline;
  try{baseline=previous(false);}catch(error){if(!free)throw error;}
  const regular=()=>baseline&&!spread?baseline:previous(spread);
  if(!step||!sizes.length)return regular();
  const profiles=sizes.map(s=>{
    const strips=s.strips?.length?s.strips:[[0,0,s.w,s.h]];
    const shapes=[];
    for(let a=0;a<360;a+=free?15:step)shapes.push(profile(strips,a));
    return {strips,shapes};
  });
  const width=W-2*margin,height=H-2*margin,columns=Math.ceil(width/column);
  const ids=sizes.map((_,i)=>i).sort((a,b)=>sizes[b].w*sizes[b].h-sizes[a].w*sizes[a].h);
  const remaining=sizes.map(s=>fill?1:s.qty),counts=sizes.map(()=>0),pages=[];
  let total=remaining.reduce((a,b)=>a+b,0);
  while(total){
    const skyline=new Float64Array(columns),page=[];
    function place(id){
      let best=null;
      const {strips,shapes}=profiles[id];
      function consider(shape){
        if(!free && shape.h>height+1e-6)return;
        const last=Math.floor((width-shape.w+1e-6)/column);
        for(let x=0;x<=last;x++){
          let y=0;
          for(let i=0;i<shape.top.length;i++)y=Math.max(y,skyline[x+i]-shape.top[i]);
          const depth=y+shape.h;
          if(!free && depth>height+1e-6)continue;
          if(!best || depth<best.depth-0.5 || (Math.abs(depth-best.depth)<=0.5 && x<best.x))
            best={shape,x,y,depth};
        }
      }
      for(const shape of shapes)consider(shape);
      if(free){
        // Refine the best coarse orientation over progressively narrower intervals.
        // Also probe half steps when none of the coarse candidates fits the width.
        if(!best)for(let deg=7.5;deg<360;deg+=15)consider(profile(strips,deg));
        for(const delta of [5,1,0.25,0.05]){
          if(!best)break;
          const center=best.shape.angle;
          for(const offset of [-2,-1,1,2]){
            const angle=Math.round(((center+offset*delta+360)%360)*100)/100;
            consider(profile(strips,angle));
          }
        }
      }
      if(!best||best.depth>height+1e-6)return false;
      const {shape,x,y}=best;
      page.push({id,x:margin+x*column,y:margin+y,w:shape.w,h:shape.h,
        angle:shape.angle,offsetX:shape.offsetX,offsetY:shape.offsetY,rotated:shape.angle!==0});
      const pad=Math.ceil(gap/column);
      for(let i=0;i<shape.bottom.length;i++)if(Number.isFinite(shape.bottom[i])){
        const floor=y+shape.bottom[i]+gap;
        for(let j=Math.max(0,x+i-pad);j<=Math.min(columns-1,x+i+pad);j++)skyline[j]=Math.max(skyline[j],floor);
      }
      counts[id]++;return true;
    }
    for(const id of ids)while(remaining[id]&&place(id)){remaining[id]--;total--;}
    if(!page.length)return regular();
    if(fill&&!total){
      let added;
      do{
        added=false;
        for(const id of ids.slice().sort((a,b)=>counts[a]-counts[b]))if(place(id))added=true;
      }while(added);
    }
    pages.push(page);
    if(baseline && pages.length>baseline.pages.length)return regular();
  }
  const copies=a=>a.reduce((n,v)=>n+v,0);
  const depth=p=>Math.max(...p.map(s=>s.y+s.h));
  if(baseline && pages.length===baseline.pages.length){
    if(fill && copies(counts)<copies(baseline.counts))return regular();
    if((!fill||copies(counts)===copies(baseline.counts)) &&
      depth(pages.at(-1))>=depth(baseline.pages.at(-1))-1)return regular();
  }
  if(spread)for(const page of pages){
    // Preserve the insertion order of vertically interlocking silhouettes.
    const slack=H-margin-depth(page);
    const dx=(W-margin-Math.max(...page.map(p=>p.x+p.w)))/2;
    page.forEach((p,i)=>{p.x+=dx;p.y+=page.length===1?slack/2:slack*i/(page.length-1);});
  }
  return {pages,counts};
}
