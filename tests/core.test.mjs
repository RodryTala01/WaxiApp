import test from 'node:test';import assert from 'node:assert/strict';import * as c from '../core.js';
const cfg=c.configuracionInicial();const pedido=()=>({cliente:'c',creado:'2026-10-06T12:00:00Z',items:[{id:'a',nombre:'Stickers',cantidad:2,precio:400000,costo:120000,estado:'estado-1'}],descuento:100000,pagos:[],entrega:'2026-10-07'});
test('total, cobros parciales y costo conservan centavos',()=>{const p=pedido();assert.equal(c.total(p),700000);assert.equal(c.costo(p),240000);p.pagos.push({monto:100000});assert.equal(c.estadoPago(p),'Cobro parcial');assert.equal(c.saldo(p),600000);p.pagos.push({monto:600000});assert.equal(c.estadoPago(p),'Cobrado');assert.equal(c.saldo(p),0);});
test('estado general corresponde al producto menos avanzado',()=>{const p=pedido();p.items.push({...p.items[0],id:'b',estado:'estado-4'});assert.equal(c.estadoGeneral(p,cfg),'Pedido confirmado');p.items[0].estado='estado-6';assert.equal(c.entregado(p,cfg),false);p.items[1].estado='estado-6';assert.equal(c.entregado(p,cfg),true);});
test('estadísticas separan ventas y cobros y excluyen anulados y posibles',()=>{const p=pedido();p.pagos=[{monto:300000,fecha:'2026-11-03'}];const anul={...pedido(),anulado:true};const posible=pedido();posible.items[0].estado='estado-0';const presupuesto={...pedido(),presupuesto:true};const s=c.estadisticas([p,anul,posible,presupuesto],cfg,'2026-10');assert.equal(s.vendido,700000);assert.equal(s.ingresos,0);assert.equal(s.ganancia,460000);assert.equal(s.cantidad,1);assert.equal(s.pendiente,400000);assert.equal(c.estadisticas([p],cfg,'2026-11').ingresos,300000);});
test('mes y fecha se calculan en Argentina',()=>{assert.equal(c.fechaHoy(new Date('2026-11-01T01:00:00Z')),'2026-10-31');const p=pedido();p.creado='2026-11-01T01:00:00Z';assert.equal(c.estadisticas([p],cfg,'2026-10').cantidad,1);});
test('fechas próximas y atrasadas',()=>{assert.equal(c.urgencia({entrega:'2026-10-05'},'2026-10-06'),'atrasado');assert.equal(c.urgencia({entrega:'2026-10-07'},'2026-10-06'),'mañana');assert.equal(c.sumarDias('2026-12-31',1),'2027-01-01');assert.equal(c.inicioSemana('2026-10-04'),'2026-09-28');});
test('valida cantidades, descuento e importes',()=>{assert.throws(()=>c.centavos('-1'));assert.throws(()=>c.centavos('NaN'));assert.equal(c.centavos('12.34'),1234);const p=pedido();p.items[0].cantidad=0;assert.throws(()=>c.validarPedido(p));p.items[0].cantidad=2;p.descuento=9999999;assert.throws(()=>c.validarPedido(p));});
test('WhatsApp normaliza Argentina y respeta código explícito internacional',()=>{assert.equal(c.whatsapp('11 1234 5678'),'https://wa.me/5491112345678');assert.equal(c.whatsapp('+34 612 345 678'),'https://wa.me/34612345678');assert.equal(c.whatsapp('011 15 1234 5678'),'https://wa.me/5491112345678');});

test('detecta un cliente repetido aunque el WhatsApp cambie de formato y permite editar el propio',()=>{
 const clientes=[{id:'a',whatsapp:'11 1234 5678'},{id:'b',whatsapp:'+34 612 345 678'}];
 for(const numero of ['+54 9 11 1234-5678','0054 11 1234 5678','011 15 1234 5678'])assert.deepEqual(c.clientesDuplicados(clientes,numero).map(x=>x.id),['a']);
 assert.deepEqual(c.clientesDuplicados(clientes,'11 1234 5678','a'),[]);assert.deepEqual(c.clientesDuplicados(clientes,'').map(x=>x.id),[]);
 assert.deepEqual(c.clientesDuplicados(clientes,'+34 612345678').map(x=>x.id),['b']);assert.deepEqual(c.clientesDuplicados(clientes,'11 9999 9999'),[]);
});
test('estadísticas de productos incluyen ceros e históricos, conservan el descuento y no duplican pedidos',()=>{
 const p=pedido();p.items=[{producto:'a',nombre:'Anterior',unidad:'unidad',cantidad:2,precio:101,costo:50,estado:'estado-1'},{producto:'b',nombre:'Plancha',unidad:'plancha',cantidad:1,precio:101,costo:20,estado:'estado-1'},{producto:'a',nombre:'Anterior',unidad:'unidad',cantidad:1,precio:101,costo:50,estado:'estado-1'}];p.descuento=7;
 const fuera={...structuredClone(p),confirmadoEn:'2026-11-02T12:00:00Z'};const anul={...structuredClone(p),anulado:true};const presupuesto={...structuredClone(p),presupuesto:true};const posible=structuredClone(p);posible.items[0].estado='estado-0';
 const catalogo=[{id:'a',nombre:'Nombre actual',unidad:'unidad',activo:true},{id:'c',nombre:'Sin ventas',unidad:'plancha',activo:false}];
 const filas=c.estadisticasProductos([p,fuera,anul,presupuesto,posible],cfg,'2026-10',catalogo);assert.equal(filas.length,3);assert.equal(filas.reduce((s,f)=>s+f.facturacion,0),397);
 const a=filas.find(f=>f.id==='a');assert.equal(a.nombre,'Nombre actual');assert.equal(a.cantidad,3);assert.equal(a.pedidos,1);assert.equal(filas.find(f=>f.id==='b').cantidad,1);assert.equal(filas.find(f=>f.id==='c').facturacion,0);
 assert.equal(c.estadisticasProductos([],cfg,'2026-10',catalogo).length,2);
 p.descuento=404;assert.equal(c.estadisticasProductos([p],cfg,'2026-10',catalogo).reduce((s,f)=>s+f.facturacion,0),0);
});
test('carga diaria mantiene separadas las unidades y las planchas',()=>{
 const p=pedido();p.items.push({cantidad:7,unidad:'plancha'});assert.deepEqual(c.cargaEntregas([p]),{pedidos:1,unidades:2,planchas:7});assert.deepEqual(c.cargaEntregas([]),{pedidos:0,unidades:0,planchas:0});
});

