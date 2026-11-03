import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serveur Node autonome (.next/standalone) pour l'hébergement sur notre serveur.
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
