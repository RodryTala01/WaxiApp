import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,px,W,H,outline,eraseRegion,printPNG} from '../plancha-core.js';

test('la separación conserva tamaños, copias y márgenes en ambos modos',()=>{
  for(const fill of [true,false]){
    const sizes=[{w:px(50),h:px(30),qty:35},{w:px(40),h:px(18),qty:55}];
    const compact=layout(sizes,px(3),px(3),fill,false);
    const spaced=layout(sizes,px(3),px(3),fill,true);
    assert.deepEqual(compact.counts,spaced.counts);
    if(!fill)assert.deepEqual(compact.counts,[35,55]);
    for(const pieces of spaced.pages)for(const [i,p] of pieces.entries()){
      assert.ok(p.x>=px(3)&&p.y>=px(3)&&p.x+p.w<=W-px(3)&&p.y+p.h<=H-px(3));
      for(const q of pieces.slice(i+1))assert.ok(
        p.x+p.w+px(3)<=q.x || q.x+q.w+px(3)<=p.x ||
        p.y+p.h+px(3)<=q.y || q.y+q.h+px(3)<=p.y);
    }
  }
});
test('un solo diseño llena filas combinando orientaciones',()=>{
  const s={w:px(65),h:px(40),qty:1};
  const {pages,counts}=layout([s],px(3),px(3),true,false);
  assert.ok(counts[0]>=18);
  assert.equal(pages.length,1);
});
test('la máscara mantiene un interior blanco y una línea exterior de un píxel',()=>{
  const alpha=new Uint8Array(225);alpha[112]=1;
  const m=outline(alpha,15,15,4,2);
  assert.equal(m[112],2);assert.equal(m[115],2);assert.equal(m[116],1);assert.equal(m[117],0);
});
test('borrar por color respeta un hueco aislado del mismo color',()=>{
  const d=new Uint8Array(5*4).fill(255);d[2*4]=0;
  eraseRegion(d,5,1,0,0);
  assert.deepEqual([d[3],d[7],d[11],d[15],d[19]],[0,0,255,255,255]);
});
test('el PNG contiene densidad física a 300 ppp', async()=>{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const b=Buffer.from(await (await printPNG({toBlob(cb){cb(new Blob([png]));}})).arrayBuffer());
  assert.equal(b.toString('ascii',37,41),'pHYs');assert.equal(b.readUInt32BE(41),11811);assert.equal(b.readUInt32BE(45),11811);
});

test('45 fotos con orientaciones mixtas entran todas y el giro aprovecha huecos',()=>{
  const sizes=Array.from({length:45},(_,i)=>({w:px(i%2?50:32),h:px(i%2?32:50),qty:1}));
  for(const fill of [true,false]){
    const result=layout(sizes,px(3),px(3),fill,false);
    assert.ok(result.pages.length>1);
    assert.equal(result.counts.filter(n=>n>=1).length,45);
    assert.ok(result.pages.flat().some(p=>p.rotated));
    if(!fill)assert.equal(result.pages.flat().length,45);
  }
});

test('giros intermedios encajan 45 siluetas diagonales, con distancia de corte',async()=>{
  const {angledLayout}=await import('../plancha-core.js');
  const strips=Array.from({length:58},(_,i)=>[i*9,i*10,i*9+65,i*10+10]);
  const sizes=[{w:580,h:580,qty:45,strips}],gap=px(3),margin=px(3);
  const straight=angledLayout(sizes,margin,gap,false,false,0);
  for(const step of [15,'free'])for(const spread of [false,true]){
    const r=angledLayout(sizes,margin,gap,false,spread,step);
    assert.ok(r.pages.length<straight.pages.length);
    assert.equal(r.counts[0],45);
    assert.ok(r.pages.flat().some(p=>p.angle%90!==0));
    for(const page of r.pages){
      const outlines=page.map(p=>{
        const angle=p.angle*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
        return strips.flatMap(([l,t,r,b])=>[[l,t],[r,t],[l,b],[r,b]]).map(([x,y])=>[
          p.x+p.offsetX+x*cos-y*sin,p.y+p.offsetY+x*sin+y*cos
        ]);
      });
      const seen=new Map();
      for(const [id,points] of outlines.entries())for(const [x,y] of points){
        assert.ok(x>=margin-1e-6&&y>=margin-1e-6&&x<=W-margin+1e-6&&y<=H-margin+1e-6);
        const cx=Math.floor(x/gap),cy=Math.floor(y/gap);
        for(let i=cx-1;i<=cx+1;i++)for(let j=cy-1;j<=cy+1;j++)
          for(const [other,a,b] of seen.get(i+','+j)||[])if(other!==id)assert.ok(Math.hypot(a-x,b-y)>=gap-1e-6);
        const key=cx+','+cy;if(!seen.has(key))seen.set(key,[]);seen.get(key).push([id,x,y]);
      }
    }
  }
});

test('el giro libre usa ángulos fraccionarios y conserva las 45 piezas',async()=>{
  const {angledLayout}=await import('../plancha-core.js');
  const sizes=Array.from({length:45},(_,i)=>({w:530,h:580,qty:1,
    strips:Array.from({length:58},(_,j)=>[j*(5+i%4),j*10,j*(5+i%4)+65,j*10+10])}));
  const free=angledLayout(sizes,px(3),px(3),false,false,'free');
  const coarse=angledLayout(sizes,px(3),px(3),false,false,15);
  const depth=r=>Math.max(...r.pages.at(-1).map(p=>p.y+p.h));
  assert.deepEqual(free.counts,Array(45).fill(1));
  assert.equal(free.pages.length,coarse.pages.length);
  assert.ok(depth(free)<depth(coarse));
  assert.ok(free.pages.flat().some(p=>!Number.isInteger(p.angle)));
});
