import { PUBLIC_WHATSAPP_NUMBER } from "astro:env/client";
import { siteConfig } from "./config";

export interface CartItem {
  slug: string;
  name: string;
  price: number;
  image: string;
  qty: number;
}

/** Datos del cliente que se piden antes de mandar el pedido por WhatsApp. */
export interface CustomerInfo {
  name: string;
  email: string;
  address: string;
  city: string;
}

type CartProduct = Omit<CartItem, "qty">;

const STORAGE_KEY = "el-paquetote:cart";
const isBrowser = typeof window !== "undefined";

let cartState: CartItem[] = [];
const listeners = new Set<() => void>();

function readFromStorage(): CartItem[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.slug === "string" &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        typeof item.qty === "number" &&
        item.qty > 0
    );
  } catch {
    // localStorage no disponible o datos corruptos: seguimos con carrito vacio.
    return [];
  }
}

function writeToStorage(items: CartItem[]) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Modo privado, cuota llena, etc. El carrito sigue funcionando en
    // memoria durante la sesion actual aunque no persista.
  }
}

function notify() {
  for (const listener of listeners) listener();
}

function setState(items: CartItem[]) {
  cartState = items;
  writeToStorage(items);
  notify();
}

if (isBrowser) {
  cartState = readFromStorage();
  // Si el carrito cambia en otra pestaña del mismo navegador, nos enteramos.
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      cartState = readFromStorage();
      notify();
    }
  });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): CartItem[] {
  return cartState;
}

const EMPTY_CART: CartItem[] = [];
export function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

export function addToCart(product: CartProduct, qty = 1) {
  const existing = cartState.find((item) => item.slug === product.slug);
  const next = existing
    ? cartState.map((item) =>
        item.slug === product.slug ? { ...item, qty: item.qty + qty } : item
      )
    : [...cartState, { ...product, qty }];
  setState(next);
}

export function setQty(slug: string, qty: number) {
  if (qty <= 0) {
    removeFromCart(slug);
    return;
  }
  setState(cartState.map((item) => (item.slug === slug ? { ...item, qty } : item)));
}

export function removeFromCart(slug: string) {
  setState(cartState.filter((item) => item.slug !== slug));
}

export function clearCart() {
  setState([]);
}

export function getCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function getCartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency: siteConfig.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Arma el link de wa.me con el detalle del pedido completo del carrito.
 * Si se pasan los datos del cliente (nombre, correo, direccion, ciudad -
 * pedidos en el formulario de checkout del carrito), se agregan al final
 * del mensaje para que el envio se pueda coordinar sin ida y vuelta.
 */
export function buildCartWhatsAppLink(items: CartItem[], customer?: CustomerInfo) {
  const lines = items.map(
    (item, i) => `${i + 1}. ${item.name} x${item.qty} - ${formatPrice(item.price * item.qty)}`
  );
  const total = getCartTotal(items);
  const messageParts = [
    `Hola! Quiero hacer este pedido de ${siteConfig.name}:`,
    "",
    ...lines,
    "",
    `Total: ${formatPrice(total)}`,
  ];

  if (customer) {
    messageParts.push(
      "",
      "Datos de envio:",
      `Nombre: ${customer.name}`,
      `Correo: ${customer.email}`,
      `Direccion: ${customer.address}`,
      `Ciudad: ${customer.city}, Colombia`
    );
  }

  const message = messageParts.join("\n");
  return `https://wa.me/${PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
