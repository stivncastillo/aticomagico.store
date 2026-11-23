#!/usr/bin/env node
/**
 * Trae productos, precios (de mayorista) e imagenes desde el catalogo de
 * Vercatalogo (https://vercatalogo.com/<tienda>/products/by-all/all) y los
 * escribe en un Excel: data/productos-proveedor.xlsx.
 *
 * Este script NO toca el sitio directamente. El flujo completo es:
 *   1. node scripts/scrape-vercatalogo.mjs   -> llena/actualiza el Excel
 *   2. Vos editas el Excel: precio_venta, categoria, destacado, disponible,
 *      publicar, imagenes (varias fotos separadas por "," o ";"), lo que
 *      quieras.
 *   3. node scripts/import-excel.mjs          -> lee el Excel y crea/actualiza
 *      los productos del sitio en src/content/products/
 *
 * Uso:
 *   node scripts/scrape-vercatalogo.mjs                 -> trae TODO: nombre,
 *      precio mayorista, categoria, descripcion real y TODAS las fotos de
 *      cada producto, en segundos (ver "Como funciona" abajo).
 *   node scripts/scrape-vercatalogo.mjs --store=otra-tienda
 *
 * No requiere Playwright ni ningun navegador instalado.
 *
 * --- Como funciona (22-11-2026: reemplazo del scraper por la API) -------
 *
 * Antes este script abria la pagina con Playwright y leia el HTML tarjeta
 * por tarjeta (lento: varios minutos para todo el catalogo, y para traer
 * la descripcion real o las fotos extra de cada producto habia que abrir
 * su modal uno por uno con `--deep`).
 *
 * Investigando la pagina en vivo se confirmo que vercatalogo.com es una SPA
 * Angular que por debajo consume una API JSON propia
 * (`api-latam.vercatalogo.com`) con los mismos datos, SIN necesitar ningun
 * login ni cookie de navegador:
 *
 *   1. `POST {API_BASE}session` con body `{}` devuelve un token de sesion
 *      de corta duracion (`{ token, expires_in: 900 }`, 15 minutos) - no es
 *      un secreto fijo, hay que pedir uno nuevo cada vez (o cuando el que
 *      se esta usando venza).
 *   2. Ese token va en el header `X-VC-Token` (junto a `X-VC-Version`, la
 *      version de la app - no es secreto, solo cambia si el proveedor
 *      actualiza su sitio) en cada llamada a
 *      `GET {API_BASE}<tienda>/product/search?storage_id=GEN&custom_order=news&page=N&limit=M`,
 *      que devuelve una pagina de productos con TODOS los datos que antes
 *      habia que scrapear del DOM - incluida la descripcion real completa y
 *      TODAS las fotos de cada producto (campo `custom`, un JSON string
 *      adentro del JSON) - sin distincion `--deep`/normal, siempre viene
 *      todo.
 *
 * El precio mayorista sale del campo `pcia` de cada producto - confirmado
 * en vivo contra un producto real del Excel (coincide exacto con
 * `precio_mayorista`). Esto depende de que la tienda `variedadestvcali`
 * tenga configurado `price_type: "a"` (dato leido del
 * `<script id="initial-catalog-data">` de cualquier pagina del sitio, no
 * expuesto en la API de busqueda) - si el proveedor cambiara ese ajuste
 * algun dia (poco probable, es configuracion de toda la tienda, no de un
 * producto), habria que usar el campo `psib`/`pcic`/etc. que corresponda en
 * vez de `pcia` (ver `getPriceFieldFromRawProduct` mas abajo).
 */

import XLSX from "xlsx";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const EXCEL_PATH = path.join(PROJECT_ROOT, "data", "productos-proveedor.xlsx");
const SHEET_NAME = "Productos";

// --- argumentos de linea de comandos -------------------------------------
const args = process.argv.slice(2);
const storeArg = args.find((a) => a.startsWith("--store="));
const STORE_SLUG = storeArg ? storeArg.split("=")[1] : "variedadestvcali";

if (args.includes("--deep") || args.includes("--headed")) {
  console.log(
    "Aviso: --deep/--headed ya no hacen nada - desde que el scraper usa la API " +
      "directa del proveedor, CUALQUIER corrida trae siempre la descripcion real " +
      "y todas las fotos de cada producto, no hace falta pedirlo aparte."
  );
}

// --- API del proveedor ----------------------------------------------------

const API_BASE = "https://api-latam.vercatalogo.com/";
const API_VERSION = "22.15.5"; // version de la app vercatalogo.com, no es secreto (ver comentario de arriba)
const STORAGE_ID = "GEN";
const PAGE_LIMIT = 100;
const MAX_PAGES = 300; // limite de seguridad, igual que MAX_LOAD_MORE_CLICKS del scraper viejo

