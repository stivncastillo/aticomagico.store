# El Paquetote — tienda online

Sitio estatico hecho con **Astro**, **Tailwind CSS v4** y **React** (para el filtro
interactivo del catalogo). No tiene carrito de compras: cada producto tiene un boton
que abre WhatsApp con un mensaje pre-armado para cerrar la venta manualmente.

## Stack (100% gratis / open source)

- [Astro 5](https://astro.build) — genera un sitio estatico rapido, ideal para hosting gratuito.
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite` — estilos.
- [React](https://react.dev) — solo se usa como isla interactiva en el buscador/filtro del catalogo (`ProductFilter.tsx`); el resto del sitio es HTML estatico para máxima velocidad y SEO.
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) — el catalogo de productos vive como archivos `.json` en `src/content/products/`, validados con un schema (Zod).
- [lucide-astro](https://lucide.dev) — iconos SVG livianos, sin JS extra.
- `@astrojs/sitemap` — genera `sitemap-index.xml` automaticamente para SEO.

## Requisitos

- Node.js 18.17+ (recomendado 20 o 22).

## Primeros pasos

```bash
npm install
npm run dev
```

Abre http://localhost:4321

> Nota: el `node_modules` de este proyecto se genero dentro de un entorno de Claude.
> Antes de tu primer `npm run dev` en tu Mac, corre `npm install` una vez para asegurar
> los binarios nativos correctos de tu sistema (Tailwind/Vite usan paquetes nativos).

## Configurar el numero de WhatsApp

Edita el archivo `.env` (ya existe, basado en `.env.example`):

```
PUBLIC_WHATSAPP_NUMBER=573001234567
PUBLIC_SITE_URL=https://tu-dominio.com
```

El numero debe ir en formato internacional, sin "+" ni espacios.

## Cambiar datos del negocio (Instagram, catalogo de WhatsApp, etc.)

Edita `src/lib/config.ts`.

## Agregar / editar productos

Cada producto es un archivo `.json` dentro de `src/content/products/`. El nombre del
archivo se usa como URL (`/producto/<nombre-archivo>`), por ejemplo
`src/content/products/lampara-luna.json` → `/producto/lampara-luna`.

```json
{
  "name": "Nombre del producto",
  "price": 50000,
  "description": "Descripcion corta.",
  "category": "Decoracion",
  "image": "/images/productos/mi-producto.jpg",
  "featured": true,
  "inStock": true
}
```

- `compareAtPrice` (opcional): precio tachado, para mostrar descuento.
- `image`: por defecto usa una imagen de relleno. Cuando tengas fotos reales, ponlas
  en `public/images/productos/` y referencia la ruta ahi (ej: `/images/productos/foto.jpg`).
- `featured`: si es `true`, aparece en la seccion "Destacados" del inicio.
- `inStock`: si es `false`, se muestra "Agotado" y se desactiva el boton de compra.

## Carrito de compras (sin pasarela de pago)

Cada producto se puede agregar a un carrito que vive en el `localStorage` del
navegador (no hay backend ni base de datos): el boton redondo con el icono de
bolsa agrega 1 unidad; en la pagina de producto hay ademas un selector de
cantidad. El icono del carrito esta en el header (con un contador) y abre un
panel lateral donde se puede ver, editar y vaciar el pedido.

Al hacer clic en "Finalizar por WhatsApp" se arma un mensaje con el detalle
completo (producto, cantidad y subtotal de cada uno, mas el total) y se abre
WhatsApp con ese mensaje ya escrito, usando el mismo `PUBLIC_WHATSAPP_NUMBER`
del `.env`. El carrito se vacia automaticamente despues de abrir WhatsApp.

Importante: el carrito es **local a cada navegador/dispositivo** (no se
sincroniza entre el celular y el computador de un cliente, ni tu lo ves de tu
lado hasta que llega el mensaje). Sigue siendo un flujo manual: tu confirmas
disponibilidad y cierras la venta por chat, como con el boton de compra
individual.

Codigo relacionado:

- `src/lib/cart.ts` — el "store" del carrito (leer/escribir localStorage,
  agregar/quitar/cambiar cantidad, armar el mensaje de WhatsApp).
- `src/components/cart/CartWidget.tsx` — icono + panel lateral (en el header).
- `src/components/cart/AddToCartButton.tsx` — boton para agregar un producto
  (variante `compact` en las tarjetas, `full` con selector de cantidad en el
  detalle de producto).

## Scraper de productos (actualizar catalogo automaticamente)

Actualizar el catalogo desde el proveedor/mayorista es un proceso de **dos
pasos**, con un Excel en el medio para que vos decidas precios y categorias
antes de que nada se publique en la tienda:

1. **`npm run scrape`** — abre el catalogo de
   [vercatalogo.com](https://vercatalogo.com), lee todos los productos
   (nombre, precio de mayorista, categoria, imagen) y los escribe/actualiza
   en un Excel: `data/productos-proveedor.xlsx`. **No toca la tienda.**
2. **Vos editas el Excel** a mano: precio de venta, categoria, si esta
   destacado, si esta disponible, si se publica o no.
3. **`npm run import-catalogo`** — lee ese Excel y crea/actualiza los
   archivos de `src/content/products/` (o los borra, si marcaste un producto
   para no publicarlo). Recien ahi los cambios llegan a la tienda.

### Configuracion (una sola vez)

```bash
npm install
npx playwright install chromium
```

`npx playwright install chromium` descarga el navegador que usa el script
para leer la pagina (el catalogo del proveedor carga los productos con
JavaScript, por eso hace falta un navegador real y no alcanza con pedir el
HTML). Puede pesar ~150-300MB, es normal que tarde un rato la primera vez.

### Paso 1: traer los productos del proveedor al Excel

```bash
npm run scrape
```

Esto:
1. Abre el catalogo, acepta el aviso de cookies si aparece.
2. Hace clic en "Ver mas" hasta cargar todo el catalogo.
3. Lee codigo, nombre, precio de mayorista, categoria e imagen de cada
   tarjeta. El listado marca los productos que tienen mas de 1 foto — para
   esos (solo esos), abre el modal del producto y trae la galeria completa.
   No hace falta `--deep` para esto — ver "Descripciones reales y fotos
   extra" mas abajo.
4. Escribe (o actualiza) `data/productos-proveedor.xlsx`, con una fila por
   producto y estas columnas:

   | Columna                 | Quien la llena       | Que es |
   |--------------------------|-----------------------|--------|
   | `codigo`                 | el scraper            | codigo interno del proveedor (no lo edites, es la clave para no duplicar productos) |
   | `nombre`                 | el scraper            | nombre tal cual aparece en el catalogo del proveedor |
   | `categoria`               | vos (opcional)         | si la dejas vacia, el scraper pone la del proveedor |
   | `precio_mayorista`        | el scraper             | precio del proveedor, de referencia — **no es el precio de venta** |
   | `precio_venta`            | **vos**                | el precio que se muestra en la tienda. Si lo dejas vacio, usa `precio_mayorista` |
   | `imagen`                  | el scraper             | URL de la foto principal (portada) |
   | `imagenes`                 | el scraper / vos | fotos extra para el carousel del producto, **separadas por coma `,` o punto y coma `;`** (ej: `url1, url2; url3`). Se llena sola con **cualquier** `npm run scrape` (no hace falta `--deep`) si el producto tiene mas de 1 foto en el proveedor — y se sigue refrescando en cada scrape mientras siga teniendo varias. Podes agregar o editar las URLs a mano igual. Si la dejas vacia, la pagina del producto muestra solo la portada, sin carousel |
   | `descripcion`              | **vos** (o el scraper, solo si esta vacia)          | igual que `precio_venta`: si le escribis algo, queda protegida para siempre — ni `scrape` ni `scrape:deep` te la pisan. Si la dejas vacia, `scrape:deep` la llena con la descripcion real del proveedor (y si sigue vacia, al importar se usa el `nombre` como descripcion) |
   | `destacado`                | **vos**                | `TRUE`/`FALSE` — si aparece en la seccion de destacados |
   | `disponible`                | **vos**                | `TRUE`/`FALSE` — si esta en stock |
   | `publicar`                   | **vos**                | `TRUE`/`FALSE` — si `FALSE`, el producto se borra de la tienda al importar |
   | `en_catalogo_proveedor`       | el scraper             | `TRUE` si el proveedor lo sigue teniendo, `FALSE` si desaparecio de su catalogo (no se borra solo — es un aviso para que decidas) |

   Correr `npm run scrape` de nuevo **nunca te pisa** `categoria`,
   `precio_venta`, `descripcion`, `destacado`, `disponible` ni `publicar` si
   ya les habias puesto algo — solo actualiza lo que viene del proveedor
   (nombre, precio de mayorista, imagen, y `imagenes` si tiene varias fotos)
   y agrega productos nuevos.
5. Al final imprime un resumen: cuantos productos son nuevos, cuantos se
   actualizaron, y cuantos ya no estan en el catalogo del proveedor.

### Paso 2: revisar el Excel

Abre `data/productos-proveedor.xlsx` (Excel, Numbers, Google Sheets, lo que
uses) y completa/ajusta `precio_venta`, `categoria`, `destacado`,
`disponible` y `publicar` como quieras. Los productos nuevos vienen con
`publicar = TRUE` por defecto — si no quieres publicar alguno todavia,
ponle `FALSE`.

### Paso 3: pasar el Excel a la tienda

```bash
npm run import-catalogo
```

Esto lee el Excel y, por cada fila:
- Si `publicar` es `TRUE` (o esta vacio): crea o actualiza
  `src/content/products/vc-<codigo>.json` con los datos de esa fila.
- Si `publicar` es `FALSE`: borra ese archivo si existia (el producto deja
  de aparecer en la tienda, pero la fila se queda en el Excel por si despues
  lo quieres volver a publicar).
- Si falta el codigo, el nombre, o no hay ningun precio valido: se salta esa
  fila y lo avisa al final, sin frenar el resto.

Al terminar corre `npm run build` (o `npm run dev` si ya lo tienes abierto)
para ver los productos actualizados.

### Fotos extra / carousel y descripciones reales

**Fotos extra**: no hace falta nada especial. Cualquier `npm run scrape`
normal ya abre el detalle de los productos que el proveedor marca con mas
de 1 foto (y solo esos, el resto del catalogo se lee rapido, como siempre)
y llena la columna `imagenes` sola. Esta columna se sigue refrescando en
cada scrape mientras el producto siga teniendo varias fotos — si le editas
las URLs a mano y el producto sigue con varias fotos en el proveedor, un
scrape posterior te la vuelve a pisar (a diferencia de `descripcion` y
`precio_venta`, que si quedan protegidas).

**Descripcion real**: por defecto el listado no la trae (usa el `nombre`
como descripcion al importar). Si la queres, corre:

```bash
npm run scrape:deep
```

Esto abre **todos** los productos (no solo los de varias fotos) para leer
su descripcion real en el catalogo del proveedor, y la guarda en la
columna `descripcion` — pero **solo si esa columna todavia esta vacia**.
Funciona igual que `precio_venta`: en cuanto le escribis algo a mano, queda
protegida para siempre, ningun `scrape` ni `scrape:deep` posterior te la
va a pisar.

Como `--deep` abre el detalle de todos los productos (no solo los de
varias fotos), tarda bastante mas que el scrape normal — con cientos de
productos puede tomar varios minutos. Si ya tenes las descripciones que
queres (escritas a mano o traidas una vez con `--deep`), no hace falta
volver a correrlo — el scrape normal ya te mantiene `imagenes` al dia.

### Carousel de fotos en la pagina del producto

Si un producto tiene mas de una foto (columna `imagenes` con al menos 2
URLs), su pagina muestra un carousel: flechas para ir a la foto anterior
o siguiente, puntos indicadores, contador ("2 / 4") y deslizar con el
dedo en celular. Si solo tiene una foto (o `imagenes` esta vacia), se ve
como antes: una sola imagen fija, sin controles.

Podes armar la columna `imagenes` de dos formas: dejando que
`npm run scrape` la traiga sola del proveedor (no hace falta `--deep`), o
escribiendola vos mismo a mano en el Excel — poné las URLs de las fotos separadas por coma
`,` o punto y coma `;`, por ejemplo:

```
https://miurl.com/foto1.jpg, https://miurl.com/foto2.jpg; https://miurl.com/foto3.jpg
```

Despues corre `npm run import-catalogo` como siempre para que el cambio
llegue al sitio.

### Automatizarlo (que el Paso 1 corra solo todos los dias)

El scraper (Paso 1) no se ejecuta solo — hay que decirle al Mac que lo
corra. La forma mas simple en macOS es `launchd`. Crea un archivo
`~/Library/LaunchAgents/com.aticomagico.scrape.plist` con algo como:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.aticomagico.scrape</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npm</string>
    <string>run</string>
    <string>scrape</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/TU_USUARIO/Projects/frontend/aticomagico</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>7</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>/tmp/aticomagico-scrape.log</string>
  <key>StandardErrorPath</key><string>/tmp/aticomagico-scrape.log</string>
</dict>
</plist>
```

Y lo activas con `launchctl load ~/Library/LaunchAgents/com.aticomagico.scrape.plist`
(ajusta la ruta de `npm` con `which npm` y `WorkingDirectory` a tu carpeta
real). Corre todos los dias a las 7:00am y deja el log en
`/tmp/aticomagico-scrape.log`. Ojo: esto solo automatiza el Paso 1 (llenar el
Excel) — revisar el Excel y correr `npm run import-catalogo` siguen siendo
pasos manuales, a proposito, para que nada se publique sin que lo revises.
Si prefieres no automatizar nada todavia, tambien esta perfecto correr
`npm run scrape` a mano cuando quieras.

### Si el proveedor cambia su pagina

El scraper lee la pagina por su estructura HTML actual (nombres de clases
como `.slide-q-card`, `.product-name`, `.view-more-container`, etc. —
incluida `.multiple-images`, la que marca los productos con varias fotos:
si el proveedor la cambia, esos productos simplemente quedan con solo la
portada). Si el proveedor rediseña su sitio, el script puede dejar de
encontrar los productos o de cargar el catalogo completo — no se rompe el
resto de la tienda, simplemente no actualiza el Excel. Si eso pasa, avisame
y lo ajusto.

## Build / deploy

```bash
npm run build   # genera el sitio estatico en dist/
npm run preview # previsualiza el build de produccion
```

Como es un sitio 100% estatico, se puede alojar gratis en:

- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Netlify](https://www.netlify.com/)
- [Vercel](https://vercel.com/)
- [GitHub Pages](https://pages.github.com/)

Recuerda actualizar `PUBLIC_SITE_URL` en `.env` (o las variables de entorno del
hosting elegido) con el dominio final para que el sitemap y las meta tags queden bien.

## Estructura

```
src/
  components/     Header, Footer, ProductCard, ProductFilter (React), etc.
  content/
    products/     Un .json por producto (el catalogo)
    config.ts     Schema de validacion del catalogo
  layouts/
    Layout.astro  HTML base, SEO, fuentes
  lib/
    config.ts     Datos del negocio (nombre, instagram, moneda, etc.)
    whatsapp.ts   Helper para armar los links de wa.me
  pages/
    index.astro          Inicio
    catalogo.astro       Catalogo completo con buscador/filtro
    producto/[slug].astro Detalle de producto
    404.astro
```
