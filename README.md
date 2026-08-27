# Atico Magico — tienda online

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
