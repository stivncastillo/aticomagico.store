import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  buildCartWhatsAppLink,
  clearCart,
  formatPrice,
  getCartCount,
  getCartTotal,
  getServerSnapshot,
  getSnapshot,
  removeFromCart,
  setQty,
  subscribe,
} from "@/lib/cart";
import { BagIcon, MinusIcon, PlusIcon, TrashIcon, XIcon } from "./icons";

export default function CartWidget() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const count = getCartCount(items);
  const total = getCartTotal(items);

  // Bloquea el scroll del fondo mientras el panel esta abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleCheckout() {
    if (items.length === 0) return;
    const link = buildCartWhatsAppLink(items);
    const win = window.open(link, "_blank", "noopener,noreferrer");
    // Solo vaciamos el carrito si el link realmente se abrio (evita perder
    // el pedido si el navegador bloqueo el popup).
    if (win) {
      clearCart();
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver carrito"
        className="relative text-ink-700 transition hover:text-brand-600"
      >
        <BagIcon className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar carrito"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />

          <aside className="absolute right-0 top-0 bottom-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/5 p-4">
              <p className="font-bold text-ink-900">
                Tu carrito{count > 0 ? ` (${count})` : ""}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar carrito"
                className="text-ink-700 transition hover:text-brand-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <p className="mt-10 text-center text-sm text-ink-700">
                  Tu carrito esta vacio. Agrega productos desde el catalogo.
                </p>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.slug} className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                      <div className="flex flex-1 flex-col">
                        <p className="text-sm font-semibold text-ink-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-ink-700">
                          {formatPrice(item.price)} c/u
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-ink-900/10">
                            <button
                              type="button"
                              onClick={() => setQty(item.slug, item.qty - 1)}
                              aria-label={`Restar ${item.name}`}
                              className="flex h-7 w-7 items-center justify-center text-ink-700 transition hover:text-brand-600"
                            >
                              <MinusIcon className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-semibold text-ink-900">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(item.slug, item.qty + 1)}
                              aria-label={`Sumar ${item.name}`}
                              className="flex h-7 w-7 items-center justify-center text-ink-700 transition hover:text-brand-600"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.slug)}
                            aria-label={`Quitar ${item.name} del carrito`}
                            className="text-ink-700 transition hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-black/5 p-4">
                <div className="flex items-center justify-between text-sm font-semibold text-ink-900">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="btn-whatsapp mt-4 w-full"
                >
                  <BagIcon className="h-4 w-4" />
                  Finalizar por WhatsApp
                </button>

                <button
                  type="button"
                  onClick={clearCart}
                  className="mt-2 w-full text-center text-xs text-ink-700 transition hover:text-red-600"
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </aside>
          </div>,
          document.body
        )}
    </>
  );
}
