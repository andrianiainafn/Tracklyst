// PM2 : serveur Next.js autonome, écoute en local derrière Caddy.
module.exports = {
  apps: [
    {
      name: "tracklyst-web",
      cwd: __dirname + "/.next/standalone",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: "3021",
        HOSTNAME: "127.0.0.1",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      max_memory_restart: "400M",
    },
  ],
};
