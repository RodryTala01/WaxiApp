const normalizar=texto=>String(texto||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const controles=new WeakMap();
let iniciado=false,abierto=null,secuencia=0;

export function iniciarSelectoresBuscables(){
 if(iniciado)return;iniciado=true;
 document.querySelectorAll('select').forEach(mejorar);
 document.addEventListener('pointerdown',e=>{if(abierto&&!abierto.contenedor.contains(e.target))abierto.cerrar();});
 document.addEventListener('focusin',e=>{if(abierto&&!abierto.contenedor.contains(e.target))abierto.cerrar();});
 new MutationObserver(cambios=>{
  if(abierto&&!abierto.contenedor.isConnected)abierto.cerrar();
  for(const cambio of cambios){
   if(cambio.type==='attributes'){controles.get(cambio.target)?.actualizar();continue;}
   const select=cambio.target.closest?.('select');if(select)controles.get(select)?.actualizar();
   for(const nodo of cambio.addedNodes){if(nodo.nodeType!==1||!nodo.isConnected)continue;if(nodo.matches('select'))mejorar(nodo);nodo.querySelectorAll('select').forEach(mejorar);}
  }
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
}

function mejorar(select){
 if(controles.has(select)||!select.isConnected||select.multiple)return;
 const numero=++secuencia,obligatorio=select.required;
 if(!select.id)select.id='selector-'+numero;
 const id=select.id+'-busqueda';
 const etiquetas=[...select.labels],nombre=select.getAttribute('aria-label')||etiquetas.map(e=>e.textContent.trim()).join(' ')||'Opciones';
 const contenedor=document.createElement('div'),input=document.createElement('input'),boton=document.createElement('button'),lista=document.createElement('div');
 contenedor.className='selector-buscable';if(select.style.maxWidth)contenedor.style.maxWidth=select.style.maxWidth;
 input.type='text';input.id=id;input.className='selector-busqueda control';input.autocomplete='off';input.spellcheck=false;input.required=obligatorio;
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',id+'-lista');input.setAttribute('aria-haspopup','listbox');
 if(select.hasAttribute('aria-label')||!etiquetas.length)input.setAttribute('aria-label',nombre);
 if(select.hasAttribute('aria-describedby'))input.setAttribute('aria-describedby',select.getAttribute('aria-describedby'));
 boton.type='button';boton.className='selector-flecha';boton.tabIndex=-1;boton.textContent='⌄';boton.setAttribute('aria-label','Mostrar opciones de '+nombre);
 lista.id=id+'-lista';lista.className='selector-lista';lista.setAttribute('role','listbox');lista.setAttribute('aria-label',nombre);lista.hidden=true;
 select.before(contenedor);contenedor.append(select,input,boton,lista);etiquetas.forEach(e=>e.htmlFor=id);
 // El select conserva su nombre y valor para FormData y los eventos existentes.
 select.classList.add('selector-nativo');select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.required=false;
 let opciones=[],activo=-1,editando=false;
 const control={contenedor,cerrar,actualizar};controles.set(select,control);

 function actualizar(){
  const seleccion=select.selectedOptions[0];
  input.value=seleccion&&(!obligatorio||seleccion.value)?seleccion.textContent.trim():'';
  input.placeholder=seleccion&&!seleccion.value&&obligatorio?seleccion.textContent.trim():'Escribí para buscar…';
  input.disabled=select.disabled;boton.disabled=select.disabled;editando=false;input.setCustomValidity('');
  if(select.disabled&&abierto===control)cerrar();
 }
 function cerrar(){lista.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(abierto===control)abierto=null;actualizar();}
 function marcar(indice){
  activo=indice;
  const elementos=[...lista.querySelectorAll('[role="option"]')];
  elementos.forEach((el,i)=>el.classList.toggle('selector-resaltado',i===activo));
  if(elementos[activo]){input.setAttribute('aria-activedescendant',elementos[activo].id);elementos[activo].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');
 }
 function mostrar(consulta=''){
  if(select.disabled)return;
  if(abierto&&abierto!==control)abierto.cerrar();abierto=control;lista.hidden=false;input.setAttribute('aria-expanded','true');
  const q=normalizar(consulta),palabras=q.split(/\s+/).filter(Boolean),soloNumero=/^[\d+\s().-]+$/.test(q)&&/\d/.test(q);
  const coincidencias=[...select.options].filter(o=>!o.disabled&&!o.closest('optgroup[disabled]')&&(!obligatorio||o.value)&&(!q||(soloNumero?String(o.dataset.busqueda||'').replace(/\D/g,'').includes(q.replace(/\D/g,'')):palabras.every(p=>normalizar(o.textContent+' '+(o.dataset.busqueda||'')).includes(p)))));
  opciones=coincidencias.slice(0,100);lista.replaceChildren();
  for(const [indice,opcion] of opciones.entries()){
   const fila=document.createElement('div'),titulo=document.createElement('span');fila.id=id+'-opcion-'+indice;fila.className='selector-opcion';fila.setAttribute('role','option');fila.setAttribute('aria-selected',String(opcion.value===select.value));titulo.textContent=opcion.textContent.trim();fila.append(titulo);
   if(opcion.dataset.busqueda){const detalle=document.createElement('small');detalle.textContent=opcion.dataset.busqueda;fila.append(detalle);}
   fila.addEventListener('pointerdown',e=>e.preventDefault());fila.addEventListener('click',()=>elegir(indice));lista.append(fila);
  }
  if(!opciones.length||coincidencias.length>opciones.length){const aviso=document.createElement('div');aviso.className='selector-aviso';aviso.setAttribute('role','status');aviso.textContent=!opciones.length?'No hay coincidencias':`${coincidencias.length} opciones. Escribí para acotar la búsqueda.`;lista.append(aviso);}
  activo=q?(opciones.length?0:-1):opciones.findIndex(o=>o.value===select.value);marcar(activo);
 }
 function elegir(indice){
  if(!opciones[indice])return;
  select.value=opciones[indice].value;cerrar();
  select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));
  // Algunos formularios reconstruyen las líneas al cambiar de producto.
  queueMicrotask(()=>{const nuevo=document.getElementById(id);if(nuevo&&nuevo!==input){nuevo.dataset.sinAbrir='1';nuevo.focus({preventScroll:true});}});
 }
 input.addEventListener('focus',()=>{if(input.dataset.sinAbrir){delete input.dataset.sinAbrir;return;}mostrar(editando?input.value:'');input.select();});
 input.addEventListener('click',()=>{if(lista.hidden)mostrar(editando?input.value:'');});
 input.addEventListener('input',()=>{editando=true;input.setCustomValidity('Elegí una opción de la lista.');mostrar(input.value);});
 input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(lista.hidden){mostrar(editando?input.value:'');marcar(e.key==='ArrowDown'?0:opciones.length-1);}else if(opciones.length)marcar(Math.max(0,Math.min(opciones.length-1,activo+(e.key==='ArrowDown'?1:-1))));}
  else if(e.key==='Enter'&&!lista.hidden){e.preventDefault();if(activo>=0)elegir(activo);}
  else if(e.key==='Escape'&&!lista.hidden){e.preventDefault();e.stopPropagation();cerrar();}
  else if(e.key==='Tab')cerrar();
 });
 boton.addEventListener('pointerdown',e=>e.preventDefault());boton.addEventListener('click',()=>{if(lista.hidden){input.dataset.sinAbrir='1';input.focus({preventScroll:true});mostrar();input.select();}else cerrar();});
 select.addEventListener('change',()=>{cerrar();});
 actualizar();
}
