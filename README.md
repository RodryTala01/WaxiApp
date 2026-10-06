# WaxiApp

Organizador de pedidos privado de Waxi Stickers, pensado para trabajar principalmente desde PC. Interfaz clara, blanco y gris, acentos rojos y banner original. Sin cuentas de usuario, roles ni pantalla de login.

## Estado de esta entrega

La aplicación funciona con guardado local y sin conexión después de abrirla por primera vez. **Publicación, sincronización entre dispositivos y notificaciones con la app cerrada requieren activar el servicio de Cloudflare.** No se presenta el almacenamiento del navegador como sincronización.

- Pedidos con varios productos; cada producto tiene su estado. La vista general muestra el de menor avance.
- Flujo: Posible pedido → Pedido confirmado → Plancha diseñada → Plancha impresa → Cortado → Terminado → Entregado.
- El inicio muestra todos los pedidos pendientes agrupados por día de entrega, del más cercano al más lejano, con los pedidos sin fecha al final. Hoy incluye atrasados, hoy y mañana, ordenados por entrega. También hay semana, calendario, entregas, entregados y anulados.
- Listas desplegables con búsqueda por texto, sin necesidad de escribir tildes. Los clientes también se encuentran por WhatsApp. Funciona con teclado y celular.
- Clientes reutilizables con nombre, WhatsApp obligatorio, entrega habitual, dirección y notas; ficha e historial.
- Catálogo editable con precio, costo y unidad/plancha. Los pedidos conservan precios y costos históricos.
- Cobros múltiples, fechas y efectivo/transferencia; saldo y estado de cobro. La entrega no queda bloqueada por saldo.
- Etiquetas y canales editables; buscador y filtros de fecha, producto, pago, entrega y canal.
- Estadísticas: ventas confirmadas, cobros, costos, ganancia estimada, margen, ticket, cantidad de pedidos, descuentos, saldos y comparación mensual. No incluye posibles, presupuestos ni anulados.
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
