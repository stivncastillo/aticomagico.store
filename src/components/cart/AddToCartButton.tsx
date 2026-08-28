import { useEffect, useRef, useState } from "react";
import { addToCart } from "@/lib/cart";
import { BagIcon, CheckIcon, MinusIcon, PlusIcon } from "./icons";

export interface CartProductInput {
  slug: string;
  name: string;
  price: number;
  image: string;
  inStock: boolean;
}

interface Props {
  product: CartProductInput;
  variant?: "compact" | "full" | "block";
}

export default function AddToCartButton({ product, variant = "compact" }: Props) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  function handleAdd() {
    if (!product.inStock) return;
    addToCart(
      { slug: product.slug, name: product.name, price: product.price, image: product.image },
      variant === "full" ? qty : 1
    );
    setJustAdded(true);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setJustAdded(false), 1500);
    if (variant === "full") setQty(1);
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={!product.inStock}
        aria-label={`Agregar ${product.name} al carrito`}
        title="Agregar al carrito"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-900/10 bg-white text-ink-900 transition hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40"
      >
        {justAdded ? <CheckIcon className="h-4 w-4 text-brand-600" /> : <BagIcon className="h-4 w-4" />}
      </button>
    );
  }

  // "block": boton de ancho completo con texto, para reemplazar el viejo
  // "Comprar" directo en el grid del catalogo - ahora todo pasa por el
  // carrito.
  if (variant === "block") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={!product.inStock}
        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-40 sm:text-sm"
      >
        {justAdded ? <CheckIcon className="h-4 w-4" /> : <BagIcon className="h-4 w-4" />}
        {justAdded ? "Agregado" : "Agregar"}
      </button>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex items-center rounded-full border border-ink-900/10">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Restar cantidad"
          className="flex h-10 w-10 items-center justify-center text-ink-700 transition hover:text-brand-600"
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-semibold text-ink-900">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => q + 1)}
          aria-label="Sumar cantidad"
          className="flex h-10 w-10 items-center justify-center text-ink-700 transition hover:text-brand-600"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!product.inStock}
        className="btn-secondary flex-1 disabled:pointer-events-none disabled:opacity-40"
      >
        {justAdded ? <CheckIcon className="h-4 w-4 text-brand-600" /> : <BagIcon className="h-4 w-4" />}
        {justAdded ? "Agregado" : "Agregar al carrito"}
      </button>
    </div>
  );
}
