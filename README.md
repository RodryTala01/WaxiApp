# WaxiApp

Organizador de pedidos privado de Waxi Stickers, pensado para trabajar principalmente desde PC. Interfaz clara, blanco y gris, acentos rojos y banner original. Sin cuentas de usuario, roles ni pantalla de login.

## Estado de esta entrega

La aplicación funciona con guardado local y sin conexión después de abrirla por primera vez. **Publicación, sincronización entre dispositivos y notificaciones con la app cerrada requieren activar el servicio de Cloudflare.** No se presenta el almacenamiento del navegador como sincronización.

- Pedidos con varios productos; cada producto tiene su estado. La vista general muestra el de menor avance.
- Los modales se descartan desde la X: tocar afuera o presionar Escape no los cierra ni borra lo escrito. Guardar y confirmar mantienen el cierre normal al completar la acción.
- Edición con Editar pedido dentro de la ficha del modal. La lista usa columnas de igual ancho y filas compactas, número y cliente juntos, nombres largos con puntos suspensivos, resúmenes de productos en una línea y fechas en los encabezados de grupo. La edición conserva número, cobros y estados.
- Flujo: Posible pedido → Pedido confirmado → Plancha diseñada → Plancha impresa → Cortado → Terminado → Entregado.
- El inicio muestra todos los pedidos pendientes agrupados por día de entrega, del más cercano al más lejano, con los pedidos sin fecha al final. Hoy incluye atrasados, hoy y mañana, ordenados por entrega. También hay semana, calendario, entregas, entregados y anulados.
- Listas desplegables con búsqueda por texto, sin necesidad de escribir tildes. Los clientes también se encuentran por WhatsApp. Funciona con teclado y celular.
- Clientes reutilizables con nombre, WhatsApp obligatorio, entrega habitual, dirección y notas; ficha e historial.
- Catálogo editable con precio, costo y unidad/plancha. Los pedidos conservan precios y costos históricos.
- Cobros múltiples, fechas y efectivo/transferencia; saldo y estado de cobro. La entrega no queda bloqueada por saldo.
- Etiquetas y canales editables; buscador y filtros de fecha, producto, pago, entrega y canal.
- Estadísticas totales por defecto, con filtros por mes o fechas Desde/Hasta, inclusive. Resumen, canales y productos respetan el período. Ventas por confirmación, cobros por fecha del pago y saldo actual de los pedidos del período. Incluye costos, ganancia estimada, margen, ticket, descuentos y comparación mensual al elegir un mes. No incluye posibles, presupuestos ni anulados.
- Presupuestos independientes que pueden convertirse en pedidos. PDF de presupuesto, comprobante interno y etiqueta 10 × 6 cm. No son facturas fiscales.
- PWA instalable, guardado local, recuperación del último cambio y copias diarias locales de siete días.
- Servicio preparado para sincronizar por versiones, detectar conflictos, numerar pedidos centralmente y enviar recordatorios Web Push todos los días a las 9:00 de Argentina.

Arranca sin clientes, pedidos ni importes inventados. Los once productos iniciales tienen precio y costo en cero para que Rodri cargue los valores reales.

## Acceso privado sin login

El código y la interfaz pueden ser públicos. Los datos de clientes, pedidos y cobros **no se guardan en GitHub**. La API exige una clave aleatoria de al menos 32 caracteres, enviada en el encabezado Authorization. La clave se configura una vez por dispositivo y se conserva en el navegador. Configuración permite generar un enlace privado para conectar el celular. Ese enlace otorga acceso a los datos: no debe compartirse públicamente. La clave nunca va en el código fuente ni en parámetros de consulta.

Sin conexión al servicio, los datos existen solo en este navegador. Borrar los datos del sitio también borra las copias locales. No usar modo incógnito para pedidos reales.

## Publicar con sincronización (recomendado)

La opción más simple es alojar la interfaz y el servicio juntos en Cloudflare Workers y D1 usando el plan gratuito, dentro de sus límites. No necesita dominio propio ni Supabase. La configuración reconoce y crea la base de datos automáticamente; no reutiliza la base de ProdeTAFA.

[Publicar WaxiApp en Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FRodryTala01%2FWaxiApp)

