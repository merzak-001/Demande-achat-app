const sql = require('mssql/msnodesqlv8');
const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

async function updateFK(pool, label) {
  console.log(`Updating FK_Users_Manager to ON DELETE SET NULL in [${label}]...`);
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Manager')
    BEGIN
      ALTER TABLE dbo.Users DROP CONSTRAINT FK_Users_Manager;
    END

    ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Manager 
    FOREIGN KEY (ManagerID) REFERENCES dbo.Users(UserID) ON DELETE SET NULL;
  `);
  console.log(`✅ Updated FK_Users_Manager in [${label}].`);
}

async function run() {
  try {
    const remoteConfig = {
      user: SERVER_USER,
      password: SERVER_PASS,
      server: SERVER_IP,
      database: DB_NAME,
      options: { encrypt: false, trustServerCertificate: true },
    };
    const remotePool = await pureSql.connect(remoteConfig);
    await updateFK(remotePool, `REMOTE SERVER: ${SERVER_IP}`);
    await remotePool.close();
  } catch (e) {
    console.error('Remote FK update error:', e.message);
  }

  try {
    const localConfig = {
      server: 'localhost\\SQLEXPRESS',
      database: DB_NAME,
      options: { encrypt: false, trustServerCertificate: true, trustedConnection: true },
    };
    const localPool = await pureSql.connect(localConfig);
    await updateFK(localPool, 'LOCAL SERVER');
    await localPool.close();
  } catch (e) {
    console.log('Local FK update info:', e.message);
  }
}

run();
