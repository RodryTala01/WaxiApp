import test from 'node:test';import assert from 'node:assert/strict';import * as B from '../compras-core.js';import * as C from '../core.js';
const materia={id:'m',tipo:'materia',nombre:'Papel',unidad:'hoja',activo:true,costoBase:0};
const compra=(id,fecha,cantidad,importe,extra={})=>({id,tipo:'compra',fecha,proveedor:'Gráfica',creado:fecha+'T12:00:00Z',actualizadoEn:fecha+'T12:00:00Z',items:[{materia:'m',nombre:'Papel',unidad:'hoja',cantidad,importe}],descuento:0,gastos:0,...extra});
test('las compras reparten gastos y descuentos sin perder centavos, con cantidades fraccionarias',()=>{
 const c=compra('a','2026-10-01',100,500000,{gastos:140000,descuento:70000});c.items.push({materia:'n',nombre:'Laminado',unidad:'metro',cantidad:2,importe:200000});B.validarCompra(c);assert.equal(B.totalCompra(c),770000);assert.deepEqual(B.importesCompra(c),[550000,220000]);
 c.gastos=3;c.descuento=8;const partes=B.importesCompra(c);assert.equal(partes.reduce((s,n)=>s+n,0),B.totalCompra(c));c.items[1].cantidad=1.5;B.validarCompra(c);
 assert.throws(()=>B.validarCompra({...c,descuento:9999999}),/descuento/);c.items[0].cantidad=0;assert.throws(()=>B.validarCompra(c),/cantidad/);
 const gratis=compra('g','2026-10-01',3,0,{gastos:101});assert.deepEqual(B.importesCompra(gratis),[101]);
});
test('costo actual por unidad usa la compra más reciente, ajustes manuales, ediciones y anulaciones',()=>{
 const a=compra('a','2026-10-01',100,500000),b=compra('b','2026-10-13',100,600000),vieja=compra('v','2026-09-30',100,999000,{creado:'2026-10-20T12:00:00Z'});const cs=[a,b,vieja];assert.equal(B.precioMateria(materia,cs).costo,6000);
 const m={...materia,ajuste:{costo:5800,base:B.historialMateria(materia,cs)[0].firma,fecha:'2026-10-13T15:00:00Z'}};assert.equal(B.precioMateria(m,cs).costo,5800);b.notas='Cambio de observaciones sin cambio de importes';b.actualizadoEn='2026-10-13T16:00:00Z';assert.equal(B.precioMateria(m,cs).costo,5800);
 const c=compra('c','2026-10-14',100,700000);cs.push(c);assert.equal(B.precioMateria(m,cs).costo,7000);c.anulada=true;assert.equal(B.precioMateria(m,cs).costo,5800);c.anulada=false;c.items[0].importe=650000;c.actualizadoEn='2026-10-15T12:00:00Z';assert.equal(B.precioMateria(m,cs).costo,6500);c.anulada=true;b.anulada=true;assert.equal(B.precioMateria(m,cs).costo,5000);
 const fraccion=compra('f','2026-11-01',1000,33300);assert.equal(B.precioMateria(materia,[fraccion]).costo,33.3);assert.equal(a.items[0].importe,500000);
});
test('estadísticas de compras respetan fechas, preservan unidades distintas y excluyen anuladas',()=>{
 const a=compra('a','2026-10-01',100,500000,{gastos:140000,descuento:70000});a.items.push({materia:'n',nombre:'Laminado',unidad:'metro',cantidad:2,importe:200000});const b=compra('b','2026-11-02',100,600000),anulada=compra('x','2026-11-02',100,999000,{anulada:true});const ms=[{...materia,categoria:'Papeles'},{id:'n',nombre:'Laminado',unidad:'metro',categoria:'Laminados',activo:true},{id:'z',nombre:'Sin compras',unidad:'unidad',activo:true}];
 const s=B.estadisticasCompras([a,b,anulada],ms);assert.equal(s.invertido,1370000);assert.equal(s.cantidad,2);assert.equal(s.gastos,140000);assert.equal(s.descuentos,70000);assert.equal(s.materialesComprados,2);assert.equal(s.proveedores[0].compras,2);assert.equal(s.categorias.reduce((n,c)=>n+c.importe,0),s.invertido);assert.deepEqual(s.unidades,[{unidad:'hoja',cantidad:200},{unidad:'metro',cantidad:2}]);assert.equal(s.materiales.find(m=>m.id==='z').cantidad,0);
 const mes=B.estadisticasCompras([a,b,anulada],ms,'2026-11');assert.equal(mes.invertido,600000);assert.equal(mes.materiales.find(m=>m.id==='m').cantidad,100);assert.equal(B.estadisticasCompras([a,b],ms,{desde:'2026-10-01',hasta:'2026-10-01'}).cantidad,1);assert.equal(B.estadisticasCompras([a,b],ms,{hasta:'2026-09-30'}).invertido,0);
});
test('Mercado Libre conserva referencias como texto y no confunde teléfono con número de venta',()=>{
 assert.equal(C.esMercadoLibre({canal:'Mercado Libre'}),true);assert.equal(C.esMercadoLibre({canal:'WhatsApp'}),false);const p={cliente:'c',canal:'Mercado Libre',numeroMercadoLibre:'2000000123456789',items:[{cantidad:1,precio:100,costo:0,estado:'estado-1'}]};C.validarPedido(p);assert.equal(p.numeroMercadoLibre,'2000000123456789');assert.throws(()=>C.validarPedido({...p,numeroMercadoLibre:''}),/número/);assert.equal(C.enlaceMercadoLibre(),'https://www.mercadolibre.com.ar/');assert.throws(()=>C.enlaceMercadoLibre('https://mercadolibre.com.ar.evil.test/'),/enlace/);assert.throws(()=>C.enlaceMercadoLibre('javascript:alert(1)'),/enlace/);
});
