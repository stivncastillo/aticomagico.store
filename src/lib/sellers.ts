import { PUBLIC_WHATSAPP_NUMBER } from "astro:env/client";

/**
 * WhatsApp dinamico por vendedor
 * ===============================
 * Amigos/revendedores que comparten el catalogo con su propio link, para
 * que los pedidos que ellos generan les lleguen a SU WhatsApp (y no al
 * oficial). Ellos coordinan la entrega/pago como prefieran con cada cliente.
 *
 * Para agregar un vendedor nuevo:
 * 1. Eligele un `id` corto, sin espacios ni tildes (va en la URL que ese
 *    amigo comparte, ej. id "juan" -> tutienda.com/?vendedor=juan).
 * 2. Agrega su numero de WhatsApp en el mismo formato que
 *    PUBLIC_WHATSAPP_NUMBER (.env): solo numeros, con codigo de pais,
 *    sin "+" ni espacios ni guiones. Ej: 573001112222
 *
 * Ejemplo:
 *   { id: "juan", name: "Juan", whatsapp: "573001112222" },
 *   { id: "maria", name: "Maria", whatsapp: "573003334444" },
 */
export interface Seller {
  id: string;
  name: string;
  whatsapp: string;
}

export const sellers: Seller[] = [
  // Agrega aqui a tus amigos vendedores (ver instrucciones arriba).
  {id: "miguel", name: "Miguel Peña", whatsapp: "573156171407"},
  {id: "raul", name: "Raul", whatsapp: "573042744239"},
  {id: "sneider", name: "Sneider", whatsapp: "573160557613"},
];

const PARAM_NAME = "vendedor";
const STORAGE_KEY = "el-paquetote:vendedor";

function findSeller(id: string | null): Seller | null {
  if (!id) return null;
  return sellers.find((s) => s.id === id) ?? null;
}

/**
 * Lee `?vendedor=<id>` de una URL. Si `id` coincide con un vendedor
 * conocido, devuelve ese `id`; si no, devuelve null (ej. parametro ausente,
 * mal escrito, o de un vendedor que ya no esta en la lista).
 */
export function parseSellerParam(search: string): string | null {
  const params = new URLSearchParams(search);
  const id = params.get(PARAM_NAME);
  return findSeller(id) ? id : null;
}

/**
 * Guarda el vendedor activo en localStorage, para que se recuerde mientras
 * el visitante navega el sitio - incluso si entra a otras paginas sin el
 * parametro en la URL, o cierra y vuelve a abrir el sitio mas tarde.
 */
function storeSellerId(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage no disponible (modo privado, cuota llena, etc.) - el
    // sitio sigue funcionando igual, solo que sin recordar al vendedor.
  }
}

function getStoredSellerId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Si la URL actual trae un `?vendedor=<id>` valido, lo guarda como el
 * vendedor activo. Se llama una vez en cada carga de pagina (ver el script
 * en Layout.astro) para que cualquier link que un amigo comparta "marque"
 * al visitante, sin importar a que pagina del sitio apunte ese link.
 */
function captureSellerFromUrl() {
  if (typeof window === "undefined") return;
  const id = parseSellerParam(window.location.search);
  if (id) storeSellerId(id);
}

/** Vendedor activo para el visitante actual (o null si no hay ninguno / no aplica). */
export function getActiveSeller(): Seller | null {
  if (typeof window === "undefined") return null;
  return findSeller(getStoredSellerId());
}

/**
 * Numero de WhatsApp a usar para el visitante actual: el del vendedor
 * activo si hay uno guardado, o el oficial si no. Es el valor por defecto
 * que usan `buildWhatsAppLink` y `buildCartWhatsAppLink` cuando no se les
 * pasa un numero explicito - por eso todos los botones de "comprar"/
 * "escribir" del sitio quedan dinamicos sin tener que tocarlos uno por uno.
 *
 * Durante el build de Astro (sin `window`) siempre devuelve el numero
 * oficial, que es lo correcto: en ese momento no hay un visitante real con
 * un vendedor guardado todavia.
 */
export function getActiveSellerWhatsApp(): string {
  return getActiveSeller()?.whatsapp ?? PUBLIC_WHATSAPP_NUMBER;
}

/**
 * Si `href` apunta al numero oficial de WhatsApp, devuelve el mismo link
 * pero apuntando al numero de `seller` (conservando el mensaje `?text=...`
 * tal cual). Si no apunta al numero oficial, devuelve null (no hay nada
 * que reescribir).
 */
export function rewriteToSeller(href: string, seller: Seller): string | null {
  const officialPrefix = `https://wa.me/${PUBLIC_WHATSAPP_NUMBER}`;
  if (!href.startsWith(officialPrefix)) return null;
  return `https://wa.me/${seller.whatsapp}${href.slice(officialPrefix.length)}`;
}

function patchExistingLinks(seller: Seller, root: ParentNode) {
  const anchors = root.querySelectorAll<HTMLAnchorElement>('a[href^="https://wa.me/"]');
  for (const anchor of anchors) {
    const rewritten = rewriteToSeller(anchor.href, seller);
    if (rewritten) anchor.href = rewritten;
  }
}

/**
 * Pone en marcha el WhatsApp dinamico en el navegador: captura el vendedor
 * del link (si llego con `?vendedor=`) y, si hay uno activo, reescribe
 * TODOS los links de WhatsApp del sitio para que apunten a su numero -
 * tanto los que ya estan en la pagina (header, hero, footer, boton
 * flotante, paginas legales) como los que React vuelve a renderizar
 * despues con un numero distinto cada vez (ej. el link final del carrito,
 * que cambia con cada producto que se agrega).
 *
 * Los botones que construyen su link con `buildWhatsAppLink`/
 * `buildCartWhatsAppLink` ya usan el numero correcto desde el primer
 * render en el navegador (ver `getActiveSellerWhatsApp` arriba); este
 * observer es el respaldo para los que no vuelven a ejecutar JS (son
 * Astro estatico, ej. Footer.astro) y para cualquier otro caso.
 */
export function initSellerRouting() {
  if (typeof window === "undefined") return;

  captureSellerFromUrl();
  const seller = getActiveSeller();
  if (!seller) return;

  patchExistingLinks(seller, document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLAnchorElement) {
        const rewritten = rewriteToSeller(mutation.target.href, seller);
        if (rewritten) mutation.target.href = rewritten;
      }
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) patchExistingLinks(seller, node);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
}
