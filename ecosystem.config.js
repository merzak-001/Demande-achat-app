module.exports = {
  apps: [
    {
      name: "demande-achat-app",
      script: "./backend/server.js",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 2000,
        DB_SERVER: "192.168.1.253",
        DB_NAME: "DemandeAchatDB",
        DB_USER: "sa",
        DB_PASSWORD: "0000"
      }
    }
  ]
};
