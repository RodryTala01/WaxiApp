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
