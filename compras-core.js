import {limitesEstadisticas,fechaHoy} from './core.js';
export const comprasActivas=compras=>compras.filter(c=>!c.anulada&&!c._oculto);
export const brutoCompra=c=>c.items.reduce((s,i)=>s+i.importe,0);
export const totalCompra=c=>brutoCompra(c)-(c.descuento||0)+(c.gastos||0);
export function validarCompra(c){
 if(!c.proveedor?.trim())throw Error('Completá el proveedor.');if(!c.fecha)throw Error('Elegí la fecha de compra.');limitesEstadisticas({desde:c.fecha,hasta:c.fecha});
 if(!c.items.length)throw Error('Agregá al menos una materia prima.');
 for(const i of c.items){if(!i.materia)throw Error('Elegí la materia prima.');if(!Number.isFinite(i.cantidad)||i.cantidad<=0||i.cantidad>1e9)throw Error('La cantidad debe ser mayor a cero.');if(!Number.isSafeInteger(i.importe)||i.importe<0)throw Error('Revisá los importes de la compra.');}
 for(const n of [c.descuento||0,c.gastos||0])if(!Number.isSafeInteger(n)||n<0)throw Error('Revisá el descuento y los gastos.');
 if((c.descuento||0)>brutoCompra(c))throw Error('El descuento no puede superar el importe de los materiales.');if(!Number.isSafeInteger(totalCompra(c)))throw Error('El importe total es demasiado grande.');
}
export function importesCompra(c){
 const bruto=brutoCompra(c),total=totalCompra(c),cantidad=c.items.reduce((s,i)=>s+i.cantidad,0);
 const partes=c.items.map((i,k)=>{const cuota=total*(bruto?i.importe/bruto:i.cantidad/cantidad);return {k,importe:Math.floor(cuota),resto:cuota-Math.floor(cuota)};});
 let faltan=total-partes.reduce((s,i)=>s+i.importe,0);
 for(const i of [...partes].sort((a,b)=>b.resto-a.resto||a.k-b.k)){if(faltan<=0)break;i.importe++;faltan--;}
 return partes.map(i=>i.importe);
}
export function historialMateria(materia,compras){
 return comprasActivas(compras).filter(c=>c.items.some(i=>i.materia===materia.id)).map(c=>{const importes=importesCompra(c),lineas=c.items.map((i,k)=>({...i,neto:importes[k]})).filter(i=>i.materia===materia.id),cantidad=lineas.reduce((s,i)=>s+i.cantidad,0),importe=lineas.reduce((s,i)=>s+i.neto,0);return {id:c.id,fecha:c.fecha,proveedor:c.proveedor,cantidad,importe,costo:importe/cantidad,creado:c.creado||'',revision:c.actualizadoEn||c.creado||'',firma:JSON.stringify([c.id,c.fecha,c.actualizadoEn||c.creado||'',cantidad,importe])};}).sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.creado.localeCompare(a.creado)||b.id.localeCompare(a.id));
}
export function precioMateria(materia,compras){
 const ultima=historialMateria(materia,compras)[0],ajuste=materia.ajuste;
 if(ajuste&&ajuste.base===(ultima?.firma||''))return {costo:ajuste.costo,origen:'Manual',fecha:fechaHoy(new Date(ajuste.fecha)),compra:ultima?.id};
 if(ultima)return {costo:ultima.costo,origen:'Última compra',fecha:ultima.fecha,compra:ultima.id};
 return {costo:materia.costoBase||0,origen:'Manual',fecha:materia.creado?fechaHoy(new Date(materia.creado)):'',compra:null};
}
export function estadisticasCompras(compras,materias,periodo={}){
 const r=limitesEstadisticas(periodo),seleccion=comprasActivas(compras).filter(c=>(!r.desde||c.fecha>=r.desde)&&(!r.hasta||c.fecha<=r.hasta)).sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.creado||'').localeCompare(b.creado||'')),invertido=seleccion.reduce((s,c)=>s+totalCompra(c),0);
 const proveedores=new Map(),meses=new Map(),categorias=new Map(),unidades=new Map(),filas=new Map(materias.map(m=>[m.id,{id:m.id,nombre:m.nombre,unidad:m.unidad,cantidad:0,importe:0,compras:0,minimo:null,maximo:null,primero:null,ultimo:null,actual:precioMateria(m,compras).costo}]));
 for(const c of seleccion){const total=totalCompra(c),prov=c.proveedor.trim(),mes=c.fecha.slice(0,7);for(const [mapa,key] of [[proveedores,prov],[meses,mes]]){if(!mapa.has(key))mapa.set(key,{nombre:key,importe:0,compras:0});const x=mapa.get(key);x.importe+=total;x.compras++;}
  const importes=importesCompra(c),vistos=new Set();
  c.items.forEach((i,k)=>{const m=materias.find(m=>m.id===i.materia),categoria=m?.categoria||'Sin categoría',unidad=i.unidad||m?.unidad||'unidad';if(!filas.has(i.materia))filas.set(i.materia,{id:i.materia,nombre:i.nombre,unidad,cantidad:0,importe:0,compras:0,minimo:null,maximo:null,primero:null,ultimo:null,actual:0});const fila=filas.get(i.materia),costo=importes[k]/i.cantidad;fila.cantidad+=i.cantidad;fila.importe+=importes[k];fila.minimo=fila.minimo===null?costo:Math.min(fila.minimo,costo);fila.maximo=fila.maximo===null?costo:Math.max(fila.maximo,costo);if(fila.primero===null)fila.primero=costo;fila.ultimo=costo;if(!vistos.has(i.materia)){fila.compras++;vistos.add(i.materia);}categorias.set(categoria,(categorias.get(categoria)||0)+importes[k]);unidades.set(unidad,(unidades.get(unidad)||0)+i.cantidad);});
 }
 const materiales=[...filas.values()].map(f=>({...f,promedio:f.cantidad?f.importe/f.cantidad:0,variacion:f.primero?100*(f.ultimo-f.primero)/f.primero:null})).sort((a,b)=>b.importe-a.importe||a.nombre.localeCompare(b.nombre,'es'));
 return {invertido,cantidad:seleccion.length,promedio:seleccion.length?Math.round(invertido/seleccion.length):0,gastos:seleccion.reduce((s,c)=>s+(c.gastos||0),0),descuentos:seleccion.reduce((s,c)=>s+(c.descuento||0),0),materialesComprados:materiales.filter(m=>m.compras).length,proveedores:[...proveedores.values()].sort((a,b)=>b.importe-a.importe),meses:[...meses.values()].sort((a,b)=>b.nombre.localeCompare(a.nombre)),categorias:[...categorias].map(([nombre,importe])=>({nombre,importe})).sort((a,b)=>b.importe-a.importe),unidades:[...unidades].map(([unidad,cantidad])=>({unidad,cantidad})),materiales,seleccion};
}