test('totales históricos y fechas inclusivas separan confirmaciones de pagos entre meses',()=>{
 const octubre=pedido();octubre.confirmadoEn='2026-10-31T23:00:00Z';octubre.canal='WhatsApp';octubre.items[0].producto='a';octubre.pagos=[{monto:100000,fecha:'2026-10-31'},{monto:300000,fecha:'2026-11-01'}];
 const noviembre=pedido();noviembre.confirmadoEn='2026-11-02T12:00:00Z';noviembre.canal='WhatsApp';noviembre.descuento=0;noviembre.items[0].producto='a';noviembre.pagos=[{monto:200000,fecha:'2026-11-15'}];
 const anul={...structuredClone(octubre),anulado:true},presupuesto={...structuredClone(octubre),presupuesto:true},posible=structuredClone(octubre);posible.items[0].estado='estado-0';
 const ps=[octubre,noviembre,anul,presupuesto,posible],catalogo=[{id:'a',nombre:'Stickers',unidad:'unidad',activo:true},{id:'b',nombre:'Sin ventas',unidad:'plancha',activo:true}];
 const historico=c.estadisticas(ps,cfg);assert.equal(historico.vendido,1500000);assert.equal(historico.ingresos,600000);assert.equal(historico.pendiente,900000);assert.equal(historico.descuentos,100000);assert.equal(historico.cantidad,2);assert.equal(historico.canales[0].total,1500000);
 const filas=c.estadisticasProductos(ps,cfg,{},catalogo);assert.equal(filas[0].cantidad,4);assert.equal(filas[0].pedidos,2);assert.equal(filas[0].facturacion,historico.vendido);assert.equal(filas[1].cantidad,0);
 const dia=c.estadisticas(ps,cfg,{desde:'2026-10-31',hasta:'2026-10-31'});assert.equal(dia.vendido,700000);assert.equal(dia.ingresos,100000);assert.equal(dia.pendiente,300000);assert.equal(c.estadisticasProductos(ps,cfg,{desde:'2026-10-31',hasta:'2026-10-31'},catalogo)[0].cantidad,2);
 const diaPago=c.estadisticas(ps,cfg,{desde:'2026-11-01',hasta:'2026-11-01'});assert.equal(diaPago.vendido,0);assert.equal(diaPago.ingresos,300000);assert.equal(diaPago.pendiente,0);
 const mes=c.estadisticas(ps,cfg,'2026-11');assert.equal(mes.vendido,800000);assert.equal(mes.ingresos,500000);assert.equal(mes.pendiente,600000);assert.equal(mes.descuentos,0);
 assert.equal(c.estadisticas(ps,cfg,{desde:'2026-11-01'}).vendido,800000);assert.equal(c.estadisticas(ps,cfg,{hasta:'2026-10-31'}).vendido,700000);
 const ambos=c.estadisticas(ps,cfg,{desde:'2026-10-31',hasta:'2026-11-02'});assert.equal(ambos.vendido,historico.vendido);assert.equal(ambos.ingresos,400000);
});
test('valida rangos y calcula meses completos incluidos los años bisiestos',()=>{
 assert.deepEqual(c.limitesEstadisticas('2024-02'),{desde:'2024-02-01',hasta:'2024-02-29'});assert.deepEqual(c.limitesEstadisticas('2026-12'),{desde:'2026-12-01',hasta:'2026-12-31'});
 assert.throws(()=>c.limitesEstadisticas({desde:'2026-11-05',hasta:'2026-11-03'}),/posterior/);assert.throws(()=>c.limitesEstadisticas({desde:'2026-02-30'}),/fechas/);assert.throws(()=>c.limitesEstadisticas('2026-13'),/mes/);
});
