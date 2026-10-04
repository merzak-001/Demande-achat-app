const sql = require('mssql/msnodesqlv8');
const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function migratePreserveUserData(pool, dbLabel) {
  console.log(`\n⏳ Applying Deleted User Data Preservation Migration to [${dbLabel}]...`);

  // 1. Add RequesterName column to dbo.PurchaseRequests if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.PurchaseRequests') AND name = 'RequesterName'
    )
    BEGIN
      ALTER TABLE dbo.PurchaseRequests ADD RequesterName NVARCHAR(100) NULL;
      PRINT 'Added RequesterName column to dbo.PurchaseRequests';
    END
  `);

  // 2. Populate RequesterName for existing purchase requests
  await pool.request().query(`
    UPDATE pr 
    SET pr.RequesterName = u.FullName 
    FROM dbo.PurchaseRequests pr 
    JOIN dbo.Users u ON pr.RequesterID = u.UserID 
    WHERE pr.RequesterName IS NULL;
  `);

  // 3. Make RequesterID NULLABLE in dbo.PurchaseRequests
  await pool.request().query(`
    ALTER TABLE dbo.PurchaseRequests ALTER COLUMN RequesterID INT NULL;
  `);

  // 4. Make UploadedByID NULLABLE in dbo.Attachments if exists
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Attachments') AND name = 'UploadedByID')
    BEGIN
      ALTER TABLE dbo.Attachments ALTER COLUMN UploadedByID INT NULL;
    END
  `);

  // 5. Make ChangedByID NULLABLE in dbo.StatusHistory if exists
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StatusHistory') AND name = 'ChangedByID')
    BEGIN
      ALTER TABLE dbo.StatusHistory ALTER COLUMN ChangedByID INT NULL;
    END
  `);

  // 6. Update FK_PurchaseRequests_Users to ON DELETE SET NULL
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PurchaseRequests_Users')
    BEGIN
      ALTER TABLE dbo.PurchaseRequests DROP CONSTRAINT FK_PurchaseRequests_Users;
    END

    ALTER TABLE dbo.PurchaseRequests ADD CONSTRAINT FK_PurchaseRequests_Users 
    FOREIGN KEY (RequesterID) REFERENCES dbo.Users(UserID) ON DELETE SET NULL;
  `);

  // 7. Update FK_Attachments_Users to ON DELETE SET NULL
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Attachments_Users')
    BEGIN
      ALTER TABLE dbo.Attachments DROP CONSTRAINT FK_Attachments_Users;
    END

    ALTER TABLE dbo.Attachments ADD CONSTRAINT FK_Attachments_Users 
    FOREIGN KEY (UploadedByID) REFERENCES dbo.Users(UserID) ON DELETE SET NULL;
  `);

  // 8. Update FK_StatusHistory_Users to ON DELETE SET NULL
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StatusHistory_Users')
    BEGIN
      ALTER TABLE dbo.StatusHistory DROP CONSTRAINT FK_StatusHistory_Users;
    END

    ALTER TABLE dbo.StatusHistory ADD CONSTRAINT FK_StatusHistory_Users 
    FOREIGN KEY (ChangedByID) REFERENCES dbo.Users(UserID) ON DELETE SET NULL;
  `);

  console.log(`✅ Deleted user data preservation schema applied successfully to [${dbLabel}].`);
}

async function run() {
  console.log('🚀 Starting Deleted User Data Preservation Migration...');

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
    await migratePreserveUserData(remotePool, `REMOTE SERVER: ${SERVER_IP}`);
    await remotePool.close();
  } catch (err) {
    console.error('⚠️ Remote migration error:', err.message);
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
    await migratePreserveUserData(localPool, 'LOCAL SERVER');
    await localPool.close();
  } catch (err) {
    console.log('Info for local DB:', err.message);
  }

  console.log('\n🎉 Deleted User Data Preservation Migration Completed!');
}

run();
