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
  function attempt(preferTall) {
    const counts=sizes.map(()=>0), pages=[];
    let remaining=sizes.reduce((n,s)=>n+s.qty,0);
    do {
      const rows=[];let y=margin;
      while(y<bottom) {
        const row=[];let x=margin,height=0;
        while(x<right) {
          const options=[];
          sizes.forEach((s,id)=>{
            if(!fill && counts[id]>=s.qty) return;
            for(const rotated of [false,true]){
              const w=rotated?s.h:s.w,h=rotated?s.w:s.h;
              if(x+w>right || y+h>bottom || (row.length && h>height)) continue;
              options.push({id,w,h,rotated,x,y});
            }
          });
          options.sort((a,b)=>(fill?counts[a.id]-counts[b.id]:0) ||
            (row.length ? b.h-a.h : preferTall ? b.h-a.h : a.h-b.h) || b.w-a.w);
          if(!options.length) break;
          const piece=options[0];row.push(piece);counts[piece.id]++;remaining--;
          x+=piece.w+gap;height=Math.max(height,piece.h);
        }
        if(!row.length) break;
        if(spread){
          const extra=right-(x-gap);
          row.forEach((p,i)=>p.x+=Math.round(row.length===1?extra/2:extra*i/(row.length-1)));
        }
        rows.push(row);y+=height+gap;
      }
      if(!rows.length) break;
      if(spread){
        const extra=bottom-(y-gap);
        rows.forEach((row,i)=>row.forEach(p=>p.y+=Math.round(rows.length===1?extra/2:extra*i/(rows.length-1))));
      }
      pages.push(rows.flat());
    } while(!fill && remaining>0);
    return {pages,counts};
  }
  const score=r=>fill ? Math.min(...r.counts)*1e10+r.pages.flat().reduce((n,p)=>n+p.w*p.h,0) : -r.pages.length;
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
  const a=attempt(false),b=attempt(true);
  return score(a)>=score(b)?a:b;
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
