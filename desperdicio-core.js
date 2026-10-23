import {precioMateria} from './compras-core.js';
import {pesos} from './core.js';

// Cantidades y costo unitario se congelan al registrar la pérdida.
export function crearDesperdicio(entrada,entidades,anterior){
 const descripcion=String(entrada.descripcion||'').trim();
 if(descripcion.length>2000)throw Error('La explicación puede tener hasta 2000 caracteres.');
 let datos;
 if(entrada.clase==='materia'){
  const m=entidades.find(e=>e.tipo==='materia'&&e.id===entrada.materia&&!e._oculto);
  if(!m)throw Error('Elegí una materia prima.');
  const cantidad=Number(entrada.cantidad),costoUnitario=entrada.costoUnitario??precioMateria(m,entidades.filter(e=>e.tipo==='compra'&&!e._oculto)).costo;
  if(!Number.isFinite(cantidad)||cantidad<=0||cantidad>1e9)throw Error('La cantidad perdida debe ser mayor a cero.');
  if(!Number.isFinite(costoUnitario)||costoUnitario<0||costoUnitario>Number.MAX_SAFE_INTEGER)throw Error('Revisá el costo por unidad.');
  const importe=Math.round(cantidad*costoUnitario);
  if(!Number.isSafeInteger(importe))throw Error('El importe perdido es demasiado grande.');
  datos={clase:'materia',materia:m.id,nombre:m.nombre,unidad:m.unidad,cantidad,costoUnitario,importe};
 }else if(entrada.clase==='otro'){
  if(!descripcion)throw Error('Contá qué pasó con esta pérdida.');
  if(!Number.isSafeInteger(entrada.importe)||entrada.importe<=0)throw Error('Ingresá un importe perdido mayor a cero.');
  datos={clase:'otro',nombre:'Otro',importe:entrada.importe};
 }else throw Error('Elegí materia prima u Otro.');
 const ahora=new Date().toISOString();
 return {...datos,id:anterior?.id||crypto.randomUUID(),descripcion,creado:anterior?.creado||ahora,actualizadoEn:ahora,anulado:false};
}
export function aplicarDesperdicio(p,registro){
 if(p.anulado||p.presupuesto)throw Error('Solo se pueden registrar pérdidas en pedidos activos o entregados.');
 const previos=p.desperdicios||[],edicion=previos.some(d=>d.id===registro.id),desperdicios=edicion?previos.map(d=>d.id===registro.id?registro:d):[...previos,registro];
 return {...p,desperdicios,historial:[...(p.historial||[]),{fecha:new Date().toISOString(),texto:`Desperdicio ${edicion?'editado':'registrado'}: ${registro.nombre} · ${pesos(registro.importe)}${registro.descripcion?' · '+registro.descripcion:''}`}]};
}
