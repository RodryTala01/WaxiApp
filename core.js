export const estadosIniciales = ['Posible pedido','Pedido confirmado','Plancha diseñada','Plancha impresa','Cortado','Terminado','Entregado'].map((nombre,i)=>({id:'estado-'+i,nombre}));
export function configuracionInicial(){return {id:'config',estados:estadosIniciales,categorias:['Stickers','Personalizados','Otros productos'],etiquetas:['WhatsApp','Urgente','Mercado Libre'],canales:['WhatsApp','Instagram','Mercado Libre','Web','Conocido','Presencial'],negocio:'Waxi Stickers',contacto:'',notasDocumento:'',diasSinAvance:3};}
export function productosIniciales(){return [['Stickers de catálogo · Normales','Stickers','unidad'],['Stickers de catálogo · Holográficos','Stickers','unidad'],['Stickers de catálogo · Vinilo','Stickers','unidad'],['Plancha personalizada · Normales','Personalizados','plancha'],['Plancha personalizada · Holográficos','Personalizados','plancha'],['Plancha personalizada · Vinilo','Personalizados','plancha'],['Plancha de papel fotográfico sin adhesivo','Otros productos','plancha'],['Imanes publicitarios','Otros productos','unidad'],['Calendarios personalizados','Otros productos','unidad'],['Llaveros','Otros productos','unidad'],['Encendedores','Otros productos','unidad']].map(([nombre,categoria,unidad],i)=>({id:'producto-'+i,nombre,categoria,unidad,precio:0,costo:0,activo:true}));}
export const pesos = centavos=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format((centavos||0)/100);
export function centavos(valor){const n=Number(valor);if(!Number.isFinite(n)||n<0)throw Error('Ingresá un importe válido, mayor o igual a cero.');return Math.round(n*100);}
export const totalBruto = p=>p.items.reduce((s,i)=>s+i.cantidad*i.precio,0);
export const total = p=>Math.max(0,totalBruto(p)-(p.descuento||0));
export const costo = p=>p.items.reduce((s,i)=>s+i.cantidad*i.costo,0);
export const cobrado = p=>(p.pagos||[]).reduce((s,i)=>s+i.monto,0);
export const saldo = p=>Math.max(0,total(p)-cobrado(p));
export function estadoPago(p){return cobrado(p)>=total(p)&&cobrado(p)>0?'Cobrado':cobrado(p)>0?'Cobro parcial':'Sin cobrar';}
export function indiceEstado(p,c){return p.items.length?Math.min(...p.items.map(i=>Math.max(0,c.estados.findIndex(e=>e.id===i.estado)))):0;}
export const estadoGeneral = (p,c)=>c.estados[indiceEstado(p,c)]?.nombre||'Sin productos';
export const entregado = (p,c)=>p.items.length>0&&p.items.every(i=>i.estado===c.estados.at(-1).id);
export const confirmado = (p,c)=>!p.anulado&&!p.presupuesto&&indiceEstado(p,c)>0;
export function fechaHoy(fecha=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(fecha);}
export function sumarDias(fecha,n){const d=new Date(fecha+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function urgencia(p,hoy=fechaHoy()){if(!p.entrega)return 'sin-fecha';if(p.entrega<hoy)return 'atrasado';if(p.entrega===hoy)return 'hoy';if(p.entrega===sumarDias(hoy,1))return 'mañana';return 'normal';}
export function inicioSemana(hoy=fechaHoy()){const day=new Date(hoy+'T12:00:00Z').getUTCDay();return sumarDias(hoy,-((day+6)%7));}
export function limitesEstadisticas(periodo={}){
 if(typeof periodo==='string'){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo))throw Error('Elegí un mes válido.');
  const ultimo=new Date(periodo+'-01T12:00:00Z');ultimo.setUTCMonth(ultimo.getUTCMonth()+1);ultimo.setUTCDate(0);
  return {desde:periodo+'-01',hasta:ultimo.toISOString().slice(0,10)};
 }
 const {desde='',hasta=''}=periodo;
 for(const fecha of [desde,hasta])if(fecha){const d=new Date(fecha+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==fecha)throw Error('Revisá las fechas del filtro.');}
 if(desde&&hasta&&desde>hasta)throw Error('La fecha Desde no puede ser posterior a Hasta.');
 return {desde,hasta};
}
const dentroDelPeriodo = (fecha,rango)=>(!rango.desde||fecha>=rango.desde)&&(!rango.hasta||fecha<=rango.hasta);
const fechaVenta = p=>fechaHoy(new Date(p.confirmadoEn||p.creado));
export function estadisticas(pedidos,config,periodo={}){
 const rango=limitesEstadisticas(periodo),activos=pedidos.filter(p=>confirmado(p,config)),ventas=activos.filter(p=>dentroDelPeriodo(fechaVenta(p),rango));
 let ingresos=0;for(const p of activos)for(const pago of p.pagos||[])if(dentroDelPeriodo(pago.fecha.slice(0,10),rango))ingresos+=pago.monto;
 const vendido=ventas.reduce((s,p)=>s+total(p),0);
 return {vendido,ingresos,costos:ventas.reduce((s,p)=>s+costo(p),0),ganancia:ventas.reduce((s,p)=>s+total(p)-costo(p),0),descuentos:ventas.reduce((s,p)=>s+(p.descuento||0),0),cantidad:ventas.length,ticket:ventas.length?Math.round(vendido/ventas.length):0,pendiente:ventas.reduce((s,p)=>s+saldo(p),0),canales:config.canales.map(canal=>({canal,total:ventas.filter(p=>p.canal===canal).reduce((s,p)=>s+total(p),0)})).filter(x=>x.total)};
}
export function whatsapp(telefono){let n=telefono.replace(/\D/g,'');if(n.startsWith('00'))n=n.slice(2);if(telefono.trim().startsWith('+')||telefono.trim().startsWith('00')||n.startsWith('54'))return 'https://wa.me/'+n;n=n.replace(/^0/,'');if(n.length===12&&n.slice(2,4)==='15')n=n.slice(0,2)+n.slice(4);return 'https://wa.me/549'+n;}
export const claveWhatsapp = telefono=>telefono?.trim()?whatsapp(telefono).slice('https://wa.me/'.length).replace(/^549(?=\d{10}$)/,'54'):'';
export function clientesDuplicados(clientes,telefono,id){const clave=claveWhatsapp(telefono);return clave?clientes.filter(c=>c.id!==id&&claveWhatsapp(c.whatsapp)===clave):[];}
export function coincideBusqueda(texto,consulta){const limpiar=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const t=limpiar(texto);return limpiar(consulta).trim().split(/\s+/).every(p=>t.includes(p));}
export const mapa = direccion=>direccion?.trim()?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(direccion.trim()):'';
export function cargaEntregas(pedidos){const r={pedidos:pedidos.length,unidades:0,planchas:0};for(const p of pedidos)for(const i of p.items)r[i.unidad==='plancha'?'planchas':'unidades']+=i.cantidad;return r;}
export function estadisticasProductos(pedidos,config,periodo,catalogo){
 const rango=limitesEstadisticas(periodo);
 const filas=new Map(catalogo.map(p=>[p.id,{id:p.id,nombre:p.nombre,unidad:p.unidad,activo:p.activo,cantidad:0,pedidos:0,facturacion:0}]));
 for(const p of pedidos.filter(p=>confirmado(p,config)&&dentroDelPeriodo(fechaVenta(p),rango))){
  const bruto=totalBruto(p),neto=total(p);
  // Reparte el descuento proporcionalmente y conserva cada centavo del total.
  const partes=p.items.map((i,k)=>{const cuota=bruto?neto*(i.cantidad*i.precio/bruto):0;return {k,importe:Math.floor(cuota),resto:cuota-Math.floor(cuota)};});
  let faltan=neto-partes.reduce((s,i)=>s+i.importe,0);
  for(const parte of [...partes].sort((a,b)=>b.resto-a.resto||a.k-b.k)){if(faltan<=0)break;parte.importe++;faltan--;}
  const vistos=new Set();
  p.items.forEach((i,k)=>{const id=i.producto||i.nombre;if(!filas.has(id))filas.set(id,{id,nombre:i.nombre,unidad:i.unidad,activo:false,cantidad:0,pedidos:0,facturacion:0});const fila=filas.get(id);fila.cantidad+=i.cantidad;fila.facturacion+=partes[k].importe;if(!vistos.has(id)){fila.pedidos++;vistos.add(id);}});
 }
 return [...filas.values()].sort((a,b)=>b.cantidad-a.cantidad||a.nombre.localeCompare(b.nombre,'es'));
}
export function validarPedido(p){if(!p.cliente)throw Error('Elegí un cliente.');if(!p.items.length)throw Error('Agregá al menos un producto.');for(const i of p.items){if(!Number.isInteger(i.cantidad)||i.cantidad<1)throw Error('La cantidad debe ser un número entero mayor a cero.');if(!Number.isSafeInteger(i.precio)||i.precio<0||!Number.isSafeInteger(i.costo)||i.costo<0)throw Error('Revisá precios y costos.');}if((p.descuento||0)>totalBruto(p))throw Error('El descuento no puede superar el total.');if(p.entrega&&!/^\d{4}-\d{2}-\d{2}$/.test(p.entrega))throw Error('Revisá la fecha de entrega.');}
