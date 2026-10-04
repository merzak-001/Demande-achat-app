const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function migrateDatabase(pool, dbLabel) {
  console.log(`\n⏳ Applying Director Schema Migration to [${dbLabel}]...`);

  // 1. Add DirectorCode column to dbo.Users if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'DirectorCode'
    )
    BEGIN
      ALTER TABLE dbo.Users ADD DirectorCode NVARCHAR(10) NULL;
      PRINT 'Added DirectorCode column to dbo.Users';
    END
  `);

  // 2. Create dbo.SystemSettings table if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('dbo.SystemSettings')
    )
    BEGIN
      CREATE TABLE dbo.SystemSettings (
        SettingKey VARCHAR(100) NOT NULL PRIMARY KEY,
        SettingValue NVARCHAR(500) NOT NULL,
        Description NVARCHAR(500) NULL,
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
      PRINT 'Created dbo.SystemSettings table';
    END
  `);

  // 3. Insert default ENABLE_DIRECTOR_AUTHORIZATION setting if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM dbo.SystemSettings WHERE SettingKey = 'ENABLE_DIRECTOR_AUTHORIZATION'
    )
    BEGIN
      INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Description)
      VALUES ('ENABLE_DIRECTOR_AUTHORIZATION', '0', 'Activer la validation finale par Direction (DP, DC, DFC, DRH, DG)');
      PRINT 'Inserted default ENABLE_DIRECTOR_AUTHORIZATION setting';
    END
  `);

  // 4. Also increase Status column length in Requests table if needed
  await pool.request().query(`
    IF EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.Requests') AND name = 'CurrentStatus' AND max_length < 100
    )
    BEGIN
      ALTER TABLE dbo.Requests ALTER COLUMN CurrentStatus NVARCHAR(100) NOT NULL;
      PRINT 'Updated CurrentStatus length in dbo.Requests';
    END
  `);

  console.log(`✅ Director Migration applied to [${dbLabel}].`);
}

async function run() {
  console.log('🚀 Starting Director Validation Database Migration...');

  // 1. Remote Server DB (192.168.1.253)
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

  // 2. Local SQL Server DB (localhost\SQLEXPRESS)
  try {
    const localConfig = {
      server: 'localhost\\SQLEXPRESS',
      database: DB_NAME,
      options: { encrypt: false, trustServerCertificate: true, trustedConnection: true },
      connectionTimeout: 15000,
      requestTimeout: 30000,
    };
    const localPool = await pureSql.connect(localConfig);
    await migrateDatabase(localPool, 'LOCAL SQLEXPRESS');
    await localPool.close();
  } catch (err) {
    console.error('⚠️ Local SQLEXPRESS migration failed:', err.message);
  }

  console.log('\n🎉 Migration task finished!');
  process.exit(0);
}

run();
