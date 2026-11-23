import { getActiveSellerWhatsApp } from "./sellers";
import { siteConfig } from "./config";

/**
 * Construye un link de WhatsApp (wa.me) con un mensaje pre-armado.
 * El numero, si no se pasa explicito, se resuelve dinamicamente segun el
 * vendedor activo del visitante (ver sellers.ts) - o el numero oficial
 * (PUBLIC_WHATSAPP_NUMBER) si no hay ninguno. El numero va sin "+" ni
 * espacios, ej: 573001234567
 */
export function buildWhatsAppLink(message: string, phone: string = getActiveSellerWhatsApp()) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

export function productWhatsAppMessage(productName: string) {
  return `Hola! Vi "${productName}" en el catalogo de ${siteConfig.name} y quiero comprarlo. ¿Sigue disponible?`;
}

export function generalWhatsAppMessage() {
  return `Hola! Quiero saber mas sobre los productos de ${siteConfig.name}.`;
}
