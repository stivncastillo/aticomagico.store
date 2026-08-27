import { useMemo, useState } from "react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { PUBLIC_WHATSAPP_NUMBER } from "astro:env/client";

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

function formatPrice(value: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function whatsappLink(name: string) {
  const message = `Hola! Vi "${name}" en el catalogo de Atico Magico y quiero comprarlo. ¿Sigue disponible?`;
  return `https://wa.me/${PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function ProductFilter({ products, locale, currency }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Todos");

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

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400 sm:max-w-xs"
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
          No encontramos productos con esa busqueda.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {filtered.map((product) => (
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
              <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
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
                      {formatPrice(product.compareAtPrice, locale, currency)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={whatsappLink(product.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 sm:text-sm" +
                      (!product.inStock ? " pointer-events-none opacity-40" : "")
                    }
                  >
                    Comprar
                  </a>
                  <AddToCartButton product={product} variant="compact" />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
