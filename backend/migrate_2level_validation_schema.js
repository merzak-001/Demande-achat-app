const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function migrateDatabase(pool, dbLabel) {
  console.log(`\n⏳ Applying 2-Level Validation Schema Migration to [${dbLabel}]...`);

  // 1. Add DirectorCode column to dbo.Departments if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.Departments') AND name = 'DirectorCode'
    )
    BEGIN
      ALTER TABLE dbo.Departments ADD DirectorCode NVARCHAR(10) NULL;
      PRINT 'Added DirectorCode column to dbo.Departments';
    END
  `);

  // 2. Add TargetDirectorCode column to dbo.PurchaseRequests if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.PurchaseRequests') AND name = 'TargetDirectorCode'
    )
    BEGIN
      ALTER TABLE dbo.PurchaseRequests ADD TargetDirectorCode NVARCHAR(10) NULL;
      PRINT 'Added TargetDirectorCode column to dbo.PurchaseRequests';
    END
  `);

  // 3. Seed default DirectorCode mapping for existing departments if null
  await pool.request().query(`
    UPDATE dbo.Departments SET DirectorCode = 'DP' WHERE (DirectorCode IS NULL OR DirectorCode = '') AND (DepartmentName LIKE '%Prod%' OR DepartmentName LIKE '%Usine%' OR DepartmentName LIKE '%Fabr%');
    UPDATE dbo.Departments SET DirectorCode = 'DC' WHERE (DirectorCode IS NULL OR DirectorCode = '') AND (DepartmentName LIKE '%Comm%' OR DepartmentName LIKE '%Vent%' OR DepartmentName LIKE '%Mark%');
    UPDATE dbo.Departments SET DirectorCode = 'DFC' WHERE (DirectorCode IS NULL OR DirectorCode = '') AND (DepartmentName LIKE '%Finan%' OR DepartmentName LIKE '%Comp%' OR DepartmentName LIKE '%Gestion%');
    UPDATE dbo.Departments SET DirectorCode = 'DRH' WHERE (DirectorCode IS NULL OR DirectorCode = '') AND (DepartmentName LIKE '%RH%' OR DepartmentName LIKE '%Res%');
    UPDATE dbo.Departments SET DirectorCode = 'DG' WHERE (DirectorCode IS NULL OR DirectorCode = '') AND (DepartmentName LIKE '%Dir%' OR DepartmentName LIKE '%Gen%');
    UPDATE dbo.Departments SET DirectorCode = 'DP' WHERE DirectorCode IS NULL OR DirectorCode = '';
  `);

  console.log(`✅ Migration complete for [${dbLabel}]`);
}

async function run() {
  console.log('🚀 Migration script starting...');

  // 1. Migrate Local SQL Express DB
  const localConfig = {
    user: SERVER_USER,
    password: SERVER_PASS,
    server: 'localhost',
    database: DB_NAME,
    options: { encrypt: false, trustServerCertificate: true },
    port: 1433
  };

  try {
    const localPool = await new pureSql.ConnectionPool(localConfig).connect();
    await migrateDatabase(localPool, 'Local SQL Express');
    await localPool.close();
  } catch (err) {
    console.error('Local DB Migration error:', err.message);
  }

  // 2. Migrate Remote Server DB
  const remoteConfig = {
    user: SERVER_USER,
    password: SERVER_PASS,
    server: SERVER_IP,
    database: DB_NAME,
    options: { encrypt: false, trustServerCertificate: true },
    port: 1433
  };

  try {
    const remotePool = await new pureSql.ConnectionPool(remoteConfig).connect();
    await migrateDatabase(remotePool, `Remote DB ${SERVER_IP}`);
    await remotePool.close();
  } catch (err) {
    console.error('Remote DB Migration error:', err.message);
  }

  console.log('\n🎉 All migrations completed successfully!');
  process.exit(0);
}

run();
