import * as C from './core.js';
import * as B from './compras-core.js';

// Los costos se calculan para el catálogo y las líneas nuevas, nunca para reescribir ventas.
export function costoProducto(producto,entidades){
 if(producto.modoCosto!=='receta')return producto.costo||0;
 if(!producto.receta?.length)throw Error('Agregá al menos una materia prima a la receta.');
 const compras=entidades.filter(e=>e.tipo==='compra'&&!e._oculto);
 const total=producto.receta.reduce((s,i)=>{
  const materia=entidades.find(e=>e.id===i.materia&&e.tipo==='materia'&&!e._oculto);
  if(!materia)throw Error('Falta una materia prima de la receta de '+producto.nombre+'.');
  if(!Number.isFinite(i.cantidad)||i.cantidad<=0)throw Error('Revisá las cantidades de la receta.');
  return s+i.cantidad*B.precioMateria(materia,compras).costo;
 },0);
 if(!Number.isSafeInteger(Math.round(total))||total<0)throw Error('El costo de la receta es demasiado grande.');
 return Math.round(total);
}
export function duplicarPedido(p,catalogo,entidades,config){
 return {cliente:p.cliente,entrega:'',formaEntrega:p.formaEntrega,direccion:p.direccion||'',canal:p.canal,usuarioMercadoLibre:p.usuarioMercadoLibre||'',numeroMercadoLibre:'',enlaceMercadoLibre:'',etiquetas:[...(p.etiquetas||[])],notas:p.notas||'',descuento:p.descuento||0,presupuesto:!!p.presupuesto,pagos:[],items:p.items.map(i=>{
  const producto=catalogo.find(x=>x.id===i.producto);
  return {id:crypto.randomUUID(),producto:i.producto,nombre:producto?.nombre||i.nombre,unidad:producto?.unidad||i.unidad,cantidad:i.cantidad,precio:producto?.precio??i.precio,costo:producto?costoProducto(producto,entidades):i.costo,estado:config.estados[0].id};
 })};
}
export function duplicarCompra(c){return {fecha:C.fechaHoy(),proveedor:c.proveedor,referencia:'',items:c.items.map(i=>({id:crypto.randomUUID(),materia:i.materia,nombre:i.nombre,unidad:i.unidad,cantidad:i.cantidad,importe:i.importe})),descuento:c.descuento||0,gastos:c.gastos||0,notas:c.notas||''};}
export const tareaPendiente=t=>t.tipo==='tarea'&&!t._oculto&&!t.archivada&&t.estado!=='hecha';
export function tareasRecordatorio(entidades,hoy=C.fechaHoy()){return entidades.filter(t=>tareaPendiente(t)&&t.recordar!==false&&t.fecha&&t.fecha<=C.sumarDias(hoy,1)).sort(ordenTareas);}
const prioridades={alta:0,normal:1,baja:2};
export function ordenTareas(a,b){return (a.fecha||'9999').localeCompare(b.fecha||'9999')||(prioridades[a.prioridad]??1)-(prioridades[b.prioridad]??1)||(a.creado||'').localeCompare(b.creado||'');}
export function validarTarea(t){if(!t.nombre?.trim())throw Error('Escribí qué tenés que hacer.');if(!['pendiente','en-curso','hecha'].includes(t.estado)||!Object.hasOwn(prioridades,t.prioridad))throw Error('Revisá el estado y la prioridad.');if(t.fecha)C.limitesEstadisticas({desde:t.fecha});}

export function evolucionMensual(pedidos,compras,config,periodo={}){
 const rango=C.limitesEstadisticas(periodo),dentro=f=>(!rango.desde||f>=rango.desde)&&(!rango.hasta||f<=rango.hasta),meses=new Map();
 const sumar=(fecha,campo,importe)=>{if(!fecha||!dentro(fecha))return;const mes=fecha.slice(0,7);if(!meses.has(mes))meses.set(mes,{mes,ventas:0,cobros:0,compras:0});meses.get(mes)[campo]+=importe;};
 for(const p of pedidos.filter(p=>!p._oculto&&C.confirmado(p,config))){sumar(C.fechaHoy(new Date(p.confirmadoEn||p.creado)),'ventas',C.total(p));for(const pago of p.pagos||[])sumar(pago.fecha.slice(0,10),'cobros',pago.monto);}
 for(const c of B.comprasActivas(compras))sumar(c.fecha,'compras',B.totalCompra(c));
 if(!meses.size&&(!rango.desde||!rango.hasta))return [];
 const claves=[...meses.keys()].sort(),inicio=(rango.desde?.slice(0,7)||claves[0]),fin=(rango.hasta?.slice(0,7)||claves.at(-1));
 const filas=[];let mes=inicio;
 while(mes&&mes<=fin){filas.push(meses.get(mes)||{mes,ventas:0,cobros:0,compras:0});const d=new Date(mes+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);mes=d.toISOString().slice(0,7);}
 return filas;
}
export function compararPeriodos(pedidos,compras,config,a,b){
 const medidas=periodo=>{const s=C.estadisticas(pedidos,config,periodo);const comprasTotal=B.comprasActivas(compras).filter(c=>{const r=C.limitesEstadisticas(periodo);return (!r.desde||c.fecha>=r.desde)&&(!r.hasta||c.fecha<=r.hasta);}).reduce((sum,c)=>sum+B.totalCompra(c),0);return {ventas:s.vendido,cobros:s.ingresos,ganancia:s.ganancia,pedidos:s.cantidad,ticket:s.ticket,compras:comprasTotal};};
 const anterior=medidas(a),actual=medidas(b);
 return Object.keys(anterior).map(id=>({id,a:anterior[id],b:actual[id],diferencia:actual[id]-anterior[id],porcentaje:anterior[id]?(actual[id]-anterior[id])/Math.abs(anterior[id])*100:actual[id]?null:0}));
}
