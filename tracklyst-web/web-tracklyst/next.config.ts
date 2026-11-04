import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serveur Node autonome (.next/standalone) pour l'hébergement sur notre serveur.
  output: "standalone",
  // L'app web est désormais l'app mobile publiée pour le navigateur (Expo Web,
  // servie par Caddy sous /app) : les anciennes adresses y mènent.
  async redirects() {
    const to = (source: string, destination: string) => ({ source, destination, permanent: false });
    return [
      to("/login", "/app/login"),
      to("/dashboard", "/app"),
      to("/transactions/new", "/app/add-transaction"),
      to("/transactions/:path*", "/app/transactions"),
      to("/goals/:path*", "/app/goals"),
      to("/accounts/:path*", "/app/accounts"),
      to("/budgets/share", "/app/share-budget"),
      to("/budgets/join", "/app/join-budget"),
      to("/budgets/:path*", "/app"),
      to("/limits", "/app/monthly-limits"),
      to("/subscriptions/:path*", "/app/subscriptions"),
      to("/profile", "/app/profile"),
    ];
  },
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
