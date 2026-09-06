import { PUBLIC_WHATSAPP_NUMBER } from "astro:env/client";
import { siteConfig } from "./config";

/**
 * Construye un link de WhatsApp (wa.me) con un mensaje pre-armado.
 * El numero se toma de la variable de entorno PUBLIC_WHATSAPP_NUMBER
 * (ver .env / .env.example) y debe ir sin "+" ni espacios, ej: 573001234567
 */
export function buildWhatsAppLink(message: string, phone: string = PUBLIC_WHATSAPP_NUMBER) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

export function productWhatsAppMessage(productName: string) {
  return `Hola! Vi "${productName}" en el catalogo de ${siteConfig.name} y quiero comprarlo. ¿Sigue disponible?`;
}

export function generalWhatsAppMessage() {
  return `Hola! Quiero saber mas sobre los productos de ${siteConfig.name}.`;
}
