const sql = require('mssql');

const remoteCfg = {
  server: '192.168.1.253',
  database: 'DemandeAchatDB',
  user: 'sa',
  password: '0000',
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 15000
};

const localCfg = {
  server: 'localhost',
  database: 'DemandeAchatDB',
  user: 'sa',
  password: '0000',
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 10000
};

async function checkTable(pool, label, table) {
  try {
    const r = await pool.request().query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${table}' ORDER BY ORDINAL_POSITION`
    );
    console.log(`[${label}] ${table} columns:`, r.recordset.map(x => x.COLUMN_NAME).join(', '));
  } catch(e) {
    console.error(`[${label}] ${table} error:`, e.message);
  }
}

async function main() {
  // Check remote
  try {
    const remote = await sql.connect(remoteCfg);
    console.log('=== REMOTE (192.168.1.253) ===');
    await checkTable(remote, 'REMOTE', 'Users');
    await checkTable(remote, 'REMOTE', 'Departments');
    await checkTable(remote, 'REMOTE', 'PurchaseRequests');
    await checkTable(remote, 'REMOTE', 'SystemSettings');
    await remote.close();
  } catch(e) {
    console.error('REMOTE connection failed:', e.message);
  }

  // Check local
  try {
    const local = await sql.connect(localCfg);
    console.log('\n=== LOCAL (localhost) ===');
    await checkTable(local, 'LOCAL', 'Users');
    await checkTable(local, 'LOCAL', 'Departments');
    await checkTable(local, 'LOCAL', 'PurchaseRequests');
    await checkTable(local, 'LOCAL', 'SystemSettings');
    await local.close();
  } catch(e) {
    console.error('LOCAL connection failed:', e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
