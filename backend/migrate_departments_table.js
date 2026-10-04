const sql = require('mssql/msnodesqlv8');
const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

const DEFAULT_DEPARTMENTS = [
  'Achats',
  'Informatique',
  'Production',
  'Maintenance',
  'RH',
  'Finance',
  'Appro',
  'Logistique'
];

async function migrateDepartments(pool, dbLabel) {
  console.log(`\n⏳ Creating dbo.Departments table in [${dbLabel}]...`);

  await pool.request().query(`
    IF OBJECT_ID('dbo.Departments', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Departments (
        DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentName NVARCHAR(100) NOT NULL UNIQUE,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      );
    END
  `);

  console.log(`Seeding default departments in [${dbLabel}]...`);
  for (const dept of DEFAULT_DEPARTMENTS) {
    await pool.request()
      .input('DepartmentName', sql.NVarChar(100), dept)
      .query(`
        IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = @DepartmentName)
        BEGIN
          INSERT INTO dbo.Departments (DepartmentName) VALUES (@DepartmentName);
        END
      `);
  }

  console.log(`✅ dbo.Departments created and seeded in [${dbLabel}].`);
}

async function run() {
  console.log('🚀 Starting Departments Feature Database Migration...');

  // 1. Remote Server (192.168.1.253)
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
    await migrateDepartments(remotePool, `REMOTE SERVER: ${SERVER_IP}`);
    await remotePool.close();
  } catch (err) {
    console.error('⚠️ Remote departments migration error:', err.message);
  }

  // 2. Local SQL Server (localhost\SQLEXPRESS)
  try {
    const localConfig = {
      server: 'localhost\\SQLEXPRESS',
      database: DB_NAME,
      options: { encrypt: false, trustServerCertificate: true, trustedConnection: true },
      connectionTimeout: 15000,
      requestTimeout: 30000,
    };
    const localPool = await pureSql.connect(localConfig);
    await migrateDepartments(localPool, 'LOCAL SERVER: localhost\\SQLEXPRESS');
    await localPool.close();
  } catch (err) {
    console.log('Info for local DB:', err.message);
  }

  console.log('\n🎉 Migration completed for Departments table!');
}

run();
