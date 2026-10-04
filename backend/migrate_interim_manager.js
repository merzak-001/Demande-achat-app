const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function migrateDatabase(pool, dbLabel) {
  console.log(`\n⏳ Applying InterimManagerID migration to [${dbLabel}]...`);

  // Add InterimManagerID column if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'InterimManagerID'
    )
    BEGIN
      ALTER TABLE dbo.Users ADD InterimManagerID INT NULL;
      ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_InterimManager FOREIGN KEY (InterimManagerID) REFERENCES dbo.Users(UserID);
      PRINT 'Added InterimManagerID column to dbo.Users';
    END
  `);

  console.log(`✅ Schema migration successfully applied to [${dbLabel}].`);
}

async function run() {
  console.log('🚀 Starting Interim Manager (Delegation) Database Migration...');

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

  console.log('\n🎉 Migration process completed!');
}

run();
