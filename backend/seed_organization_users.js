const sql = require('mssql/msnodesqlv8');
const pureSql = require('mssql');

const SERVER_IP = '192.168.1.253';
const SERVER_USER = 'sa';
const SERVER_PASS = '0000';
const DB_NAME = 'DemandeAchatDB';

const DEPARTMENTS = [
  'Production',
  'Appro',
  'Atelier Injection & Montage',
  'Atelier Étalonnage',
  'Technique',
  'Maintenance',
  'Informatique',
  'RH',
  'Finance',
  'Commercial',
  'Direction Générale'
];

// List of all employees with their department and role
const USERS_LIST = [
  // Production
  { lastName: 'Ferdjallah', firstName: 'Salem', dept: 'Production', role: 'Demandeur' },

  // Appro (Service Achats - Role: Acheteur)
  { lastName: 'Brahimi', firstName: 'Mohamed', dept: 'Appro', role: 'Acheteur' },
  { lastName: 'Hadjadj', firstName: 'Abdelouahab', dept: 'Appro', role: 'Acheteur' },
  { lastName: 'Sersoub', firstName: 'Omar', dept: 'Appro', role: 'Acheteur' },
  { lastName: 'Sai', firstName: 'Merzak', dept: 'Appro', role: 'Acheteur' },

  // Atelier Injection & Montage
  { lastName: 'Ferdjallah', firstName: 'Haroune', dept: 'Atelier Injection & Montage', role: 'Demandeur' },
  { lastName: 'Kraouchi', firstName: 'Riadh', dept: 'Atelier Injection & Montage', role: 'Demandeur' },

  // Atelier Étalonnage
  { lastName: 'Amrrane', firstName: 'Hichem', dept: 'Atelier Étalonnage', role: 'Demandeur' },

  // Technique
  { lastName: 'Snoussi', firstName: 'Nabil', dept: 'Technique', role: 'Demandeur' },
  { lastName: 'Boudoukha', firstName: 'Noura', dept: 'Technique', role: 'Demandeur' },

  // Maintenance
  { lastName: 'Benloucif', firstName: 'Salim', dept: 'Maintenance', role: 'Demandeur' },
  { lastName: 'Mennour', firstName: 'Mourad', dept: 'Maintenance', role: 'Demandeur' },
  { lastName: 'Attout', firstName: 'Eloualid', dept: 'Maintenance', role: 'Demandeur' },
  { lastName: 'Amor', firstName: 'Abdelkrim', dept: 'Maintenance', role: 'Demandeur' },
  { lastName: 'Mohamed', firstName: 'Khloufi', dept: 'Maintenance', role: 'Demandeur' },
  { lastName: 'Abdeldjabar', firstName: 'Benghellab', dept: 'Maintenance', role: 'Demandeur' },
  { lastName: 'Youcef', firstName: 'Lemnaour', dept: 'Maintenance', role: 'Demandeur' },

  // Informatique
  { lastName: 'Mansour', firstName: 'Zerrari', dept: 'Informatique', role: 'Demandeur' },
  { lastName: 'Haddad', firstName: 'Abderrezak', dept: 'Informatique', role: 'Demandeur' },

  // RH
  { lastName: 'Kebbab', firstName: 'Bilal', dept: 'RH', role: 'Demandeur' },
  { lastName: 'Boumala', firstName: 'Hadjer', dept: 'RH', role: 'Demandeur' },
  { lastName: 'Elbar', firstName: 'Leulmi', dept: 'RH', role: 'Demandeur' },

  // Finance
  { lastName: 'Bouregaa', firstName: 'Billal', dept: 'Finance', role: 'Demandeur' },
  { lastName: 'Kaddour', firstName: 'Khaled', dept: 'Finance', role: 'Demandeur' },
  { lastName: 'Chnnouf', firstName: 'Abderrezak', dept: 'Finance', role: 'Demandeur' },

  // Commercial
  { lastName: 'Abderrezek', firstName: 'Abdessatar', dept: 'Commercial', role: 'Demandeur' },
  { lastName: 'Rouabhi', firstName: 'Abderraouf', dept: 'Commercial', role: 'Demandeur' },
  { lastName: 'Achouri', firstName: 'Kaoutar', dept: 'Commercial', role: 'Demandeur' },

  // Direction Générale
  { lastName: 'Lamara', firstName: 'Ishak', dept: 'Direction Générale', role: 'Demandeur' },
  { lastName: 'Hameche', firstName: 'Hanane', dept: 'Direction Générale', role: 'Demandeur' }
];

function sanitizeUsername(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.');
}

async function seedDatabase(pool, dbLabel) {
  console.log(`\n⏳ Seeding Departments and Users in [${dbLabel}]...`);

  // 1. Seed Departments
  for (const deptName of DEPARTMENTS) {
    await pool.request()
      .input('DepartmentName', sql.NVarChar(100), deptName)
      .query(`
        IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = @DepartmentName)
        BEGIN
          INSERT INTO dbo.Departments (DepartmentName) VALUES (@DepartmentName);
        END
      `);
  }
  console.log(`✅ Departments verified/seeded in [${dbLabel}].`);

  // 2. Seed Users
  let addedCount = 0;
  let updatedCount = 0;

  for (const u of USERS_LIST) {
    const fullName = `${u.firstName} ${u.lastName}`;
    const username = `${sanitizeUsername(u.firstName)}.${sanitizeUsername(u.lastName)}`;

    // Check if user exists by Username or FullName
    const checkRes = await pool.request()
      .input('Username', sql.NVarChar(50), username)
      .input('FullName', sql.NVarChar(100), fullName)
      .query(`
        SELECT UserID, Role, Department FROM dbo.Users 
        WHERE Username = @Username OR FullName = @FullName
      `);

    if (checkRes.recordset.length === 0) {
      await pool.request()
        .input('FullName',   sql.NVarChar(100), fullName)
        .input('Username',   sql.NVarChar(50),  username)
        .input('Password',   sql.NVarChar(100), '1010')
        .input('Department', sql.NVarChar(100), u.dept)
        .input('Role',       sql.NVarChar(50),  u.role)
        .query(`
          INSERT INTO dbo.Users (FullName, Username, Password, Department, Role, IsActive)
          VALUES (@FullName, @Username, @Password, @Department, @Role, 1)
        `);
      addedCount++;
    } else {
      // Update department and role if already existing
      await pool.request()
        .input('UserID',     sql.Int,           checkRes.recordset[0].UserID)
        .input('Department', sql.NVarChar(100), u.dept)
        .input('Role',       sql.NVarChar(50),  u.role)
        .query(`
          UPDATE dbo.Users 
          SET Department = @Department, Role = @Role 
          WHERE UserID = @UserID
        `);
      updatedCount++;
    }
  }

  console.log(`✅ Users Processed in [${dbLabel}]: ${addedCount} Created, ${updatedCount} Updated.`);
}

async function run() {
  console.log('🚀 Starting Full Organizational Chart Seeding...');

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
    await seedDatabase(remotePool, `REMOTE SERVER: ${SERVER_IP}`);
    await remotePool.close();
  } catch (err) {
    console.error('⚠️ Remote database seeding failed:', err.message);
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
    await seedDatabase(localPool, 'LOCAL SERVER');
    await localPool.close();
  } catch (err) {
    console.log('Info for local DB:', err.message);
  }

  console.log('\n🎉 ALL USERS AND DEPARTMENTS SEEDED SUCCESSFULLY!');
}

run();
