const sql = require('mssql/msnodesqlv8');
const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function migrateDatabase(pool, dbLabel) {
  console.log(`\n⏳ Applying Responsable schema migration to [${dbLabel}]...`);

  // Add ManagerID column if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'ManagerID'
    )
    BEGIN
      ALTER TABLE dbo.Users ADD ManagerID INT NULL;
      ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Manager FOREIGN KEY (ManagerID) REFERENCES dbo.Users(UserID);
      PRINT 'Added ManagerID column to dbo.Users';
    END
  `);

  // Add IsResponsable column if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IsResponsable'
    )
    BEGIN
      ALTER TABLE dbo.Users ADD IsResponsable BIT NOT NULL DEFAULT 0;
      PRINT 'Added IsResponsable column to dbo.Users';
    END
  `);

  console.log(`✅ Schema migration successfully applied to [${dbLabel}].`);
}

async function run() {
  console.log('🚀 Starting Responsable Feature Database Migration...');

  // 1. Migrate Remote Server DB (192.168.1.253)
  try {
    const remoteConfig = {
      user: SERVER_USER,
      password: SERVER_PASS,
      server: SERVER_IP,
      database: DB_NAME,
      options: { encrypt: false, trustServerCertificate: true },
      connectionTimeout: 15000,
      requestTimeout: 30000,
    };
    const remotePool = await pureSql.connect(remoteConfig);
    await migrateDatabase(remotePool, `REMOTE SERVER: ${SERVER_IP}`);
    await remotePool.close();
  } catch (err) {
    console.error('⚠️ Remote database migration failed:', err.message);
  }

  // 2. Migrate Local SQL Server DB (localhost\SQLEXPRESS)
  try {
    const localConfig = {
      server: 'localhost\\SQLEXPRESS',
      database: DB_NAME,
      options: { encrypt: false, trustServerCertificate: true, trustedConnection: true },
      connectionTimeout: 15000,
      requestTimeout: 30000,
    };
    const localPool = await pureSql.connect(localConfig);
    await migrateDatabase(localPool, 'LOCAL SERVER: localhost\\SQLEXPRESS');
    await localPool.close();
  } catch (err) {
    console.log('Info for local DB:', err.message);
  }

  console.log('\n🎉 Migration process completed!');
}

run();
