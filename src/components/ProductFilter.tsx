import { useEffect, useMemo, useRef, useState } from "react";
import AddToCartButton from "@/components/cart/AddToCartButton";

export interface ProductItem {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  imageAlt?: string;
  category: string;
  inStock: boolean;
}

interface Props {
  products: ProductItem[];
  locale: string;
  currency: string;
}

const PAGE_SIZE = 24;

function formatPrice(value: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductFilter({ products, locale, currency }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Todos");
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ["Todos", ...unique];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = category === "Todos" || p.category === category;
      const matchesQuery = p.name
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  // Cada vez que cambia la busqueda o la categoria, volvemos a la primera pagina.
  useEffect(() => {
    setPage(1);
  }, [query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Si el filtro deja menos paginas que la actual (ej: se borro un producto
  // de la ultima pagina), no nos quedamos varados en una pagina vacia.
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  function goToPage(next: number) {
    const clamped = Math.min(Math.max(next, 1), totalPages);
    setPage(clamped);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={topRef}>
      <div className="flex flex-col gap-4 sm:flex-col sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="¿Que se te antoja hoy?"
          className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400"
        />

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                (category === cat
                  ? "bg-ink-900 text-white"
                  : "bg-black/5 text-ink-700 hover:bg-black/10")
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-ink-700">
          No encontramos nada asi. Prueba con otra palabra.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-700">
            {filtered.length} producto{filtered.length === 1 ? "" : "s"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {paginated.map((product) => (
              <article
                key={product.slug}
                className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:shadow-md"
              >
                <a
                  href={`/producto/${product.slug}`}
                  className="relative block aspect-square overflow-hidden bg-black/5"
                >
                  <img
                    src={product.image}
                    alt={product.imageAlt || product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {!product.inStock && (
                    <span className="absolute left-3 top-3 rounded-full bg-ink-900/90 px-3 py-1 text-xs font-semibold text-white">
                      Agotado
                    </span>
                  )}
                </a>
                <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4 justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-brand-600">
                      {product.category}
                    </p>
                    <a
                      href={`/producto/${product.slug}`}
                      className="text-sm font-semibold text-ink-900 hover:text-brand-600 sm:text-base"
                    >
                      {product.name}
                    </a>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-bold text-ink-900">
                        {formatPrice(product.price, locale, currency)}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-xs text-ink-700 line-through">
                          {formatPrice(
                            product.compareAtPrice,
                            locale,
                            currency,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <AddToCartButton product={product} variant="block" />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Paginacion del catalogo"
              className="mt-10 flex items-center justify-center gap-4"
            >
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-black/5"
              >
                ← Anterior
              </button>

              <span className="text-sm font-medium text-ink-700">
                Pagina {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-black/5"
              >
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
