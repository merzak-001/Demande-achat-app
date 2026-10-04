const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function run() {
  console.log('🚀 Altering CurrentStatus and StatusHistory column lengths to NVARCHAR(100)...');
  try {
    const pool = await pureSql.connect({
      user: SERVER_USER,
      password: SERVER_PASS,
      server: SERVER_IP,
      database: DB_NAME,
      options: { encrypt: false, trustServerCertificate: true },
    });

    console.log('Altering dbo.PurchaseRequests.CurrentStatus to NVARCHAR(100)...');
    await pool.request().query(`
      ALTER TABLE dbo.PurchaseRequests ALTER COLUMN CurrentStatus NVARCHAR(100) NOT NULL;
    `);

    console.log('Altering dbo.StatusHistory.PreviousStatus and NewStatus to NVARCHAR(100)...');
    await pool.request().query(`
      ALTER TABLE dbo.StatusHistory ALTER COLUMN PreviousStatus NVARCHAR(100) NULL;
      ALTER TABLE dbo.StatusHistory ALTER COLUMN NewStatus NVARCHAR(100) NOT NULL;
    `);

    console.log('✅ Columns updated successfully to NVARCHAR(100)!');
    await pool.close();
  } catch (err) {
    console.error('Error altering column lengths:', err);
  }
}

run();