/** Pide un token de sesion fresco (vence a los 15 minutos, no es un secreto fijo). */
async function fetchSessionToken() {
  const res = await fetchWithRetry(`${API_BASE}session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    throw new Error(`No se pudo obtener el token de sesion (status ${res.status})`);
  }
  const data = await res.json();
  if (!data?.token) {
    throw new Error("La respuesta de /session no trajo un token.");
  }
  return data.token;
}

/** `fetch` con un par de reintentos ante fallos de red transitorios (timeout, DNS, etc.). */
async function fetchWithRetry(url, options, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(1000 * (i + 1));
    }
  }
  throw lastErr;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trae una pagina de `product/search`. Si el token vencio (401), pide uno
 * nuevo y reintenta esa misma pagina una vez - mismo patron de
 * auto-refresh que usa la propia app del proveedor por debajo.
 */
async function fetchProductPage({ token, page, refreshToken }) {
  const url = `${API_BASE}${STORE_SLUG}/product/search?storage_id=${STORAGE_ID}&custom_order=news&page=${page}&limit=${PAGE_LIMIT}`;
  let res = await fetchWithRetry(url, {
    headers: { "X-VC-Token": token, "X-VC-Version": API_VERSION },
  });

  if (res.status === 401) {
    token = await refreshToken();
    res = await fetchWithRetry(url, {
      headers: { "X-VC-Token": token, "X-VC-Version": API_VERSION },
    });
  }

  if (!res.ok) {
    throw new Error(`product/search pagina ${page} respondio status ${res.status}`);
  }

  const data = await res.json();
  // La API devuelve un array (a veces serializado como objeto {"0":..,"1":..}
  // si algun intermediario lo toca, pero Object.values() cubre ambos casos).
  const items = Array.isArray(data) ? data : Object.values(data || {});
  return { items, token };
}

/** Pagina `product/search` hasta que una pagina vuelve vacia. */
async function fetchAllRawProducts() {
  let token = await fetchSessionToken();
  const refreshToken = async () => {
    token = await fetchSessionToken();
    return token;
  };

  const all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchProductPage({ token, page, refreshToken });
    token = result.token;
    if (result.items.length === 0) break;
    all.push(...result.items);
    console.log(`  pagina ${page}: ${result.items.length} productos (total ${all.length})...`);
  }
  return all;
}

// --- mapeo de la respuesta cruda de la API al shape que ya usaba el resto
// --- de este script (el mismo que antes armaba extractFromGrid/enrichProducts) ---

function toTitleCase(text) {
  return (text || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Cual campo de precio usar depende del `price_type` configurado para toda
 * la tienda (hoy "a" para variedadestvcali, confirmado en vivo) - ver el
 * comentario grande al principio del archivo. Si el proveedor cambiara ese
 * ajuste, este es el unico lugar que habria que tocar.
 */
function getPriceFieldFromRawProduct(raw) {
  return Number(raw.pcia) || 0;
}

function mapApiProduct(raw) {
  let custom = {};
  try {
    custom = raw.custom ? JSON.parse(raw.custom) : {};
  } catch {
    custom = {};
  }

  const images = Array.isArray(custom.images)
    ? custom.images.map((img) => img?.image_url).filter(Boolean)
    : [];

  const rawName = (raw.desccli || raw.descint || "").trim();
  const code = String(raw.etiqueta || raw.tipo || raw.codigos || raw.idref || "").trim();

  return {
    code,
    name: toTitleCase(rawName),
    category: toTitleCase((raw.categorias || "").trim()),
    priceMayorista: getPriceFieldFromRawProduct(raw),
    image: images[0] || raw.url_imagen || "",
    images,
    description: (custom.description || "").trim() || undefined,
  };
}

// --- helpers de Excel -----------------------------------------------------

// Varias fotos en una celda del Excel se separan con "; " (tambien se
// acepta "," al editar a mano - ver import-excel.mjs).
const IMAGES_SEPARATOR = "; ";

const COLUMNS = [
  "codigo",
  "nombre",
  "categoria",
  "precio_mayorista",
  "precio_venta",
  "precio_oferta",
  "imagen",
  "imagenes",
  "descripcion",
  "destacado",
  "disponible",
  "publicar",
  "en_proveedor",
  "promo_semanal",
];

function readExistingRows() {
  if (!fsSync.existsSync(EXCEL_PATH)) return new Map();
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[SHEET_NAME] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return new Map();
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const map = new Map();
  for (const row of rows) {
    const codigo = String(row.codigo ?? "").trim();
    if (codigo) map.set(codigo, row);
  }
  return map;
}

/**
 * Junta lo scrapeado con lo que ya habia en el Excel: precio_venta,
 * descripcion, categoria (si la cambiaste a mano), destacado, disponible y
 * publicar NUNCA se pisan solos una vez que tienen algo - son tuyos, se
 * respetan siempre. Lo que si se actualiza siempre con lo que viene del
 * proveedor: nombre, precio_mayorista, imagen. `imagenes` y `descripcion`
 * ya vienen completas en CADA corrida (la API siempre trae todo) pero
 * siguen siendo "sticky": si vos ya escribiste algo ahi a mano, se respeta
 * igual que antes.
 */
function mergeRow(scraped, existingRow) {
  const row = {
    codigo: scraped.code,
    nombre: scraped.name,
    categoria: existingRow?.categoria || scraped.category,
    precio_mayorista: scraped.priceMayorista,
    precio_venta: existingRow?.precio_venta || scraped.priceMayorista,
    precio_oferta: existingRow?.precio_oferta || "",
    imagen: scraped.image,
    imagenes: scraped.images && scraped.images.length > 1
      ? scraped.images.join(IMAGES_SEPARATOR)
      : existingRow?.imagenes || "",
    descripcion: existingRow?.descripcion || scraped.description || "",
    destacado: existingRow ? !!existingRow.destacado : false,
    disponible: existingRow?.disponible === "" || existingRow?.disponible === undefined
      ? true
      : !!existingRow.disponible,
    publicar: existingRow?.publicar === "" || existingRow?.publicar === undefined
      ? true
      : !!existingRow.publicar,
    en_proveedor: true,
    promo_semanal: existingRow?.promo_semanal === "" || existingRow?.promo_semanal === undefined
      ? false
      : !!existingRow.promo_semanal,
  };
  return row;
}

function writeExcel(rows) {
  // orden estable: por categoria y despues por nombre, mas facil de revisar
  rows.sort((a, b) => {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria, "es");
    return a.nombre.localeCompare(b.nombre, "es");
  });

  const sheet = XLSX.utils.json_to_sheet(rows, { header: COLUMNS });
  sheet["!cols"] = [
    { wch: 10 }, // codigo
    { wch: 42 }, // nombre
    { wch: 16 }, // categoria
    { wch: 15 }, // precio_mayorista
    { wch: 15 }, // precio_venta
    { wch: 15 }, // precio_oferta
    { wch: 45 }, // imagen
    { wch: 60 }, // imagenes
    { wch: 60 }, // descripcion
    { wch: 10 }, // destacado
    { wch: 10 }, // disponible
    { wch: 10 }, // publicar
    { wch: 10 }, // en_proveedor
    { wch: 10 }, // promo_semanal
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
  XLSX.writeFile(workbook, EXCEL_PATH);
}

async function main() {
  console.log(`Consultando la API del proveedor (tienda: ${STORE_SLUG})...`);

  const rawProducts = await fetchAllRawProducts();
  console.log(`${rawProducts.length} productos recibidos de la API.`);

  const products = rawProducts
    .map(mapApiProduct)
    .filter((p) => p.code && p.name && p.image);

  const skipped = rawProducts.length - products.length;
  if (skipped > 0) {
    console.warn(`  aviso: se saltaron ${skipped} productos sin codigo/nombre/imagen validos.`);
  }
  console.log(`${products.length} productos listos para el Excel.`);

  await fs.mkdir(path.dirname(EXCEL_PATH), { recursive: true });
  const existingRows = readExistingRows();

  const newRows = [];
  const seenCodes = new Set();
  let created = 0;
  let updated = 0;

  for (const product of products) {
    seenCodes.add(product.code);
    const existingRow = existingRows.get(product.code);
    newRows.push(mergeRow(product, existingRow));
    if (existingRow) updated++;
    else created++;
  }

  // productos que ya no aparecen en el catalogo del proveedor: si se borran
  let goneCount = 0;
  for (const [codigo, row] of existingRows) {
    if (!seenCodes.has(codigo)) {
      newRows.push({ ...row, en_proveedor: false });
      goneCount++;
    }
  }

  writeExcel(newRows);

  console.log("");
  console.log(`Listo: ${EXCEL_PATH}`);
  console.log(`  Nuevos:       ${created}`);
  console.log(`  Actualizados: ${updated}`);
  if (goneCount > 0) {
    console.log(`  Ya no estan en el catalogo del proveedor: ${goneCount} (eliminados)`);
  }
  console.log("");
  console.log("Revisa/edita el Excel (precio_venta, categoria, destacado, disponible, publicar)");
  console.log("y despues corre: npm run import-catalogo");
}

main().catch((err) => {
  console.error("Error corriendo el scraper:", err);
  process.exit(1);
});
