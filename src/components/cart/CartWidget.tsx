import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { CustomerInfo } from "@/lib/cart";
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
import { ArrowLeftIcon, BagIcon, MinusIcon, PlusIcon, TrashIcon, XIcon } from "./icons";

const EMPTY_CUSTOMER: CustomerInfo = { name: "", email: "", address: "", city: "" };

export default function CartWidget() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  // "cart": viendo/editando los productos. "form": pidiendo los datos de
  // envio antes de mandar el pedido por WhatsApp (ya no se compra 1 solo
  // producto directo, todo pasa por aca).
  const [step, setStep] = useState<"cart" | "form">("cart");
  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY_CUSTOMER);
  const [formError, setFormError] = useState<string | null>(null);
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

  // Cada vez que se abre el carrito arrancamos siempre en el paso de
  // productos, nunca a mitad del formulario de una vez anterior.
  useEffect(() => {
    if (open) setStep("cart");
  }, [open]);

  function handleGoToForm() {
    if (items.length === 0) return;
    setFormError(null);
    setStep("form");
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();

    const name = customer.name.trim();
    const email = customer.email.trim();
    const address = customer.address.trim();
    const city = customer.city.trim();

    if (!name || !email || !address || !city) {
      setFormError("Completa nombre, correo, direccion y ciudad para continuar.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setFormError("Revisa el correo, no parece valido.");
      return;
    }

    setFormError(null);
    const link = buildCartWhatsAppLink(items, { name, email, address, city });
    const win = window.open(link, "_blank", "noopener,noreferrer");
    // Solo vaciamos el carrito y cerramos si el link realmente se abrio
    // (evita perder el pedido si el navegador bloqueo el popup).
    if (win) {
      clearCart();
      setCustomer(EMPTY_CUSTOMER);
      setStep("cart");
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver mi paquetote"
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
            aria-label="Cerrar paquetote"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />

          <aside className="absolute right-0 top-0 bottom-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/5 p-4">
              {step === "form" ? (
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  aria-label="Volver al paquetote"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900 transition hover:text-brand-600"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Tu paquetote
                </button>
              ) : (
                <p className="font-bold text-ink-900">
                  Tu paquetote{count > 0 ? ` (${count})` : ""}
                </p>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar paquetote"
                className="text-ink-700 transition hover:text-brand-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {step === "cart" ? (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {items.length === 0 ? (
                    <p className="mt-10 text-center text-sm text-ink-700">
                      Tu paquetote esta esperando que lo llenes. No lo hagas sufrir.
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
                      onClick={handleGoToForm}
                      className="btn-whatsapp mt-4 w-full"
                    >
                      <BagIcon className="h-4 w-4" />
                      Armar mi paquetote
                    </button>

                    <button
                      type="button"
                      onClick={clearCart}
                      className="mt-2 w-full text-center text-xs text-ink-700 transition hover:text-red-600"
                    >
                      Vaciar paquetote
                    </button>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSubmitForm} className="flex flex-1 flex-col overflow-y-auto p-4">
                <p className="text-sm text-ink-700">
                  Con estos datos armamos tu paquetote y coordinamos el envio por WhatsApp.
                </p>

                <div className="mt-4 flex flex-1 flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm font-medium text-ink-900">
                    Nombre completo
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                      placeholder="Ej: Maria Perez"
                      autoComplete="name"
                      className="rounded-xl border border-black/10 px-3 py-2 text-sm font-normal text-ink-900 outline-none focus:border-brand-400"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-ink-900">
                    Correo electronico
                    <input
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                      placeholder="Ej: maria@correo.com"
                      autoComplete="email"
                      className="rounded-xl border border-black/10 px-3 py-2 text-sm font-normal text-ink-900 outline-none focus:border-brand-400"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-ink-900">
                    Direccion de envio
                    <input
                      type="text"
                      value={customer.address}
                      onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                      placeholder="Calle, numero, barrio, apto..."
                      autoComplete="street-address"
                      className="rounded-xl border border-black/10 px-3 py-2 text-sm font-normal text-ink-900 outline-none focus:border-brand-400"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-ink-900">
                    Ciudad
                    <input
                      type="text"
                      value={customer.city}
                      onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))}
                      placeholder="Ej: Cali"
                      autoComplete="address-level2"
                      className="rounded-xl border border-black/10 px-3 py-2 text-sm font-normal text-ink-900 outline-none focus:border-brand-400"
                    />
                  </label>

                  <p className="text-xs text-ink-700">
                    Por ahora los envios son solo dentro de Colombia.
                  </p>

                  {formError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {formError}
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-black/5 pt-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-ink-900">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>

                  <button type="submit" className="btn-whatsapp mt-4 w-full">
                    <BagIcon className="h-4 w-4" />
                    Enviar mi paquetote por WhatsApp
                  </button>

                  <p className="mt-3 text-center text-[11px] text-ink-700">
                    Al confirmar aceptas nuestros{" "}
                    <a href="/terminos-y-condiciones" className="underline hover:text-brand-600">
                      terminos y condiciones
                    </a>
                    .
                  </p>
                </div>
              </form>
            )}
          </aside>
          </div>,
          document.body
        )}
    </>
  );
}
