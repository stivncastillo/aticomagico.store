import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const products = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/products" }),
  schema: z.object({
    name: z.string(),
    price: z.number().positive(),
    compareAtPrice: z.number().positive().optional(),
    description: z.string(),
    category: z.string(),
    // Ruta de imagen: por defecto usamos un placeholder.
    // Cuando tengas fotos reales, ponlas en /public/images/productos/
    // y cambia este valor a algo como "/images/productos/mi-producto.jpg"
    image: z.string().default("https://placehold.co/600x600/1a1a1a/ffffff?text=Atico+Magico"),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    inStock: z.boolean().default(true),
  }),
});

export const collections = { products };
