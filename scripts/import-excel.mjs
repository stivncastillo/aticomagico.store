#!/usr/bin/env node
/**
 * Lee data/productos-proveedor.xlsx (generado y editado a mano a partir de
 * scripts/scrape-vercatalogo.mjs) y crea/actualiza los productos del sitio
 * en src/content/products/vc-<codigo>.json.
 *
 * Flujo completo:
 *   1. node scripts/scrape-vercatalogo.mjs   -> llena/actualiza el Excel
 *   2. Vos editas el Excel: precio_venta, categoria, destacado, disponible,
 *      publicar, lo que quieras.
 *   3. node scripts/import-excel.mjs          -> lee el Excel y crea/actualiza
 *      los productos del sitio en src/content/products/
 *
 * Reglas:
 *   - publicar = FALSE (o vacio para una fila que ya tenia el archivo
 *     creado): se borra el JSON correspondiente (se "despublica" el
 *     producto). No rompe si el archivo no existia.
 *   - Fila sin codigo, nombre o precio valido: se salta con una advertencia,
 *     no frena el resto del import.
 *   - precio_venta vacio o 0: se usa precio_mayorista como respaldo (con
 *     advertencia), para no dejar productos con precio $0 publicados.
 *
 * Uso:
 *   node scripts/import-excel.mjs
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
const PRODUCTS_DIR = path.join(PROJECT_ROOT, "src", "content", "products");
const PREFIX = "vc-"; // mismo prefijo que usa el scraper para el codigo del proveedor

/**
 * Algunos codigos del proveedor traen caracteres invalidos para un nombre
 * de archivo (ej: "2749N/2748B", con una barra -> se interpretaria como una
 * subcarpeta y rompia el import). Los reemplazamos por "-" solo para el
 * nombre del archivo; el codigo real se preserva tal cual en el Excel.
 */
function sanitizeForFilename(codigo) {
  return codigo.replace(/[\/\\:*?"<>|\s]+/g, "-");
}

function getDiscountPercent(price, salePrice) {
  if (!price || price <= 0 || salePrice == null || salePrice >= price) return 0;
  return Math.ceil(((price - salePrice) / price) * 100);
}

/**
 * "url1, url2; url3" -> ["url1", "url2", "url3"]. Acepta coma y/o punto y
 * coma como separador (lo que sea mas comodo al editar el Excel a mano),
 * ignora espacios de mas y celdas vacias.
 */
function parseImageList(value) {
  return String(value ?? "")
    .split(/[,;]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}

/** "TRUE"/"FALSE"/true/false/1/0/""/undefined -> boolean, con default configurable. */
function toBool(value, defaultValue) {
  if (value === "" || value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "si", "sí", "x"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return defaultValue;
}

function toNumber(value) {
  if (value === "" || value === undefined || value === null) return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function readRows() {
  if (!fsSync.existsSync(EXCEL_PATH)) {
    console.error(`No existe ${EXCEL_PATH}.`);
    console.error("Primero corre: npm run scrape");
    process.exit(1);
  }
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[SHEET_NAME] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    console.error(`El Excel no tiene ninguna hoja legible.`);
    process.exit(1);
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

async function main() {
  await fs.mkdir(PRODUCTS_DIR, { recursive: true });
  const rows = readRows();

  let written = 0;
  let removed = 0;
  let skipped = 0;
  const warnings = [];

  for (const row of rows) {
    const codigo = String(row.codigo ?? "").trim();
    const filename = codigo ? `${PREFIX}${sanitizeForFilename(codigo)}.json` : null;
    const filepath = filename ? path.join(PRODUCTS_DIR, filename) : null;

    if (!codigo) {
      skipped++;
      warnings.push(`Fila sin "codigo" ignorada (nombre: "${row.nombre || "sin nombre"}").`);
      continue;
    }

    const publicar = toBool(row.publicar, true);
    const en_proveedor = toBool(row.en_proveedor, true);

    if (!publicar || !en_proveedor ) {
      if (filepath && fsSync.existsSync(filepath)) {
        await fs.unlink(filepath);
        removed++;
        console.log(`  despublicado: ${filename}`);
      }
      continue;
    }

    const nombre = String(row.nombre ?? "").trim();
    if (!nombre) {
      skipped++;
      warnings.push(`Fila "${codigo}" sin "nombre", se salta.`);
      continue;
    }

    let precio = toNumber(row.precio_venta);
    let precio_mayorista = toNumber(row.precio_mayorista);
    let precio_oferta = toNumber(row.precio_oferta);
    let porcentaje_oferta = getDiscountPercent(precio, precio_oferta);

    if (precio === precio_mayorista) {
      skipped++;
      warnings.push(`"${nombre}" (${codigo}): el precio es el mismo del mayorista, se salta.`);
    }

    if (!precio || precio <= 0) {
      skipped++;
      warnings.push(`"${nombre}" (${codigo}): sin precio_venta valido, se salta.`);
      continue;
    }

    const categoria = String(row.categoria ?? "").trim() || "Otros";
    const imagen = String(row.imagen ?? "").trim();
    if (!imagen) {
      warnings.push(`"${nombre}" (${codigo}): sin imagen, se usara el placeholder por defecto.`);
    }
    const imagenes = parseImageList(row.imagenes);
    const descripcion = String(row.descripcion ?? "").trim() || nombre;

    const product = {
      name: nombre,
      price: precio,
      salePrice: precio_oferta,
      discountPercentage: porcentaje_oferta,
      category: categoria,
      description: descripcion,
      featured: toBool(row.destacado, false),
      weeklyDeal: toBool(row.promo_semanal, false),
      inStock: toBool(row.disponible, true),
      imageAlt: nombre,
    };
    if (imagen) product.image = imagen;
    // Si "imagenes" trae mas de una foto, esas son las que arman el
    // carousel del producto. Si viene vacia o con una sola URL igual a la
    // portada, no hace falta guardar el array (el carousel cae de vuelta a
    // mostrar solo `image`).
    if (imagenes.length > 1) product.images = imagenes;

    await fs.writeFile(filepath, JSON.stringify(product, null, 2) + "\n", "utf8");
    written++;
  }

  console.log("");
  console.log("Import terminado:");
  console.log(`  Escritos/actualizados: ${written}`);
  console.log(`  Despublicados:         ${removed}`);
  console.log(`  Saltados:               ${skipped}`);
  if (warnings.length > 0) {
    console.log("");
    console.log(`Avisos (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  console.log("");
  console.log("Ahora corre: npm run build (o npm run dev) para ver los cambios.");
}

main().catch((err) => {
  console.error("Error corriendo el import:", err);
  process.exit(1);
});
