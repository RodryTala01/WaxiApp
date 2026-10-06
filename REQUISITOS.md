# Decisiones acordadas con Rodri

## Prioridad

ERP simple interno para Waxi Stickers. Un solo operador, sin usuarios ni permisos. Organización, producción y entregas; los cobros son una parte simple del pedido. Debe crecer después sin rehacer la base. Funcionalidad y diseño juntos. PC primero, celular útil e instalable. Datos reales desde el primer uso; arranque vacío.

## Pedidos

Número automático visible como #1; fecha y hora de ingreso automáticas. Cliente, entrega, varios productos con cantidades/precios/costos, descuento global en pesos, cobros, canal, etiquetas y observaciones. Los productos avanzan independientemente. El estado general siempre es el mínimo; no se asigna manualmente.

Estados iniciales exactos: Posible pedido; Pedido confirmado; Plancha diseñada; Plancha impresa; Cortado; Terminado; Entregado. Los estados pueden ampliarse y renombrarse; no se eliminan los que usa un pedido. No habrá prioridades ni duplicación/repetición de pedidos.

Los entregados salen del trabajo activo y quedan en Entregados con el monto cobrado. Los anulados conservan motivo (cliente, no respondió, error u otro), son recuperables y no cuentan en estadísticas. Historial de cambios y recuperación del último cambio cuando sea posible.

## Clientes y entrega

Nombre, WhatsApp obligatorio, Retira/Encuentro/Llevo, dirección o punto de encuentro y notas. Reutilizar cliente y ver historial de compras e importe. WhatsApp abre el chat manualmente. No se guardan conversaciones ni se envían mensajes automáticos. Sin VIP, bloqueos ni usuarios problemáticos especiales.

La entrega usa una sola fecha; no hay fecha interna, localidad obligatoria, costo de envío, seguimiento ni receptor. Registrar entrega efectiva automáticamente cuando todos los productos queden Entregados.

## Catálogo

Once productos iniciales: Stickers de catálogo Normales/Holográficos/Vinilo; Plancha de stickers personalizados Normales/Holográficos/Vinilo; Plancha de papel fotográfico sin adhesivo; Imanes publicitarios; Calendarios personalizados; Llaveros; Encendedores.

Precio y costo por producto, modificables en un pedido; cantidad por unidad o plancha según el producto. Productos y categorías administrables. Sin tamaños, variantes adicionales, laminado, unidades por plancha, corte individual, inventario ni consumo de materiales. No existe producto libre: primero se crea en el catálogo.

## Cobros y estadísticas

Ingresar monto, fecha y método Efectivo/Transferencia. Permitir varios cobros y representar Sin cobrar/Cobro parcial/Cobrado. No distinguir seña y pago final, no adjuntar comprobantes, no bloquear ni alertar entrega por deuda. Saldo como dato y estadística simple.

Estadísticas desde V1: ventas, cobros, ganancia estimada por costos del producto, cantidad de pedidos, ticket promedio, descuentos, margen, saldo y comparación entre meses. Ventas por canal cuando aporte información. No hay ranking de productos/clientes, tiempos de producción, métricas de retrasos, contabilidad fiscal ni ARCA. Sin importación/exportación de planillas en V1.

## Interfaz y avisos

Lista principal legible, ordenada por fecha de entrega. Hoy muestra también mañana y atrasados. Semana, calendario mensual y Para entregar. Buscador por nombre, WhatsApp, número y producto; filtros de fecha/producto/cobro/entrega/canal. No filtro por estado ni favoritos. Etiqueta Urgente disponible; no prioridad separada.

Alertas internas intuitivas. Preparar notificaciones reales para PC/celular aun con la página cerrada, sin usar email/WhatsApp/Telegram. Avisos diarios para hoy/mañana, atrasados recurrentes y falta de avance. Sin recordatorios manuales por pedido ni sonidos.

Tema claro blanco/gris con acentos de Waxi, banner original, pocas curvas, animaciones mínimas, tipografía simple, íconos discretos. Evitar formularios complicados y gráficos decorativos. Nuevo pedido siempre accesible. Sin archivo adjunto: la respuesta 89–100 reemplaza el campo archivos de la respuesta 38. La única imagen interna es la identidad de Waxi.

## Documentos y configuración

Presupuesto profesional descargable en PDF, comprobante interno y etiqueta con datos de cliente. No facturas fiscales ni QR del pedido. Configuración de productos/precios/costos/clientes/categorías/etiquetas/canales/estados y datos de los documentos. Copias de recuperación sencillas, preferentemente diarias.

Repositorio existente público RodryTala01/WaxiApp. Hosting gratuito, sin dominio propio ni ambiente de pruebas separado. Sin login en la aplicación. Proteger datos sincronizados mediante configuración privada por dispositivo. Sin integraciones con la web, Mercado Libre, Sheets, Mercado Pago o ARCA en esta versión.
