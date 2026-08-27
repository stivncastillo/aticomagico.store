// @ts-check
import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://aticomagico.com",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      PUBLIC_WHATSAPP_NUMBER: envField.string({
        context: "client",
        access: "public",
        default: "573001234567",
      }),
      PUBLIC_SITE_URL: envField.string({
        context: "client",
        access: "public",
        default: "https://aticomagico.com",
      }),
    },
  },
});
