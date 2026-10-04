const sql = require('mssql/msnodesqlv8');
const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function run() {
  console.log(`📡 Connecting to remote server ${SERVER_IP} as ${SERVER_USER}...`);

  // Connection config using mssql pure JS driver or ODBC
  const config = {
    user: SERVER_USER,
    password: SERVER_PASS,
    server: SERVER_IP,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };

  let pool;
  try {
    // Try pure mssql driver first
    pool = await pureSql.connect(config);
    console.log('✅ Connected to master database via pure mssql driver.');
  } catch (err1) {
    console.log('⚠️ Pure mssql driver failed, trying ODBC connection string...');
    const connStr = `Driver={SQL Server};Server=${SERVER_IP};Database=master;Uid=${SERVER_USER};Pwd=${SERVER_PASS};Encrypt=no;`;
    pool = await new sql.ConnectionPool({ connectionString: connStr }).connect();
    console.log('✅ Connected to master database via ODBC driver.');
  }

  // 1. Create database if not exists
  console.log(`Checking if database [${DB_NAME}] exists on ${SERVER_IP}...`);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${DB_NAME}')
    BEGIN
      CREATE DATABASE [${DB_NAME}];
    END
  `);
  console.log(`✅ Database [${DB_NAME}] is ready on ${SERVER_IP}.`);

  await pool.close();

  // 2. Connect to DemandeAchatDB
  console.log(`Connecting directly to [${DB_NAME}] on ${SERVER_IP}...`);
  let dbPool;
  try {
    const dbConfig = { ...config, database: DB_NAME };
    dbPool = await pureSql.connect(dbConfig);
  } catch (e) {
    const dbConnStr = `Driver={SQL Server};Server=${SERVER_IP};Database=${DB_NAME};Uid=${SERVER_USER};Pwd=${SERVER_PASS};Encrypt=no;`;
    dbPool = await new sql.ConnectionPool({ connectionString: dbConnStr }).connect();
  }

  console.log('Building database schema tables...');

  // Create Users table
  await dbPool.request().query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        Password NVARCHAR(100) NOT NULL,
        Department NVARCHAR(100) NOT NULL,
        Role NVARCHAR(50) NOT NULL DEFAULT 'Demandeur',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      );
    END
  `);

  // Create PurchaseRequests table
  await dbPool.request().query(`
    IF OBJECT_ID('dbo.PurchaseRequests', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.PurchaseRequests (
        RequestID INT IDENTITY(1,1) PRIMARY KEY,
        RequestNumber NVARCHAR(60) NOT NULL UNIQUE,
        Type NVARCHAR(20) NOT NULL DEFAULT 'Local',
        RequestDate DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
        RequesterID INT NOT NULL,
        Department NVARCHAR(100) NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        CurrentStatus NVARCHAR(30) NOT NULL DEFAULT 'Brouillon',
        RequiredByDate DATE NULL,
        HasSignedDoc BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_PurchaseRequests_Users FOREIGN KEY (RequesterID) REFERENCES dbo.Users(UserID)
      );
    END
  `);

  // Create RequestItems table
  await dbPool.request().query(`
    IF OBJECT_ID('dbo.RequestItems', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.RequestItems (
        ItemID INT IDENTITY(1,1) PRIMARY KEY,
        RequestID INT NOT NULL,
        ItemDescription NVARCHAR(255) NOT NULL,
        Quantity INT NOT NULL DEFAULT 1,
        Unit NVARCHAR(50) NULL DEFAULT 'U',
        DeliveredQuantity INT NOT NULL DEFAULT 0,
        Observation NVARCHAR(MAX) NULL,
        ItemStatus NVARCHAR(30) NOT NULL DEFAULT 'En Attente',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_RequestItems_PurchaseRequests FOREIGN KEY (RequestID) REFERENCES dbo.PurchaseRequests(RequestID) ON DELETE CASCADE
      );
    END
  `);

  // Create Attachments table
  await dbPool.request().query(`
    IF OBJECT_ID('dbo.Attachments', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Attachments (
        AttachmentID INT IDENTITY(1,1) PRIMARY KEY,
        RequestID INT NOT NULL,
        AttachmentType NVARCHAR(50) NOT NULL,
        OriginalFileName NVARCHAR(255) NOT NULL,
        StoredFileName NVARCHAR(255) NOT NULL,
        FilePath NVARCHAR(500) NOT NULL,
        MimeType NVARCHAR(100) NOT NULL,
        FileSize BIGINT NOT NULL,
        UploadedByID INT NOT NULL,
        UploadedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_Attachments_PurchaseRequests FOREIGN KEY (RequestID) REFERENCES dbo.PurchaseRequests(RequestID) ON DELETE CASCADE,
        CONSTRAINT FK_Attachments_Users FOREIGN KEY (UploadedByID) REFERENCES dbo.Users(UserID)
      );
    END
  `);

  // Create StatusHistory table
  await dbPool.request().query(`
    IF OBJECT_ID('dbo.StatusHistory', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.StatusHistory (
        HistoryID INT IDENTITY(1,1) PRIMARY KEY,
        RequestID INT NOT NULL,
        PreviousStatus NVARCHAR(30) NULL,
        NewStatus NVARCHAR(30) NOT NULL,
        ChangedByID INT NOT NULL,
        Comments NVARCHAR(MAX) NULL,
        ChangedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_StatusHistory_PurchaseRequests FOREIGN KEY (RequestID) REFERENCES dbo.PurchaseRequests(RequestID) ON DELETE CASCADE,
        CONSTRAINT FK_StatusHistory_Users FOREIGN KEY (ChangedByID) REFERENCES dbo.Users(UserID)
      );
    END
  `);

  console.log('✅ All tables verified/created on remote server.');

  // Seed default users
  console.log('Seeding default system accounts...');
  await dbPool.request().query(`
    IF NOT EXISTS (SELECT * FROM dbo.Users WHERE Username = 'admin')
    BEGIN
        INSERT INTO dbo.Users (FullName, Username, Password, Department, Role, IsActive)
        VALUES (N'Administrateur', N'admin', N'1010', N'Informatique', N'Admin', 1);
    END

    IF NOT EXISTS (SELECT * FROM dbo.Users WHERE Username = 'acheteur1')
    BEGIN
        INSERT INTO dbo.Users (FullName, Username, Password, Department, Role, IsActive)
        VALUES (N'Acheteur SENSUS', N'acheteur1', N'1010', N'Achats', N'Acheteur', 1);
    END

    IF NOT EXISTS (SELECT * FROM dbo.Users WHERE Username = 'demandeur1')
    BEGIN
        INSERT INTO dbo.Users (FullName, Username, Password, Department, Role, IsActive)
        VALUES (N'Demandeur SENSUS', N'demandeur1', N'1010', N'Production', N'Demandeur', 1);
    END
  `);

  console.log('🎉 Remote server database successfully set up and seeded!');

  // Now clone data from local SQL Server to remote server if local DB has records
  try {
    console.log('Checking local SQL Server for data cloning...');
    const localConnStr = `Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=DemandeAchatDB;Trusted_Connection=yes;`;
    const localPool = await new sql.ConnectionPool({ connectionString: localConnStr }).connect();
    
    // Check local users
    const localUsersRes = await localPool.request().query('SELECT * FROM dbo.Users');
    console.log(`Found ${localUsersRes.recordset.length} users on local database.`);

    for (const u of localUsersRes.recordset) {
      const existsRes = await dbPool.request()
        .input('Username', u.Username)
        .query('SELECT UserID FROM dbo.Users WHERE Username = @Username');
      
      if (existsRes.recordset.length === 0) {
        await dbPool.request()
          .input('FullName', u.FullName)
          .input('Username', u.Username)
          .input('Password', u.Password)
          .input('Department', u.Department)
          .input('Role', u.Role)
          .input('IsActive', u.IsActive ? 1 : 0)
          .query(`
            INSERT INTO dbo.Users (FullName, Username, Password, Department, Role, IsActive)
            VALUES (@FullName, @Username, @Password, @Department, @Role, @IsActive)
          `);
        console.log(`  + Cloned user: ${u.Username}`);
      }
    }

    // Check local requests
    const localRequestsRes = await localPool.request().query('SELECT * FROM dbo.PurchaseRequests');
    console.log(`Found ${localRequestsRes.recordset.length} purchase requests on local database.`);

    for (const r of localRequestsRes.recordset) {
      const existsReq = await dbPool.request()
        .input('RequestNumber', r.RequestNumber)
        .query('SELECT RequestID FROM dbo.PurchaseRequests WHERE RequestNumber = @RequestNumber');

      if (existsReq.recordset.length === 0) {
        // Map local RequesterID username to remote RequesterID
        const localReqUserRes = await localPool.request()
          .input('UserID', r.RequesterID)
          .query('SELECT Username FROM dbo.Users WHERE UserID = @UserID');
        
        const username = localReqUserRes.recordset[0]?.Username || 'demandeur1';

        const remoteUserRes = await dbPool.request()
          .input('Username', username)
          .query('SELECT UserID FROM dbo.Users WHERE Username = @Username');
        
        const remoteUserId = remoteUserRes.recordset[0]?.UserID || 1;

        const newReqRes = await dbPool.request()
          .input('RequestNumber', r.RequestNumber)
          .input('Type', r.Type)
          .input('RequestDate', r.RequestDate)
          .input('RequesterID', remoteUserId)
          .input('Department', r.Department)
          .input('Title', r.Title)
          .input('Description', r.Description)
          .input('CurrentStatus', r.CurrentStatus)
          .input('RequiredByDate', r.RequiredByDate)
          .input('HasSignedDoc', r.HasSignedDoc ? 1 : 0)
          .query(`
            INSERT INTO dbo.PurchaseRequests 
            (RequestNumber, Type, RequestDate, RequesterID, Department, Title, Description, CurrentStatus, RequiredByDate, HasSignedDoc)
            OUTPUT INSERTED.RequestID
            VALUES 
            (@RequestNumber, @Type, @RequestDate, @RequesterID, @Department, @Title, @Description, @CurrentStatus, @RequiredByDate, @HasSignedDoc)
          `);

        const newRemoteReqId = newReqRes.recordset[0].RequestID;
        console.log(`  + Cloned request: ${r.RequestNumber} (ID: ${newRemoteReqId})`);

        // Clone request items
        const localItemsRes = await localPool.request()
          .input('RequestID', r.RequestID)
          .query('SELECT * FROM dbo.RequestItems WHERE RequestID = @RequestID');

        for (const item of localItemsRes.recordset) {
          await dbPool.request()
            .input('RequestID', newRemoteReqId)
            .input('ItemDescription', item.ItemDescription)
            .input('Quantity', item.Quantity)
            .input('Observation', item.Observation)
            .input('ItemStatus', item.ItemStatus || 'En Attente')
            .input('DeliveredQuantity', item.DeliveredQuantity || 0)
            .query(`
              INSERT INTO dbo.RequestItems (RequestID, ItemDescription, Quantity, Observation, ItemStatus, DeliveredQuantity)
              VALUES (@RequestID, @ItemDescription, @Quantity, @Observation, @ItemStatus, @DeliveredQuantity)
            `);
        }
      }
    }

    await localPool.close();
    console.log('✅ Local database records cloned successfully to remote server!');
  } catch (cloneErr) {
    console.log('Info: Local database cloning step skipped or completed:', cloneErr.message);
  }

  await dbPool.close();
  console.log('ALL DONE! Server database is live and fully ready.');
}

run().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
