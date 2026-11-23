// Slides del carousel del hero (la seccion grande arriba del home).
// Para agregar un slide nuevo: poné la imagen en src/assets/, importala
// aca arriba y agregá un objeto al array `heroSlides`. El orden del
// array es el orden en que aparecen.
import type { ImageMetadata } from "astro";
import heroImage from "@/assets/hero.png";
import hero2Image from "@/assets/hero2.png";

export interface HeroSlide {
  image: ImageMetadata;
  alt: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export const heroSlides: HeroSlide[] = [
  {
    image: heroImage,
    alt: "Cosas que necesitas. Tú todavía no lo sabes.",
    title: "Cosas que necesitas. Tú todavía no lo sabes.",
    description:
      "Aquí no vendemos cosas, armamos antojos. Mira, escoge, y te lo mandamos directo a tu casa. Fácil, rápido, sin culpa.",
    ctaLabel: "Ver catálogo",
    ctaHref: "/catalogo",
  },
  {
    image: hero2Image,
    alt: "Ofertas nuevas cada semana",
    title: "Ofertas nuevas cada semana",
    description:
      "Marcamos descuentos y armamos una selección distinta semana a semana. Dale un vistazo, seguro hay algo con tu nombre.",
    ctaLabel: "Ver ofertas",
    ctaHref: "/ofertas",
  },
];