1. Conectar `RodryTala01/WaxiApp` al servicio gratuito de Workers o usar el botón anterior. Elegir el plan gratuito.
2. Compilación: `npm run build`. Publicación: `npm run deploy`. Se aplica la migración inicial de la base antes de publicar.
3. Configurar `ACCESS_KEY` como secreto, con una clave aleatoria de 32 bytes o más. Abrir `generar-claves.html` en la dirección publicada para generar las claves en el navegador sin instalar nada. Como alternativa, usar `node backend/generar-claves.mjs` localmente. No subir esa salida ni pegarla en chats públicos.
4. Abrir la dirección publicada. En Configuración → Sincronización, cargar esa misma dirección y la clave. Es una configuración inicial, no un usuario/contraseña.
5. Desde Configuración, usar Conectar otro dispositivo y abrir el enlace privado en el celular.

Para usar GitHub Pages como interfaz, activar Settings → Pages → Source: GitHub Actions y ejecutar el workflow **Publicar en GitHub Pages**. Pages solo publica la interfaz; la sincronización sigue necesitando el servicio de Cloudflare.

### Avisos aunque la app esté cerrada

Además de la conexión, configurar estos secretos en el Worker usando la salida local del generador:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_JWK`
- `VAPID_SUBJECT`: un contacto real en formato `mailto:tu-email` o URL de contacto.

Luego pulsar Activar notificaciones en cada dispositivo y aceptar el permiso del navegador. El cron de las 12:00 UTC (9:00 de Argentina) incluye atrasados, hoy, mañana y pedidos sin avance por tres días. Los avisos se repiten diariamente mientras siga el pendiente. La recepción depende del navegador, del permiso y del sistema operativo; en iPhone normalmente requiere instalar la PWA. No usa WhatsApp, email ni Telegram.

Se conserva además una copia diaria de datos en D1 durante siete días, disponible para recuperación administrativa. La pantalla de recuperación utiliza las copias locales.

## Desarrollo y verificación

```bash
npm test
npm run build
npm run serve
```

Abrir `http://localhost:5174`. No hay paquetes de ejecución para el frontend ni servicios de pago. Las pruebas automáticas cubren cálculos, estados, fechas, acceso privado, cifrado Web Push, conflictos de versión y numeración central. El smoke de navegador en `tests/browser-smoke.mjs` requiere Playwright y Chromium y recorre alta, cambios de estado, cobros, PDF, entrega, anulación, recuperación, estadísticas, celular y reapertura offline. No genera datos en producción.

Los cambios de dos dispositivos sobre el mismo registro requieren elegir la versión a conservar. Los pedidos creados sin internet pueden recibir un número definitivo diferente al sincronizar para evitar duplicados. Conviene sincronizar antes de emitir un documento para un cliente.

## Mejoras de clientes, calendario y productos

- Aviso de WhatsApp repetido, incluso con formatos equivalentes. Al cargar un pedido se puede elegir el cliente existente y conservar lo ya escrito; si dos clientes comparten número, se permite guardar con confirmación.
- Nuevo pedido desde la lista o ficha de un cliente, con cliente, forma de entrega y dirección ya completos.
- Buscador por nombre o categoría en el catálogo de productos, sin necesidad de escribir tildes.
- Crear pedidos desde un día del calendario. Las celdas muestran cantidad de pedidos, unidades y planchas por separado.
- Reprogramar entregas arrastrando a otro día o con el botón de cada pedido. Requiere confirmar la fecha, registra el cambio en el historial y permite deshacerlo desde el pedido.
- Abrir la dirección de entrega en Google Maps desde el detalle del pedido.
- Estadísticas históricas o filtradas de todos los productos, también sin ventas, inactivos e históricos: cantidades, pedidos y facturación. Ordenadas por cantidad vendida de mayor a menor, con desempate por nombre. Los descuentos se distribuyen proporcionalmente conservando el total en centavos. Se mantienen las mismas exclusiones que en las estadísticas generales.


## Compras, materia prima y cierre de entregas

