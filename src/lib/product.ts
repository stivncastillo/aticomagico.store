export function getDiscountPercent(price: number | null, salePrice: number | null) {
  if (!price || price <= 0 || salePrice == null || salePrice >= price) return 0;
  return Math.ceil(((price - salePrice) / price) * 100);
}

/**
 * Devuelve `count` elementos al azar de `items`, sin repetir (Fisher-Yates
 * sobre una copia, no muta el array original). Si `items` tiene menos de
 * `count`, devuelve todos los que haya, igual de mezclados.
 *
 * Ojo: el sitio es estatico (Astro build), asi que "al azar" es al azar en
 * CADA build/deploy, no en cada visita de un mismo usuario - si no se
 * vuelve a generar el sitio, todos los visitantes ven la misma seleccion
 * hasta el proximo build.
 */
export function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
