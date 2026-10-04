const sql = require('mssql');
require('dotenv').config();

const server   = (process.env.DB_SERVER || '192.168.1.253').trim();
const database = (process.env.DB_NAME   || 'DemandeAchatDB').trim();
const dbUser   = (process.env.DB_USER   || 'sa').trim();
const dbPass   = (process.env.DB_PASSWORD || '0000').trim();

const dbConfig = {
  server: server,
  database: database,
  user: dbUser,
  password: dbPass,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
  requestTimeout:    30000,
};

let poolPromise = null;

const getPool = async () => {
  if (poolPromise) return poolPromise;

  poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
      console.log(`✅ Connected to SQL Server (${server}) → [${database}] via SQL User '${dbUser}'`);
      return pool;
    })
    .catch(err => {
      console.error('❌ SQL Server connection failed:', err.message);
      poolPromise = null;
      throw err;
    });

  return poolPromise;
};

module.exports = { sql, getPool };