- Dos pestañas nuevas: Compras y Materia prima. Arrancan vacías para cargar los datos reales.
- Compras con fecha, proveedor, referencia, varios materiales, cantidades en la unidad de cada material, importes de línea, descuento, envío/gastos y observaciones. Se editan desde su ficha, se pueden anular/restaurar y conservan historial.
- El costo por unidad de materia prima se calcula con la compra más reciente por fecha. Los gastos y descuentos se reparten entre las líneas proporcionalmente a sus importes, conservando el total en centavos. Si todos los importes son cero, los gastos se reparten por cantidad. Las compras viejas cargadas después no reemplazan la compra más reciente.
- El costo admite fracciones de centavo por unidad (por ejemplo, compras de tinta o grandes paquetes). Los importes pagados se mantienen en centavos enteros. También se puede ajustar el costo manualmente, con historial; ese ajuste se mantiene hasta que cambia la compra más reciente. Editar o anular una compra recalcula el costo. La unidad no se cambia una vez usada en compras.
- Compras y materiales se sincronizan por el mismo servicio, se incluyen en las copias y funcionan sin conexión. No necesitan migraciones nuevas de D1 ni credenciales adicionales.
- Las estadísticas históricas y filtradas incluyen inversión en compras, cantidad, compra promedio, gastos, descuentos, proveedores, categorías, meses, comparación mensual, cantidades por unidad y todas las materias primas: importes, costo promedio ponderado, actual, mínimo, máximo y variación. Las anuladas quedan fuera. Comprar materiales no modifica el costo histórico de pedidos ni se descuenta otra vez de su ganancia. No se estima stock ni consumo sin registrarlos.
- En pedidos de Mercado Libre, Número de pedido reemplaza al teléfono y se guarda en el pedido, como texto. La creación de clientes desde esos pedidos no exige WhatsApp ni confunde la referencia con un teléfono. El botón de contacto dice Mercado Libre; si se pega el enlace de la venta, abre ese enlace, y si no, abre el sitio de Mercado Libre. Los clientes y pedidos anteriores conservan sus datos.
- Al completar la entrega aparece una ficha de revisión de cobro: avisa si ya está pagado o permite registrar el saldo completo o un cobro parcial. Entregar nunca registra un pago automáticamente. Los entregados con saldo mantienen un aviso visible en su ficha.


### Ventas, tareas y análisis

- El menú principal agrupa las vistas de ventas bajo **Ventas**: Todos los pedidos (inicio, por día de entrega), Hoy, Esta semana, Para entregar, Entregados, Presupuestos y Anulados. Los enlaces anteriores siguen funcionando.
- **Tareas** está entre Ventas y Compras. Permite título, notas, categoría libre, prioridad, fecha opcional y estados Pendiente / En curso / Hecha; búsqueda y vistas de hoy, próximos siete días, hechas y archivadas. Las tareas se sincronizan y funcionan sin internet. No generan ventas ni gastos. Los recordatorios diarios incluyen tareas vencidas y de hoy/mañana, salvo que se desactiven por tarea.
- Los clientes de Mercado Libre guardan el **usuario del comprador**, que también se puede buscar. El número de venta y enlace son referencias opcionales del pedido; los números anteriores se conservan y siguen siendo válidos. WhatsApp permanece separado.
- Duplicar desde la ficha crea un formulario nuevo para revisar. En pedidos se conservan cliente, productos, cantidades, notas, etiquetas y descuento, con precios/costos actuales del catálogo; se reinician fecha de entrega, avance, cobros y referencia de venta. En compras se conservan proveedor, materiales, cantidades e importes editables, con fecha de hoy y referencia vacía. No se copian identificadores, historial ni anulación.
- Cada producto admite costo manual o una **receta** de materia prima por unidad/plancha. Acepta cantidades fraccionarias y usa el costo vigente de cada material (compra con gastos/descuentos o ajuste manual); redondea el total final a centavos. Se actualiza al cargar/editar/anular compras sin reescribir los costos de pedidos guardados ni cambiar precios de venta.
- Estadísticas incluye gráfico mensual de ventas, cobros y compras, con tabla de valores accesible y meses en cero, respetando el filtro general. El comparador permite dos meses o rangos independientes, con totales, diferencias y variación porcentual; una base cero se indica sin inventar porcentajes.
