const { getPool } = require('./backend/config/db');

async function inspectConstraints() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT cc.name, cc.definition 
      FROM sys.check_constraints cc
      JOIN sys.tables t ON cc.parent_object_id = t.object_id
      WHERE t.name = 'PurchaseRequests'
    `);
    console.log('CHECK CONSTRAINTS ON PurchaseRequests:', res.recordset);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

inspectConstraints();
